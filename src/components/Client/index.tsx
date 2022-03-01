import { useLayoutEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import Quill, { Sources } from 'quill'
import Delta from 'quill-delta'
import styles from './index.module.css'
import Client from './Client'

interface IProps {
  name: string
  client: Client
}

function ClientEditor({name, client}: IProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [waitingForReceiveNum, setWaitingForReceiveNum] = useState(0)

  function onTextChange(delta: Delta, oldDelta: Delta, source: Sources) {
    if (source !== 'user') return

    client.applyClient(delta)
  }

  function init() {
    const quill = new Quill(divRef.current!, {
      theme: 'snow',
      modules: {
        toolbar: false
      }
    })
    client.setResponseNumDispatch(setWaitingForReceiveNum)
    client.setEditor(quill)
    quill.on('text-change', onTextChange);
  }

  function onReceived() {
    if (!client.responseList.length) return
    const res = client.responseList.shift()
    client.responseNumDispatch && client.responseNumDispatch(client.responseList.length)
    if (res) {
      client.applyServer(res)
    } else {
      client.serverAck()
    }
  }

  useLayoutEffect(() => {
    init()
  }, [])

  return (
    <div className={styles.client}>
      {name}:
      <div ref={divRef} />
      <button onClick={onReceived}>receives from server ({waitingForReceiveNum} responses doesn't receive)</button>
    </div>
  );
}

export default ClientEditor