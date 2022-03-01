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
  const [quill, setQuill] = useState<Quill>()

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
    quill.on('text-change', onTextChange);
    setQuill(quill)
  }

  function onReceived() {
    if (!client.responseList.length) return
    const res = client.responseList.shift()
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
      <button onClick={onReceived}>receives from server</button>
    </div>
  );
}

export default ClientEditor