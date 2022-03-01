import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import Quill from 'quill'
import Delta from 'quill-delta'
import styles from './index.module.css'

interface IProps {
  onChange: (delta: Delta) => void
}

export interface IExposed {
  onReceived: (delta: Delta) => void
}

const Client: React.ForwardRefRenderFunction<{}, IProps> = (props, ref) => {
  const divRef = useRef<HTMLDivElement>(null)
  const [quill, setQuill] = useState<Quill>()

  useImperativeHandle<{}, IExposed>(ref, () => ({
    onReceived
  }))

  function init() {
    const quill = new Quill(divRef.current!, {
      theme: 'snow',
    })
    quill.on('text-change', function (delta, oldDelta, source) {
      if (source !== 'user') return
      props.onChange(delta)
    });
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
    <div className={styles.client}>
      <div ref={divRef} />
      <button onClick={onSubmit}>submit</button>
    </div>
  );
}

export default forwardRef(Client)