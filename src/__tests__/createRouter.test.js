import {
  locationsMatch,
  matchRoutes,
  prepareMatch,
  routesToMap
} from '../utils'

import createRouter from '../createRouter'

jest.mock('../utils')

const mockComponent = { load: jest.fn() }
locationsMatch.mockReturnValue(true)
matchRoutes.mockReturnValue({
  location: { pathname: 'matchedLocation' },
  route: { component: mockComponent }
})
prepareMatch.mockReturnValue({
  location: { pathname: 'preparedLocation' },
  component: mockComponent
})
routesToMap.mockReturnValue('routesMap')

const defaultProps = {
  routes: ['foo', 'bar'],
  assistPrefetch: true,
  awaitComponent: true,
  awaitPrefetch: false,
  history: {
    location: { pathname: 'historyLocation' },
    replace: jest.fn(),
    listen: jest.fn()
  }
}

describe('createRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initialisation', () => {
    it('invokes expected functions when initialised', () => {
      createRouter(defaultProps)

      expect(routesToMap).toHaveBeenCalledTimes(1)
      expect(routesToMap).toHaveBeenCalledWith(defaultProps.routes)

      expect(matchRoutes).toHaveBeenCalledTimes(1)
      expect(matchRoutes).toHaveBeenCalledWith(
        'routesMap',
        defaultProps.history.location
      )

      expect(prepareMatch).toHaveBeenCalledTimes(1)
      expect(prepareMatch).toHaveBeenCalledWith(
        {
          location: { pathname: 'matchedLocation' },
          route: { component: mockComponent }
        },
        defaultProps.assistPrefetch,
        defaultProps.awaitPrefetch
      )

      expect(locationsMatch).toHaveBeenCalledTimes(1)
      expect(locationsMatch).toHaveBeenCalledWith(
        { pathname: 'matchedLocation' },
        { pathname: 'historyLocation' },
        true
      )

      expect(defaultProps.history.replace).not.toHaveBeenCalled()
      expect(defaultProps.history.listen).toHaveBeenCalledTimes(1)
      expect(defaultProps.history.listen).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    it('invokes history.replace when locationsMatch returns false', () => {
      locationsMatch.mockReturnValueOnce(false)
      createRouter(defaultProps)

      expect(defaultProps.history.replace).toHaveBeenCalledTimes(1)
      expect(defaultProps.history.replace).toHaveBeenCalledWith({
        pathname: 'matchedLocation'
      })
    })
  })

  describe('output', () => {
    it('returns an object with expected properties', () => {
      const router = createRouter(defaultProps)

      expect(router).toEqual({
        assistPrefetch: defaultProps.assistPrefetch,
        awaitComponent: defaultProps.awaitComponent,
        history: defaultProps.history,
        isActive: expect.any(Function),
        get: expect.any(Function),
        preloadCode: expect.any(Function),
        warmRoute: expect.any(Function),
        subscribe: expect.any(Function)
      })
    })

    it('behaves as expected when invoking "isActive" function', () => {
      const router = createRouter(defaultProps)

      locationsMatch.mockClear()
      router.isActive('customPath')
      expect(locationsMatch).toHaveBeenCalledTimes(1)
      expect(locationsMatch).toHaveBeenCalledWith(
        defaultProps.history.location,
        'customPath',
        undefined
      )

      locationsMatch.mockClear()
      router.isActive('customPath2', { exact: false })
      expect(locationsMatch).toHaveBeenCalledTimes(1)
      expect(locationsMatch).toHaveBeenCalledWith(
        defaultProps.history.location,
        'customPath2',
        false
      )

      locationsMatch.mockClear()
      router.isActive('customPath2', { exact: true })
      expect(locationsMatch).toHaveBeenCalledTimes(1)
      expect(locationsMatch).toHaveBeenCalledWith(
        defaultProps.history.location,
        'customPath2',
        true
      )
    })

    it('behaves as expected when invoking "get" function', () => {
      expect(createRouter(defaultProps).get()).toEqual({
        location: { pathname: 'preparedLocation' },
        component: mockComponent
      })

      prepareMatch.mockReturnValueOnce({ location: 'preparedLocation2' })
      expect(createRouter(defaultProps).get()).toEqual({
        location: 'preparedLocation2'
      })
    })

    it('behaves as expected when invoking "preloadCode" function', () => {
      const router = createRouter(defaultProps)

      router.preloadCode('customPathname')

      expect(matchRoutes).toHaveBeenCalledTimes(2)
      expect(matchRoutes).toHaveBeenLastCalledWith(
        'routesMap',
        'customPathname',
        undefined
      )
      expect(mockComponent.load).toHaveBeenCalledTimes(1)
      expect(mockComponent.load).toHaveBeenCalledWith()
    })

    it('behaves as expected when invoking "preloadCode" function with "ignoreRedirectRules" option', () => {
      const router = createRouter(defaultProps)

      router.preloadCode('customPathname', { ignoreRedirectRules: true })

      expect(matchRoutes).toHaveBeenCalledTimes(2)
      expect(matchRoutes).toHaveBeenLastCalledWith(
        'routesMap',
        'customPathname',
        true
      )
      expect(mockComponent.load).toHaveBeenCalledTimes(1)
      expect(mockComponent.load).toHaveBeenCalledWith()
    })

    it('behaves as expected when invoking "warmRoute" function', () => {
      const router = createRouter(defaultProps)

      prepareMatch.mockClear()
      router.warmRoute('routePathname')

      expect(matchRoutes).toHaveBeenCalledTimes(2)
      expect(matchRoutes).toHaveBeenLastCalledWith(
        'routesMap',
        'routePathname',
        undefined
      )
      expect(prepareMatch).toHaveBeenCalledTimes(1)
      expect(prepareMatch).toHaveBeenCalledWith(
        {
          location: { pathname: 'matchedLocation' },
          route: { component: mockComponent }
        },
        defaultProps.assistPrefetch,
        defaultProps.awaitPrefetch
      )
    })

    it('behaves as expected when invoking "warmRoute" function with "ignoreRedirectRules" option', () => {
      const router = createRouter(defaultProps)

      prepareMatch.mockClear()
      router.warmRoute('routePathname', { ignoreRedirectRules: true })

      expect(matchRoutes).toHaveBeenCalledTimes(2)
      expect(matchRoutes).toHaveBeenLastCalledWith(
        'routesMap',
        'routePathname',
        true
      )
      expect(prepareMatch).toHaveBeenCalledTimes(1)
      expect(prepareMatch).toHaveBeenCalledWith(
        {
          location: { pathname: 'matchedLocation' },
          route: { component: mockComponent }
        },
        defaultProps.assistPrefetch,
        defaultProps.awaitPrefetch
      )
    })

    it('behaves as expected when invoking "subscribe" function', () => {
      const router = createRouter(defaultProps)
      const mockSubscribeCallback = jest.fn()
      locationsMatch.mockReturnValueOnce(false)
      const subscription = router.subscribe(mockSubscribeCallback)

      expect(subscription).toEqual(expect.any(Function))
      defaultProps.history.listen.mock.calls[0][0]({ location: 'newLocation' }) // trigger history listener
      expect(mockSubscribeCallback).toHaveBeenCalledTimes(1)
      expect(mockSubscribeCallback).toHaveBeenCalledWith({
        location: { pathname: 'preparedLocation' },
        component: mockComponent
      })

      subscription() // expect this to dispose subscription
      mockSubscribeCallback.mockClear()
      locationsMatch.mockReturnValueOnce(false)
      defaultProps.history.listen.mock.calls[0][0]({ location: 'newLocation' }) // trigger history listener
      expect(mockSubscribeCallback).not.toHaveBeenCalled()
    })
  })

  describe('history.listen', () => {
    it('does nothing when "locationsMatch" returns true', () => {
      const router = createRouter(defaultProps)
      const mockSubscribeCallback = jest.fn()
      router.subscribe(mockSubscribeCallback)
      defaultProps.history.listen.mock.calls[0][0]({
        location: { pathname: 'newLocation' }
      }) // trigger history listener

      expect(locationsMatch).toHaveBeenCalledTimes(2)
      expect(locationsMatch).toHaveBeenLastCalledWith(
        { pathname: 'preparedLocation' },
        { pathname: 'newLocation' },
        true
      )
      expect(matchRoutes).toHaveBeenCalledTimes(1)
      expect(prepareMatch).toHaveBeenCalledTimes(1)
      expect(defaultProps.history.replace).not.toHaveBeenCalled()
      expect(mockSubscribeCallback).not.toHaveBeenCalled()
    })

    it('behaves as expected when first "locationsMatch" returns false (new location)', () => {
      const router = createRouter(defaultProps)
      const mockSubscribeCallback = jest.fn()
      router.subscribe(mockSubscribeCallback)
      locationsMatch.mockReturnValueOnce(false)
      defaultProps.history.listen.mock.calls[0][0]({
        location: { pathname: 'newLocation' }
      }) // trigger history listener

      expect(locationsMatch).toHaveBeenCalledTimes(3)
      expect(locationsMatch).toHaveBeenNthCalledWith(
        2,
        { pathname: 'preparedLocation' },
        { pathname: 'newLocation' },
        true
      )
      expect(locationsMatch).toHaveBeenNthCalledWith(
        3,
        { pathname: 'matchedLocation' },
        { pathname: 'newLocation' },
        true
      )
      expect(matchRoutes).toHaveBeenCalledTimes(2)
      expect(matchRoutes).toHaveBeenLastCalledWith('routesMap', {
        pathname: 'newLocation'
      })
      expect(prepareMatch).toHaveBeenCalledTimes(2)
      expect(prepareMatch).toHaveBeenLastCalledWith(
        {
          location: { pathname: 'matchedLocation' },
          route: { component: mockComponent }
        },
        defaultProps.assistPrefetch,
        defaultProps.awaitPrefetch
      )
      expect(defaultProps.history.replace).not.toHaveBeenCalled()
      expect(mockSubscribeCallback).toHaveBeenCalledTimes(1)
      expect(mockSubscribeCallback).toHaveBeenCalledWith({
        location: { pathname: 'preparedLocation' },
        component: mockComponent
      })
    })

    it('behaves as expected when second "locationMatch" call returns false (replaced location)', () => {
      const router = createRouter(defaultProps)
      const mockSubscribeCallback = jest.fn()
      router.subscribe(mockSubscribeCallback)
      locationsMatch.mockReturnValueOnce(false).mockReturnValueOnce(false)
      defaultProps.history.listen.mock.calls[0][0]({
        location: { pathname: 'newLocation' }
      }) // trigger history listener

      expect(locationsMatch).toHaveBeenCalledTimes(3)
      expect(matchRoutes).toHaveBeenCalledTimes(2)
      expect(prepareMatch).toHaveBeenCalledTimes(2)
      expect(defaultProps.history.replace).toHaveBeenCalledTimes(1)
      expect(defaultProps.history.replace).toHaveBeenCalledWith({
        pathname: 'matchedLocation'
      })
      expect(mockSubscribeCallback).not.toHaveBeenCalled()
    })

    it('updates the currentEntry with the new location', () => {
      const router = createRouter(defaultProps)
      expect(router.get()).toEqual({
        location: { pathname: 'preparedLocation' },
        component: mockComponent
      })

      locationsMatch.mockReturnValueOnce(false)
      prepareMatch.mockReturnValueOnce({
        location: { pathname: 'newLocation' }
      })
      defaultProps.history.listen.mock.calls[0][0]({ location: '' }) // trigger history listener
      expect(router.get()).toEqual({ location: { pathname: 'newLocation' } })
    })

    it('notifies all subscribers registered', () => {
      const router = createRouter(defaultProps)
      const firstSubscribeCallback = jest.fn()
      const secondSubscribeCallback = jest.fn()
      const thirdSubscribeCallback = jest.fn()
      router.subscribe(firstSubscribeCallback)
      router.subscribe(secondSubscribeCallback)
      router.subscribe(thirdSubscribeCallback)

      locationsMatch.mockReturnValueOnce(false)
      defaultProps.history.listen.mock.calls[0][0]({
        location: { pathname: 'newLocation' }
      }) // trigger history listener

      expect(firstSubscribeCallback).toHaveBeenCalledTimes(1)
      expect(firstSubscribeCallback).toHaveBeenCalledWith({
        location: { pathname: 'preparedLocation' },
        component: mockComponent
      })
      expect(secondSubscribeCallback).toHaveBeenCalledTimes(1)
      expect(secondSubscribeCallback).toHaveBeenCalledWith({
        location: { pathname: 'preparedLocation' },
        component: mockComponent
      })
      expect(thirdSubscribeCallback).toHaveBeenCalledTimes(1)
      expect(thirdSubscribeCallback).toHaveBeenCalledWith({
        location: { pathname: 'preparedLocation' },
        component: mockComponent
      })
    })

    it('behaves as expected when "skipRender" is in location state', () => {
      const skipRenderLocation = {
        pathname: 'newLocation',
        state: { skipRender: true }
      }
      const matchedRoute = {
        pathname: 'newLocation',
        params: { foo: 'bar' }
      }
      const router = createRouter(defaultProps)
      const mockSubscribeCallback = jest.fn()
      router.subscribe(mockSubscribeCallback)
      locationsMatch.mockReturnValueOnce(false)
      matchRoutes.mockReturnValueOnce({ location: matchedRoute })

      expect(matchRoutes).toHaveBeenCalledTimes(1)
      expect(locationsMatch).toHaveBeenCalledTimes(1)
      expect(prepareMatch).toHaveBeenCalledTimes(1)

      defaultProps.history.listen.mock.calls[0][0]({
        location: skipRenderLocation
      }) // trigger history listener

      expect(locationsMatch).toHaveBeenCalledTimes(3)
      expect(locationsMatch).toHaveBeenNthCalledWith(
        2,
        { pathname: 'preparedLocation' },
        skipRenderLocation,
        true
      )
      expect(matchRoutes).toHaveBeenCalledTimes(2)
      expect(matchRoutes).toHaveBeenLastCalledWith(
        'routesMap',
        skipRenderLocation
      )
      expect(prepareMatch).toHaveBeenCalledTimes(1)
      expect(defaultProps.history.replace).not.toHaveBeenCalled()
      expect(mockSubscribeCallback).toHaveBeenCalledTimes(1)
      expect(mockSubscribeCallback).toHaveBeenCalledWith({
        component: mockComponent,
        location: matchedRoute,
        params: undefined,
        skipRender: true
      })
    })
  })
})
