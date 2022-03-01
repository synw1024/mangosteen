import { useState } from 'react'
import styles from './index.module.css'
import Delta from 'quill-delta'
import Quill from 'quill'
import { useRef, useEffect } from 'react'
import server, { TBroadcast } from './Server'
import Client, { ISyn } from '../Client/Client'

interface IProps {
  client1: Client | null
  client2: Client | null
}

function ServerEditor(props: IProps) {
  const [deltaList, setDeltaList] = useState<Delta[]>([])
  const divRef = useRef<HTMLDivElement>(null)
  const [quill, setQuill] = useState<Quill>()

  function init() {
    const quill = new Quill(divRef.current!, {
      theme: 'snow',
      readOnly: true,
      modules: {
        toolbar: false
      }
    })
    server.on({
      clientId: 'server',
      fn: onReceived.bind(null, quill)
    })
    setQuill(quill)
  }

  function onReceived(quill: Quill, deltal: Delta) {
    quill.updateContents(deltal)
  }

  function onReceivedClient1() {
    debugger
    if (!props.client1 || !props.client1.synList.length) return

    const { clientId, revision, delta } = props.client1.synList.shift() as ISyn
    server.received(clientId, revision, delta)
    props.client1.responseList.push(undefined)
  }

  function onReceivedClient2() {
    debugger
    if (!props.client2 || !props.client2.synList.length) return

    const { clientId, revision, delta } = props.client2.synList.shift() as ISyn
    server.received(clientId, revision, delta)
    props.client2.responseList.push(undefined)
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <div className={styles.server}>
      Server:
      <div ref={divRef} />
      <div className={styles.footer}>
        <button onClick={onReceivedClient1}>receives from client1</button>
        <button onClick={onReceivedClient2}>receives from client2</button>
      </div>
    </div>
  )
}

export default ServerEditor