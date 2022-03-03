import Delta from 'quill-delta'
import Quill from 'quill';
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from 'uuid'; 

type ClientState = Synchronized | AwaitingConfirm | AwaitingWithBuffer
interface MyDelta {
  id: string
  delta: Delta
}

class Client {
  revision: number
  state: ClientState
  editor?: Quill
  socket?: Socket
  id: string
  constructor(revision: number) {
    this.revision = revision
    this.state = new Synchronized()
    this.id = uuidv4()
  }

  connect() {
    const socket = process.env.NODE_ENV === 'development' ? io('192.168.0.100:3000') : io()
    socket.on('connect', this.onConnect.bind(this));
    socket.on('serverAck', this.serverAck.bind(this));
    socket.on('serverPush', this.applyServer.bind(this));
    socket.on('clientConnented', this.clientConnented.bind(this))
    socket.on('exception', this.onException.bind(this));
    socket.on('disconnect', this.onDisconnect.bind(this));
    this.socket = socket
  }

  onConnect() {
    console.log('connected')
  }

  onException(data: any) {
    console.log('exception:', data);
  }

  onDisconnect() {
    console.log('Disconnected');
  }

  syncOfflineServerDeltas(deltaList: MyDelta[]) {
    const list = deltaList.slice(this.revision)
    let delta = new Delta(list[0].delta)
    for (let i = 1; i < list.length; i++) {
      delta = delta.compose(new Delta(list[i].delta))
    }
    if (this.state instanceof Synchronized) return
    delta = this.state.outstanding.delta.transform(delta)
    if (this.state instanceof AwaitingConfirm) {
      this.applyOperation({
        id: uuidv4(),
        delta
      })
      return
    }
    delta = this.state.buffer.delta.transform(delta)
    // this.revision += list.length
    this.applyOperation({
      id: uuidv4(),
      delta
    })
  }

  clientConnented(deltaList: MyDelta[]) {
    if (this.revision) {
      this.syncOfflineServerDeltas(deltaList)
      this.serverReconnect()
    } else {
      this.revision = deltaList.length
      deltaList.forEach(d => {
        const delta = new Delta(d.delta)
        this.applyOperation({
          id: uuidv4(),
          delta
        })
      })
    }
  }

  setEditor(editor: Quill) {
    this.editor = editor
  }

  setState(state: ClientState) {
    this.state = state
  }

  applyClient(delta: MyDelta) {
    this.setState(this.state.applyClient(this, delta))
  }

  applyServer([delta, clientId]: [MyDelta, string]) {
    if (this.id === clientId) return

    delta = {
      id: delta.id,
      delta: new Delta(delta.delta)
    }
    this.revision++
    this.setState(this.state.applyServer(this, delta))
  }

  serverAck() {
    this.revision++
    this.setState(this.state.serverAck(this))
  }

  sendOperation(revision: number, delta: MyDelta) {
    console.log(revision, delta)
    this.socket!.emit('clientSend', [this.id, revision, delta])
  }

  applyOperation(delta: MyDelta) {
    if (!this.editor) return
    this.editor.updateContents(delta.delta)
  }

  serverReconnect() {
    this.state.resend(this)
  };
}

class Synchronized {
  applyClient(client: Client, delta: MyDelta) {
    client.sendOperation(client.revision, delta)
    return new AwaitingConfirm(delta)
  }

  applyServer(client: Client, delta: MyDelta) {
    client.applyOperation(delta);
    return this;
  };

  serverAck(client: Client): ClientState {
    return new Synchronized()
  };

  resend() {}
}

class AwaitingConfirm {
  outstanding: MyDelta
  constructor(outstanding: MyDelta) {
    this.outstanding = outstanding
  }

  applyClient(client: Client, delta: MyDelta) {
    return new AwaitingWithBuffer(this.outstanding, delta)
  }

  applyServer(client: Client, delta: MyDelta) {
    const prime2 = this.outstanding.delta.transform(delta.delta)
    const prime1 = delta.delta.transform(this.outstanding.delta, true)
    client.applyOperation({
      id: uuidv4(),
      delta: prime2
    })
    return new AwaitingConfirm({
      id: uuidv4(),
      delta: prime1
    })
  };

  serverAck(client: Client) {
    return new Synchronized()
  };

  resend(client: Client) {
    client.sendOperation(client.revision, this.outstanding);
  };
}

class AwaitingWithBuffer {
  outstanding: MyDelta
  buffer: MyDelta
  constructor(outstanding: MyDelta, buffer: MyDelta) {
    this.outstanding = outstanding;
    this.buffer = buffer;
  }

  applyClient(client: Client, delta: MyDelta) {
    const newBuffer = this.buffer.delta.compose(delta.delta);
    return new AwaitingWithBuffer(this.outstanding, {
      id: uuidv4(),
      delta: newBuffer
    });
  }

  applyServer(client: Client, delta: MyDelta) {
    const prime2 = this.outstanding.delta.transform(delta.delta)
    const prime1 = delta.delta.transform(this.outstanding.delta, true)

    const prime4 = this.buffer.delta.transform(prime2)
    const prime3 = prime2.transform(this.buffer.delta, true)

    client.applyOperation({
      id: uuidv4(),
      delta: prime4
    });
    return new AwaitingWithBuffer({id: uuidv4(), delta: prime1}, {id: uuidv4(), delta: prime3});
  };

  serverAck(client: Client) {
    client.sendOperation(client.revision, this.buffer);
    return new AwaitingConfirm(this.buffer);
  };

  resend(client: Client) {
    client.sendOperation(client.revision, this.outstanding);
  };
}

export default Client