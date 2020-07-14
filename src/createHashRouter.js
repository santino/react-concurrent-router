import { createHashHistory } from 'history'
import createRouter from './createRouter'

const createHashRouter = ({ window, ...routerConfig }) =>
  createRouter({ ...routerConfig, history: createHashHistory({ window }) })

export default createHashRouter
