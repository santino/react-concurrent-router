import { useContext } from 'react'
import RouterContext from './RouterContext'

const useRouter = () => {
  const { isActive, preloadCode, warmRoute } = useContext(RouterContext)
  return { isActive, preloadCode, warmRoute }
}

export default useRouter
