import ClientEditor from './components/Client'
import Client from './components/Client/Client'

const client = new Client(0)

function App() {
  return (
    <ClientEditor name="client" client={client} />
  )
}

export default App;
