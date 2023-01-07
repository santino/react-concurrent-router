import { useCallback, useContext, useMemo } from 'react'
import { paramsStringToObject, sortAndStringifyRequestParams } from './utils'
import RouterContext from './RouterContext'

const useSearchParams = () => {
  const { history } = useContext(RouterContext)
  const { location } = history
  const searchParams = useMemo(() => paramsStringToObject(location.search), [
    location.search
  ])
  const setSearchParams = useCallback(
    (newParams, { replace = false } = {}) => {
      history[replace ? 'replace' : 'push'](
        {
          pathname: location.pathname,
          search: sortAndStringifyRequestParams(
            typeof newParams === 'function'
              ? newParams(searchParams)
              : newParams
          )
        },
        { ...location.state, ...(replace && { skipRender: true }) }
      )
    },
    [location, searchParams]
  )

  return [searchParams, setSearchParams]
}

export default useSearchParams
