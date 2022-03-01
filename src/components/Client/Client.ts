import Delta from 'quill-delta'
import server from '../Server/Server'
import { v4 as uuidv4 } from 'uuid';

type ClientState = Synchronized | AwaitingConfirm | AwaitingWithBuffer

export interface ISyn {
  clientId: string
  revision: number
  delta: Delta
}

class Client {
  id: string
  revision: number
  state: ClientState
  synList: ISyn[]
  responseList: (Delta | undefined)[]
  constructor(revision: number) {
    this.id = uuidv4()
    this.revision = revision
    this.state = new Synchronized()
    this.synList = []
    this.responseList = []
    server.on({
      clientId: this.id,
      fn: this.applyServer.bind(this)
    })
  }

  setState(state: ClientState) {
    this.state = state
  }

  applyClient(delta: Delta) {
    this.setState(this.state.applyClient(this, delta))
  }

  applyServer(delta: Delta) {
    this.revision++
    this.setState(this.state.applyServer(this, delta))
  }

  serverAck() {
    this.revision++
    this.setState(this.state.serverAck(this))
  }

  sendOperation(revision: number, delta: Delta) {
    this.synList.push({
      clientId: this.id,
      revision,
      delta
    })
  }

  applyOperation(delta: Delta) {

  }
}

class Synchronized {
  applyClient(client: Client, delta: Delta) {
    client.sendOperation(client.revision, delta)
    return new AwaitingConfirm(delta)
  }

  applyServer(client: Client, delta: Delta) {
    client.applyOperation(delta);
    return this;
  };

  serverAck(client: Client): ClientState {
    throw new Error("There is no pending operation.");
  };
}

class AwaitingConfirm {
  outstanding: Delta
  constructor(outstanding: Delta) {
    this.outstanding = outstanding
  }

  applyClient(client: Client, delta: Delta) {
    return new AwaitingWithBuffer(this.outstanding, delta)
  }

  applyServer(client: Client, delta: Delta) {
    const prime1 = this.outstanding.transform(delta, true)
    const prime2 = delta.transform(this.outstanding, true)
    client.applyOperation(prime2)
    return new AwaitingConfirm(prime1)
  };

  serverAck(client: Client) {
    return new Synchronized()
  };
}

class AwaitingWithBuffer {
  outstanding: Delta
  buffer: Delta
  constructor(outstanding: Delta, buffer: Delta) {
    this.outstanding = outstanding;
    this.buffer = buffer;
  }

  applyClient(client: Client, delta: Delta) {
    const newBuffer = this.buffer.compose(delta);
    return new AwaitingWithBuffer(this.outstanding, newBuffer);
  }

  applyServer(client: Client, delta: Delta) {
    const prime1 = this.outstanding.transform(delta, true)
    const prime2 = delta.transform(this.outstanding, true)

    const prime3 = this.buffer.transform(prime2, true)
    const prime4 = prime2.transform(this.buffer, true)

    client.applyOperation(prime4);
    return new AwaitingWithBuffer(prime1, prime3);
  };

  serverAck(client: Client) {
    client.sendOperation(client.revision, this.buffer);
    return new AwaitingConfirm(this.buffer);
  };
}

export default Client