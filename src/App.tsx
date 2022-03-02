import Editor from './components/Editor'
import Client from './components/Editor/client'


const client = new Client(0)

function App() {
  return (
    <Editor client={client} />
  )
}

export default App;
