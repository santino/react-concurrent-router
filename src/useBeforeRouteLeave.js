import { useCallback, useContext, useEffect } from 'react'
import RouterContext from './RouterContext'

/**
 * A React Hook that makes it easy to prevent users to accidentally leave the page they are in.
 * Useful f.i. in cases where navigation would cause loss of non-submitted data entered on a page.
 */
const useBeforeRouteLeave = ({
  // 'toggle' is the only prop expected to change its value, we use it to register and cleanup listeners
  toggle = true,
  unload = true,
  message = ''
}) => {
  const {
    history: { block }
  } = useContext(RouterContext)
  let unblock

  const handleBeforeunload = useCallback(event => {
    event.preventDefault() // cancel the event as stated by the standard
    event.returnValue = '' // chrome requires returnValue to be set
  }, [])

  const register = useCallback(() => {
    unblock = block(message) // register history block listener and store his output (listener remover)
    if (unload) {
      window.addEventListener('beforeunload', handleBeforeunload)
    }
  }, [block])

  const cleanup = useCallback(() => {
    unblock()
    if (unload) {
      window.removeEventListener('beforeunload', handleBeforeunload)
    }
  }, [unblock])

  useEffect(() => {
    if (toggle) register()

    return () => {
      if (toggle) cleanup()
    }
  }, [toggle, register, cleanup])
}

export default useBeforeRouteLeave
