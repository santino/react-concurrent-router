import { useContext } from 'react'
import RouterContext from './RouterContext'

const useParams = () => {
  const { get } = useContext(RouterContext)
  const routeEntry = get()

  return routeEntry.params
}

export default useParams
