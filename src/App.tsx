import { useRef } from 'react';
import Client, { IExposed } from './components/Client'
import Server from './components/Server'
import Delta from 'quill-delta'

function App() {
  const client1Ref = useRef<IExposed>(null)
  const client2Ref = useRef<IExposed>(null)

  function onClient1Change(delta: Delta) {
    client2Ref.current!.onReceived(delta)
  }

  function onClient2Change(delta: Delta) {
    client1Ref.current!.onReceived(delta)
  }

  return (
    <>
      <Server />
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <Client onChange={onClient1Change} ref={client1Ref} />
        <Client onChange={onClient2Change} ref={client2Ref} />
      </div>
    </>
  )
}

export default App;
