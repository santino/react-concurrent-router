import { useContext } from 'react'
import RouterContext from './RouterContext'

const useHistory = () => {
  const {
    history: { length, location, action, index, entries }
  } = useContext(RouterContext)

  return {
    length, // number of entries in the history stack
    location, // current location; includes pathname, search and hash, as well as potetially state and key
    action, // current (most recent) action that modified the history stack
    index, // only provided by MemoryHistory; current index in the history stack
    entries // only provided by MemoryHistory; all entries available in history instance
  }
}

export default useHistory
