import { useLayoutEffect, useRef } from 'react'
import Quill, { Sources } from 'quill'
import Delta from 'quill-delta'
import styles from './index.module.css'
import Client from './client'
import {v4 as uuidv4} from 'uuid'

interface IProps {
  client: Client
}

let compositing = false
let compositingDelta: Delta | undefined

function Editor({ client }: IProps) {
  const divRef = useRef<HTMLDivElement>(null)

  function onTextChange(delta: Delta, oldDelta: Delta, source: Sources) {
    if (source !== 'user') return

    if (compositing) {
      if (!compositingDelta) {
        compositingDelta = delta
      } else {
        compositingDelta = compositingDelta.compose(delta)
      }
      return
    }

    client.applyClient({
      id: uuidv4(),
      delta
    })
  }

  function compositionEvent(quill: Quill) {
    quill.root.addEventListener('compositionstart', e => {
      compositing = true
    })
    quill.root.addEventListener('compositionend', e => {
      if (!compositingDelta) {
        throw new Error('compositingDelta is undefined')
      }
      client.applyClient({
        id: uuidv4(),
        delta: compositingDelta
      })
      compositingDelta = undefined
      compositing = false
    })
  }

  function init() {
    const quill = new Quill(divRef.current!, {
      theme: 'snow',
    })
    compositionEvent(quill)
    quill.on('text-change', onTextChange);
    client.setEditor(quill)
    client.connect()
  }

  useLayoutEffect(() => {
    init()
  }, [])

  return (
    <div ref={divRef} className={styles.client} />
  );
}

export default Editor