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

function ServerEditor({client1, client2}: IProps) {
  const [deltaList, setDeltaList] = useState<Delta[]>([])
  const divRef = useRef<HTMLDivElement>(null)
  const [quill, setQuill] = useState<Quill>()
  const [client1WaitingForReceiveNum, setClient1WaitingForReceiveNum] = useState(0)
  const [client2WaitingForReceiveNum, setClient2WaitingForReceiveNum] = useState(0)

  function init() {
    const quill = new Quill(divRef.current!, {
      theme: 'snow',
      readOnly: true,
      modules: {
        toolbar: false
      }
    })
    client1 && client1.setRequestNumDispatch(setClient1WaitingForReceiveNum)
    client2 && client2.setRequestNumDispatch(setClient2WaitingForReceiveNum)
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
    if (!client1 || !client1.requestList.length) return

    const { clientId, revision, delta } = client1.requestList.shift() as ISyn
    client1.requestNumDispatch && client1.requestNumDispatch(client1.requestList.length)
    server.received(clientId, revision, delta)
    client1.responseList.push(undefined)
    client1.responseNumDispatch && client1.responseNumDispatch(client1.responseList.length)
  }

  function onReceivedClient2() {
    if (!client2 || !client2.requestList.length) return

    const { clientId, revision, delta } = client2.requestList.shift() as ISyn
    client2.requestNumDispatch && client2.requestNumDispatch(client2.requestList.length)
    server.received(clientId, revision, delta)
    client2.responseList.push(undefined)
    client2.responseNumDispatch && client2.responseNumDispatch(client2.responseList.length)
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <div className={styles.server}>
      Server:
      <div ref={divRef} />
      <div className={styles.footer}>
        <button onClick={onReceivedClient1}>receives from client1 ({client1WaitingForReceiveNum} requestes doesn't receive)</button>
        <button onClick={onReceivedClient2}>receives from client2 ({client2WaitingForReceiveNum} requestes doesn't receive)</button>
      </div>
    </div>
  )
}

export default ServerEditor