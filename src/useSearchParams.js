import { useCallback, useContext, useMemo } from 'react'
import { paramsStringToObject, sortAndStringifyRequestParams } from './utils'
import RouterContext from './RouterContext'

const useSearchParams = () => {
  const {
    history: { location, push }
  } = useContext(RouterContext)
  const searchParams = useMemo(() => paramsStringToObject(location.search), [
    location.search
  ])
  const setSearchParams = useCallback(
    newParams => {
      push(
        {
          pathname: location.pathname,
          search: sortAndStringifyRequestParams(
            typeof newParams === 'function'
              ? newParams(searchParams)
              : newParams
          )
        },
        location.state
      )
    },
    [location, searchParams]
  )

  return [searchParams, setSearchParams]
}

export default useSearchParams
