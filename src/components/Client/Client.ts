import Delta from 'quill-delta'
import server from '../Server/Server'
import { v4 as uuidv4 } from 'uuid';
import Quill from 'quill';

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
  requestList: ISyn[]
  responseList: (Delta | undefined)[]
  editor?: Quill
  responseNumDispatch?: React.Dispatch<React.SetStateAction<number>>
  requestNumDispatch?: React.Dispatch<React.SetStateAction<number>>
  constructor(revision: number) {
    this.id = uuidv4()
    this.revision = revision
    this.state = new Synchronized()
    this.requestList = []
    this.responseList = []
    server.on({
      clientId: this.id,
      fn: this.onServerReceived.bind(this)
    })
  }

  setRequestNumDispatch(dispatch: React.Dispatch<React.SetStateAction<number>>) {
    this.requestNumDispatch = dispatch
  }

  setResponseNumDispatch(dispatch: React.Dispatch<React.SetStateAction<number>>) {
    this.responseNumDispatch = dispatch
  }

  setEditor(editor: Quill) {
    this.editor = editor
  }

  onServerReceived(delta: Delta) {
    this.responseList.push(delta)
    this.responseNumDispatch && this.responseNumDispatch(this.responseList.length)
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
    this.requestList.push({
      clientId: this.id,
      revision,
      delta
    })
    this.requestNumDispatch && this.requestNumDispatch(this.requestList.length)
  }

  applyOperation(delta: Delta) {
    if (!this.editor) return
    this.editor.updateContents(delta)
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
    const prime2 = this.outstanding.transform(delta)
    const prime1 = delta.transform(this.outstanding, true)
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
    const prime2 = this.outstanding.transform(delta)
    const prime1 = delta.transform(this.outstanding, true)

    const prime4 = this.buffer.transform(prime2)
    const prime3 = prime2.transform(this.buffer, true)

    client.applyOperation(prime4);
    return new AwaitingWithBuffer(prime1, prime3);
  };

  serverAck(client: Client) {
    client.sendOperation(client.revision, this.buffer);
    return new AwaitingConfirm(this.buffer);
  };
}

export default Client