import { useCallback, useContext, useEffect, useState } from 'react'
import { paramsStringToObject, sortAndStringifyRequestParams } from './utils'
import RouterContext from './RouterContext'

/*
 * We rely on useState to force a re-render on the consuming component when state values are updated.
 * This ensures consumers always have fresh data from context, even when we're not re-rendering the entire Route tree (e.g. `skipRender`)
 */
const useSearchParams = () => {
  const { get, history, subscribe } = useContext(RouterContext)
  const [searchParams, setSearchParams] = useState(
    paramsStringToObject(get().location.search)
  )

  const handleSetSearchParams = useCallback(
    (newParams, { replace = false } = {}) => {
      const { location } = get()
      // We must send fresh params, so we compute them on demand when receiving a function.
      // This seems better than using `searchParams` as a useCallback dependency as that would
      // generate a new function on each update, even when consumers don't need to merge params.
      // That approach could also lead to issues if comsumers don't refresh `handleSetSearchParams` function
      // e.g. when using it within a hook without declaring it as a dependency that must update the hook on changes.
      // These reasons make the preferred approach to keep `handleSetSearchParams` self sufficient.
      const currentSearchParams =
        typeof newParams === 'function' && paramsStringToObject(location.search)
      const newSearchParams =
        typeof newParams === 'function'
          ? newParams(currentSearchParams)
          : newParams

      history[replace ? 'replace' : 'push'](
        {
          pathname: location.pathname,
          search: sortAndStringifyRequestParams(newSearchParams)
        },
        { ...location.state, ...(replace && { skipRender: true }) }
      )
    },
    []
  )

  useEffect(() => {
    const dispose = subscribe(async nextEntry => {
      // If updating searchParams with a value equal to the current state, React will bail out without rendering the children or firing effects.
      const newSearchParams = paramsStringToObject(nextEntry.location.search)
      // Timeout is required to avoid concurrent rendering of multiple components that might be using the hook, which would result in a React error.
      setTimeout(() => setSearchParams(newSearchParams), 1)
    })
    return () => dispose() // cleanup/unsubscribe function
  }, [])

  return [searchParams, handleSetSearchParams]
}

export default useSearchParams
