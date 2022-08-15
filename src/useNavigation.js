import { useContext } from 'react'
import RouterContext from './RouterContext'

const useNavigation = () => {
  const {
    history: { push, replace, go, back, forward }
  } = useContext(RouterContext)

  return {
    push, // pushes a new entry onto the history stack
    replace, // replaces the current entry on the history stack
    go, // navigates backward/forward by `n` entries in the stack, identified by relative position to the current page (always 0)
    goBack: back, // move backward by one entry through history stack
    goForward: forward // move forward by one entry through history stack
  }
}

export default useNavigation
