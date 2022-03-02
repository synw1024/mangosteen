import Delta from 'quill-delta'
import Quill from 'quill';
import { io, Socket } from "socket.io-client";

type ClientState = Synchronized | AwaitingConfirm | AwaitingWithBuffer

class Client {
  revision: number
  state: ClientState
  editor?: Quill
  socket?: Socket
  constructor(revision: number) {
    this.revision = revision
    this.state = new Synchronized()
  }

  connect() {
    const url = `${window.location.origin}/lemon`
    console.log('try to connect: ' + url)
    const socket = io(url)
    socket.on('connect', this.onConnect.bind(this));
    socket.on('serverAck', this.serverAck.bind(this));
    socket.on('serverPush', this.applyServer.bind(this));
    socket.on('exception', this.onException.bind(this));
    socket.on('disconnect', this.onDisconnect.bind(this));
    this.socket = socket
  }

  onConnect() {
    if (!this.socket) return

    console.log('connected')
  }

  onException(data: any) {
    console.log('exception:', data);
  }

  onDisconnect() {
    console.log('Disconnected');
  }

  setEditor(editor: Quill) {
    this.editor = editor
  }

  setState(state: ClientState) {
    this.state = state
  }

  applyClient(delta: Delta) {
    this.setState(this.state.applyClient(this, delta))
  }

  applyServer(delta: Delta) {
    delta = new Delta(delta)
    this.revision++
    this.setState(this.state.applyServer(this, delta))
  }

  serverAck() {
    this.revision++
    this.setState(this.state.serverAck(this))
  }

  sendOperation(revision: number, delta: Delta) {
    if (!this.socket) this.connect()

    this.socket!.emit('clientSend', [revision, delta])
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