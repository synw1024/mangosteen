import ot from 'ot'
import { useEffect, useState } from 'react'

function Client() {
  const [val, setVal] = useState('')

  const onChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setVal(e.target.value)
  }

  function init() {
    new ot.TextOperation()
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <div>
      <textarea cols={30} rows={10} value={val} onChange={onChange} />
      <button>submit</button>
    </div>
  );
}

export default Client