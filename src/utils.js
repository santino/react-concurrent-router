import { parsePath } from 'history'
import SuspendableResource from './SuspendableResource'

/**
 * Holds cached value for last prepared match; used only when assisting prefetch
 */
const lastPreparedMatch = {
  pathname: '',
  paramsString: '',
  value: null
}

/**
 * Add leading slash to a path when not already present
 */
export const getCanonicalPath = path =>
  path.charAt(0) === '/' ? path : `/${path}`

/**
 * Performant sorting mechanism using Schwartzian Transform technique to reduce comparison work.
 * This function will sort an array of object params and compute a query-like string.
 * The result will eventually be used as a unique identifier to avoid multiple initialisation of
 * route prefetch to ultimately prevent multiple network requests when these would be equal.
 */
export const sortAndStringifyRequestParams = params => {
  const optimisedParamsArray = []

  // for ... in loop is faster than Object.keys + map
  for (const param in params) {
    /* istanbul ignore next */
    if (!Object.prototype.hasOwnProperty.call(params, param)) continue

    optimisedParamsArray.push({
      index: optimisedParamsArray.length,
      value: param.toLowerCase()
    })
  }

  return optimisedParamsArray
    .sort(({ value: firstValue }, { value: secondValue }) =>
      firstValue > secondValue ? 1 : -1
    )
    .reduce(
      (identifier, element) =>
        `${identifier}${!identifier ? '?' : '&'}${element.value}=${
          params[element.value]
        }`,
      ''
    )
}

/**
 * Given an object check if specified property is already defined
 * and eventually combines all property values in an single array
 */
export const aggregateKeyValues = (list, key, value = '') => {
  const decodedValue = decodeURIComponent(value)
  const keyValue = list[key]
    ? Array.isArray(list[key])
      ? list[key].concat(decodedValue)
      : [list[key], decodedValue]
    : decodedValue

  return keyValue
}

/**
 * Transfrom query params from plain string to a key/value object
 */
export const paramsStringToObject = search => {
  if (!search) return {}

  // first character in location.search is always '?'
  const paramsString = search.slice(1).split('&')
  return paramsString.reduce((params, current) => {
    const [key, value] = current.split('=')
    const keyValue = aggregateKeyValues(params, key, value)
    params[key] = keyValue
    return params
  }, {})
}

/**
 * We create a Map from the routes array so we can optimistically perform matches with O(1) complexity.
 * This operation happens only once when initialising; generated Map is kept in memory for quick access.
 */
export const routesToMap = routes => {
  const routesMap = new Map()

  const routesIterator = (inputRoutes, parent = {}, groupDescendant = false) =>
    inputRoutes.forEach(route => {
      const { path, children, ...routeProps } = route
      const { path: parentPath = '', ...parentProps } = parent
      const canonicalParentPath = parentPath === '/' ? '' : parentPath
      const canonicalRoutePath = path ? getCanonicalPath(path) : ''
      const canonicalPath = canonicalParentPath + canonicalRoutePath
      const isGroupRoute = !routeProps.component
      const computedRoute = {
        ...parentProps,
        ...routeProps,
        ...(!isGroupRoute && {
          component: new SuspendableResource(routeProps.component, true)
        })
      }

      // group route does not have a component, so it can't have its own route entry
      if (!isGroupRoute) routesMap.set(canonicalPath, computedRoute)

      if (children && Array.isArray(children)) {
        routesIterator(
          children,
          // descendants of group routes will have group properties merged with theirs
          // if current route is a group its properties will be passed down
          // otherwise we keep iterating the same group parent
          {
            ...((isGroupRoute && routeProps) || (groupDescendant && parent)),
            path: canonicalPath
          },
          isGroupRoute || groupDescendant // set groupDescendant boolean
        )
      }
    })

  routesIterator(routes)

  if (process.env.NODE_ENV !== 'production' && !routesMap.has('/*')) {
    console.warn(
      `You didn't set a wildcard (*) route to catch any unmatched path.
      This is required to make sure you push users to a Not Found page
      when they request a route that doesn't exist; e.g. 404.`
    )
  }

  return routesMap
}

/**
 * Check match between two different locations. Check for equal pathname by default.
 * Will also compare search and hash properties for exact match.
 */
export const locationsMatch = (left, right, exact = false) => {
  const leftLocation = typeof left === 'string' ? parsePath(left) : left
  const rightLocation = typeof right === 'string' ? parsePath(right) : right

  // pathname equality is always required, even for non-exact matches
  if (leftLocation.pathname !== rightLocation.pathname) return false

  return exact
    ? leftLocation.search === rightLocation.search &&
        leftLocation.hash === rightLocation.hash
    : true
}

/**
 * Attempts to match routes with named params and basic Regex patterns.
 * Return null in case of no match or object of params when matching.
 */
export const matchRegexRoute = (referencePath, pathname) => {
  const pathToMatch = getCanonicalPath(pathname)
  const paramsKeys = []
  const pattern =
    '^(' +
    referencePath
      .replace(/[.*+\-?^$/{}()|[\]\\]/g, '\\$&') // escape regex special characters
      .replace(/\\\*$/, '.*') // support wildcard matching
      .replace(/:(\w+)|(.\*)/g, (_, paramKey = 'rest') => {
        // match and set keys for named params
        paramsKeys.push(paramKey)
        return `([^${paramKey === 'rest' ? ':(w+)|(.*)' : '\\/'}]+)`
      }) +
    ')\\/?$'
  const matcher = new RegExp(pattern)
  const match = pathToMatch.match(matcher)

  if (!match) return null

  const params = paramsKeys.reduce((collection, paramKey, index) => {
    const value = match[index + 2]
    const keyValue = aggregateKeyValues(collection, paramKey, value)
    collection[paramKey] = keyValue
    return collection
  }, {})

  return { params }
}

