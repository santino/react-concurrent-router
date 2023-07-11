import { locationsMatch, matchRoutes, prepareMatch, routesToMap } from './utils'

/**
 * Create a router using passed-in routes and history protocol (Browser|Hash|Memory).
 * The router watches for location changes by listening on `history` updates; maps the
 * location to the corresponding route entry, and then preloads the code and data for the route.
 */
const createRouter = ({
  assistPrefetch = false,
  awaitComponent = false,
  awaitPrefetch = false,
  routes,
  history
}) => {
  const routesMap = routesToMap(routes)
  const entryMatch = matchRoutes(routesMap, history.location)
  let currentEntry = prepareMatch(entryMatch, assistPrefetch, awaitPrefetch)

  if (!locationsMatch(entryMatch.location, history.location, true)) {
    // entry path has been redirected; update history
    history.replace(entryMatch.location)
  }

  // maintain a set of subscribers to the active entry
  let nextId = 0
  const subscribers = new Map()

  // Listen for location changes, match route entry, prepare the entry and notify subscribers.
  // This pattern ensures that loading (js|data) occurs outside of, and before, rendering.
  history.listen(({ location }) => {
    if (locationsMatch(currentEntry.location, location, true)) return // still on the same route

    const match = matchRoutes(routesMap, location)
    // skip render is meant to be for current navigation action only and must not affect future backward/forward navigation
    const { skipRender, ...locationState } = location.state || {}
    const useLocation = {
      ...match.location,
      state: Object.keys(locationState).length ? locationState : null
    }
    const locationHasMatch = locationsMatch(useLocation, location, true)
    const nextEntry = skipRender
      ? {
          ...currentEntry,
          location: useLocation,
          params: match.params,
          skipRender: true
        }
      : prepareMatch(match, assistPrefetch, awaitPrefetch)

    if (skipRender || !locationHasMatch) {
      // When skipping render we need to override history entry to not break directional navigation (forward/backward). OR
      // Requested route had redirectRules that have been applied, hence
      // the actual destination is not the requested location; update history
      history.replace(useLocation)
    }
    if (!locationHasMatch) return // if redirectRules are aplied we don't notify subscribers

    currentEntry = nextEntry
    subscribers.forEach(callback => callback(nextEntry))
  })

  // The context object that will be passed to the RouterProvider
  return {
    assistPrefetch,
    awaitComponent,
    history,
    isActive: (path, { exact } = {}) =>
      locationsMatch(history.location, path, exact),
    get: () => currentEntry,
    preloadCode: (path, { ignoreRedirectRules } = {}) => {
      // preload just the code for a route
      const { route } = matchRoutes(routesMap, path, ignoreRedirectRules)
      route.component.load()
    },
    warmRoute: (path, { ignoreRedirectRules } = {}) => {
      // preload both code and prefetch data for a route
      const match = matchRoutes(routesMap, path, ignoreRedirectRules)
      prepareMatch(match, assistPrefetch, awaitPrefetch)
    },
    subscribe: callback => {
      const id = nextId++
      const dispose = () => {
        subscribers.delete(id)
      }
      subscribers.set(id, callback)
      return dispose
    }
  }
}

export default createRouter
