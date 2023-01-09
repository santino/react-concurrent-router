import { useContext, useEffect, useState } from 'react'
import RouterContext from './RouterContext'

/*
 * We rely on useState to force a re-render on the consuming component when state values are updated.
 * This ensures consumers always have fresh data from context, even when we're not re-rendering the entire Route tree (e.g. `skipRender`)
 */
const useHistory = () => {
  const {
    history: { length, location, action, index, entries },
    subscribe
  } = useContext(RouterContext)
  // following state is to just force re-rendering when a new entry is received from subscriber
  const [lastUpdate, setLastUpdate] = useState(new Date().getTime())

  useEffect(() => {
    const dispose = subscribe(async () => {
      // Timeout is required to avoid concurrent rendering of multiple components that might be using the hook, which would result in a React error.
      setTimeout(() => setLastUpdate(new Date().getTime()), 1)
    })
    return () => dispose() // cleanup/unsubscribe function
  }, [])

  return {
    length, // number of entries in the history stack
    location, // current location; includes pathname, search and hash, as well as potetially state and key
    action, // current (most recent) action that modified the history stack
    index, // only provided by MemoryHistory; current index in the history stack
    entries // only provided by MemoryHistory; all entries available in history instance
  }
}

export default useHistory
