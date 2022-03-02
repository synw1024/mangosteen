import { useLayoutEffect, useRef } from 'react'
import Quill, { Sources } from 'quill'
import Delta from 'quill-delta'
import styles from './index.module.css'
import Client from './client'

interface IProps {
  client: Client
}

function Editor({ client }: IProps) {
  const divRef = useRef<HTMLDivElement>(null)

  function onTextChange(delta: Delta, oldDelta: Delta, source: Sources) {
    if (source !== 'user') return

    client.applyClient(delta)
  }

  function init() {
    const quill = new Quill(divRef.current!, {
      theme: 'snow',
    })
    quill.on('text-change', onTextChange);
    client.setEditor(quill)
    client.connect()
  }

  useLayoutEffect(() => {
    init()
  }, [])

  return (
    <>
      <button className={styles.resetBtn}>
        reset server state (there is some bug now, if the document unsynchronized, click it to reset server state, and refresh browser)
      </button>
      <div ref={divRef} className={styles.client} />
    </>

  );
}

export default Editor