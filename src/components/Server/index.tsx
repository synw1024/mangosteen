import { useState } from 'react'
import styles from './index.module.css'
import Delta from 'quill-delta'
import Quill from 'quill'
import {useRef, useEffect} from 'react'

function Server() {
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
    setQuill(quill)
  }

  function onReceived(delta: Delta) {
    debugger
    quill!.updateContents(delta)
  }

  function onSubmit() {
    
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <div className={styles.server}>
      Server:
      <div ref={divRef} />
    </div>
  )
}

export default Server