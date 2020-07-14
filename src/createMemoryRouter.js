import { createMemoryHistory } from 'history'
import createRouter from './createRouter'

const createMemoryRouter = ({
  initialEntries,
  initialIndex,
  ...routerConfig
}) =>
  createRouter({
    ...routerConfig,
    history: createMemoryHistory({ initialEntries, initialIndex })
  })

export default createMemoryRouter
