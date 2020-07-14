import createBrowserRouter from '../createBrowserRouter.js'
import createHashRouter from '../createHashRouter.js'
import createMemoryRouter from '../createMemoryRouter.js'
import SuspendableResource from '../SuspendableResource.js'
import useBeforeRouteLeave from '../useBeforeRouteLeave.js'
import useHistory from '../useHistory.js'
import useNavigation from '../useNavigation.js'
import useRouter from '../useRouter.js'
import RouterProvider from '../RouterProvider.js'
import RouteRenderer from '../RouteRenderer.js'
import Link from '../Link.js'

import * as index from '../index'

describe('index', () => {
  it('exports expected functions', () => {
    expect(index).toEqual({
      createBrowserRouter: createBrowserRouter,
      createHashRouter: createHashRouter,
      createMemoryRouter: createMemoryRouter,
      SuspendableResource: SuspendableResource,
      useBeforeRouteLeave: useBeforeRouteLeave,
      useHistory: useHistory,
      useNavigation: useNavigation,
      useRouter: useRouter,
      RouterProvider: RouterProvider,
      RouteRenderer: RouteRenderer,
      Link: Link
    })
  })
})