/**
 * Attempt to match given route against Map of routes.
 * Tries a direct match first, which works with routes without named params and will keep complexity to O(1).
 * Oterwise loop through all the routes, hence O(n), to perform full match with Regex pattern.
 * Will return matched route; wildrcard route (404) if no matches or ultimately null if no wildcard set.
 */
export const matchRoutes = (routes, requestedMatch) => {
  const locationToMatch =
    typeof requestedMatch === 'string'
      ? parsePath(requestedMatch)
      : requestedMatch
  const { pathname } = locationToMatch
  const params = { ...paramsStringToObject(locationToMatch.search) }

  // try a direct match, which works on routes with query params whilst keeping complexity to O(1)
  let matchedRoute = routes.has(pathname) && routes.get(pathname)

  if (!matchedRoute) {
    // if direct match didn't yield result we have to loop through all the
    // routes and check for a Regex pattern match; necessary for named params
    for (const [path, route] of routes.entries()) {
      if (path !== '/*') {
        const match = matchRegexRoute(path, pathname)
        if (!match) continue
        Object.assign(params, match.params)
      }

      // we either found a match or reached our '/*' wildcard (supposedly the last route)
      // in which case assume requested route is not found, so we use this as a fallback
      matchedRoute = route
      break
    }
  }

  // if no matches even with Regex pattern, this is a dead end and we can't resolve the requested
  // route. This should never happen, unless developers forget to add a wildcard (*) route
  if (!matchedRoute) return null

  // Finally we check if the matched route has redirectRules,
  // in which case we have to start over to match the redirected route
  // otherwise we compose and return the matched entry
  const redirectPath =
    matchedRoute.redirectRules && matchedRoute.redirectRules(params)
  return redirectPath
    ? matchRoutes(routes, redirectPath)
    : { route: matchedRoute, params, location: locationToMatch }
}

/**
 * Aassists prefetch by generating suspendable resources for data fetching.
 * This function gets called before navigating, and once the navigation action is committed.
 * For this reason the last prepared match is cached so we can re-use this and its instances
 * when advancing from a pre route warmup to the actual navigation action.
 */
const prepareAssistPrefetchMatch = (
  { route, params, location },
  awaitPrefetch
) => {
  // Check if requested match is same as last match. This is important because cached match holds
  // generated resources for prefetch which we need to re-use to avoid multiple network requests
  const pathnameMatch = location.pathname === lastPreparedMatch.pathname
  const paramsString = pathnameMatch && sortAndStringifyRequestParams(params)

  if (pathnameMatch && paramsString === lastPreparedMatch.paramsString) {
    return lastPreparedMatch.value
  }

  const prefetched = new Map()
  const prefetch = route.prefetch(params)

  // for ... in loop is faster than Object.keys + map
  for (const property in prefetch) {
    /* istanbul ignore next */
    if (!Object.prototype.hasOwnProperty.call(prefetch, property)) {
      continue
    }

    const isFetchFunction = typeof prefetch[property] === 'function'
    const fetchFunction = isFetchFunction
      ? prefetch[property]
      : prefetch[property].data
    const fetchResource = new SuspendableResource(fetchFunction)
    fetchResource.load() // kick off network request

    // set the entry prefetched property that will be used by RouteRenderer
    prefetched.set(property, {
      defer:
        !isFetchFunction && prefetch[property].defer !== undefined
          ? prefetch[property].defer
          : !awaitPrefetch,
      data: fetchResource
    })
  }

  // cache prepared match pathname and paramsString, the actual preparedMatch value will be cached in
  // the main prepareMatch function where it gets computed (overriding values is faster than Object.assign)
  lastPreparedMatch.pathname = location.pathname
  lastPreparedMatch.paramsString =
    paramsString || sortAndStringifyRequestParams(params)

  return prefetched
}

/**
 * This function prepares a route before navigation is requested, effectively warming it up.
 * It instructs to load the component resource; which won't be re-done if it was already initialised.
 * It also deals with data prefetch by either triggering the function or, in case of
 * assist-prefetch, delegating this task to the dedicated prepareAssistPrefetchMatch function.
 */
export const prepareMatch = (match, assistPrefetch, awaitPrefetch) => {
  const { route, params, location } = match
  const prefetched =
    route.prefetch &&
    (assistPrefetch
      ? prepareAssistPrefetchMatch(match, awaitPrefetch)
      : route.prefetch(params))

  if (assistPrefetch && prefetched === lastPreparedMatch.value) {
    // prepareAssistPrefetchMatch will return cached lastPreparedMatch if same as current match.
    // Strict equalty comparison is safe and straightforward since it would be the same reference.
    // Probably not an elegant solution to check the returned value but it allow avoiding code duplication.
    return lastPreparedMatch.value // could return 'prefetched' but this seems more declarative
  }

  // instruct to load the component, resuorce instance will know if this has already been initialised
  route.component.load()

  // finally we can compute our prepared match
  const preparedMatch = {
    location,
    component: route.component,
    params,
    prefetched
  }

  // cache computed preapredMatch value so we can reuse resources
  if (assistPrefetch && prefetched) lastPreparedMatch.value = preparedMatch

  return preparedMatch
}
