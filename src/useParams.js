import { useContext, useEffect, useState } from 'react'
import RouterContext from './RouterContext'

const useParams = () => {
  const { get, subscribe } = useContext(RouterContext)
  const [params, setParams] = useState(get().params)

  useEffect(() => {
    const dispose = subscribe(async nextEntry => {
      // If updating params with a value equal to the current state, React will bail out without rendering the children or firing effects.
      // Timeout is required to avoid concurrent rendering of multiple components that might be using the hook, which would result in a React error.
      setTimeout(() => setParams(nextEntry.params), 1)
    })
    return () => dispose() // cleanup/unsubscribe function
  }, [])

  return params
}

export default useParams
