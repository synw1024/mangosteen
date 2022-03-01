import Delta from 'quill-delta'

export interface TBroadcast {
  clientId: string
  fn: (d: Delta) => void
}

class Server {
  deltaList: Delta[]
  broadcasts: TBroadcast[]
  constructor(deltaList: Delta[] = []) {
    this.deltaList = deltaList
    this.broadcasts = []
  }

  on(broadcast: TBroadcast) {
    this.broadcasts.push(broadcast)
  }

  received(clientId: string, revision: number, delta: Delta) {
    if (revision < 0 || this.deltaList.length < revision) {
      throw new Error("operation revision not in history");
    }
    
    const concurrentDeltaList = this.deltaList.slice(revision);
    let response = concurrentDeltaList[0] as (Delta | undefined)
    for (var i = 0; i < concurrentDeltaList.length; i++) {
      delta = concurrentDeltaList[i].transform(delta, true)
      if (i + 1 < concurrentDeltaList.length) {
        response = concurrentDeltaList[i].compose(concurrentDeltaList[i+1])
      }
    }
    this.deltaList.push(delta)

    this.broadcasts.forEach(b => {
      if (b.clientId === clientId) return
      b.fn(delta)
    })
  };
}

export default new Server()