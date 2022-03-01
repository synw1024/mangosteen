import ClientEditor from './components/Client'
import Server from './components/Server'
import Client from './components/Client/Client'

const client1 = new Client(0)
const client2 = new Client(0)

function App() {
  return (
    <>
      <Server client1={client1} client2={client2} />
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <ClientEditor name="client1" client={client1} />
        <ClientEditor name="client2" client={client2} />
      </div>
    </>
  )
}

export default App;
