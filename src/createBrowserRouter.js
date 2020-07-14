import { createBrowserHistory } from 'history'
import createRouter from './createRouter'

const createBrowserRouter = ({ window, ...routerConfig }) =>
  createRouter({ ...routerConfig, history: createBrowserHistory({ window }) })

export default createBrowserRouter
