import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import PropTypes from 'prop-types'
import RouterContext from './RouterContext'

/**
 * Retrieves the current route entry from RouterContext and renders it.
 * In assist-prefetch mode we allow for configuration of each prefetch entity to be deferrable.
 * In case of non-deferrable entities we 'await' for them before rendering the new route.
 * This allow us to keep user on current (previous) route until a new route is fully ready, including
 * data defined as 'essential', hence non-deferrable.
 *
 * By default all entities are deferrable which will allow new route entry to be rendered as soon
 * as js chunks are available so that React will fallback to: main (above RouteRederer) Suspense boundary,
 * or custom Suspense boundaries defined in the component rendered by the new route entry.
 */
const RouteRenderer = ({ pendingIndicator }) => {
  const { assistPrefetch, awaitComponent, get, subscribe } = useContext(
    RouterContext
  )
  const computeInitialEntry = useCallback(entry => {
    // Used only for initial render. Necessary to map correctly prefetched object in case of
    // assist-prefetch; without this the Component would throw when attempting to .read() prefetched
    // resources. On initial render we always want to Suspend; waiting for data prefetch wouldn't make
    // sense as we don't have content to retain on the screen. Suspense boundary is the best choice.
    if (!assistPrefetch || !entry.prefetched) return entry

    const prefetched = {}

    for (const [property, value] of entry.prefetched.entries()) {
      prefetched[property] = value.data
    }

    return { ...entry, prefetched }
  }, [])
  const [isPendingEntry, setIsPendingEntry] = useState(false) // only used in assist-prefetch mode
  const [routeEntry, setRouteEntry] = useState(computeInitialEntry(get()))
  // This is they key part that ensures we 'suspend' rendering until component.read() is able to resolve
  const Component = useMemo(() => routeEntry.component.read(), [routeEntry])

  // This function is invoked to process prefetched entities in assist-prefetch mode. It will split
  // the fetch entities within the route prefetch object that need to be "await"ed from the ones that don't.
  const processFetchEntities = useCallback(pendingEntry => {
    if (!pendingEntry.assistedPrefetch) {
      return { prefetched: pendingEntry.prefetched, toBePrefetched: [] }
    }

    const prefetched = {}
    const toBePrefetched = []

    for (const [property, value] of pendingEntry.prefetched.entries()) {
      if (value.defer === false && value.data.isLoaded() === false) {
        toBePrefetched.push({ key: property, data: value.data })
      } else prefetched[property] = value.data
    }

    return { prefetched, toBePrefetched }
  }, [])

  // On mount subscribe for route changes
  useEffect(() => {
    const dispose = subscribe(async nextEntry => {
      if (nextEntry.skipRender) return

      const { prefetched, toBePrefetched } = processFetchEntities(nextEntry)
      // Updating pending indicator changes state, which causes a rerender of an entire page component tree. Avoid if not necessary
      const shouldUpdatePendingIndicator = Boolean(
        pendingIndicator &&
          ((awaitComponent && !nextEntry.component.isLoaded()) ||
            (nextEntry.assistedPrefetch && toBePrefetched.length))
      )

      if (shouldUpdatePendingIndicator) setIsPendingEntry(true)

      // In case of awaitComponent we want to keep user on existing route until the new component
      // code has been loaded. Obviously in this case we wouldn't fallback to the Suspense boundary.
      // NOTE: there is no actual implication on performance!
      // One might think that after finishing waiting here we will then also have to wait for
      // prefetch requests to resolve (for non-deferrable entities); however this is not the case!
      // The router kicks all requests before we receive the route entry here, so any data prefetch
      // request as well as code chunks requests have already been initialised and are in progress.
      if (awaitComponent) await nextEntry.component.load()

      // In assist-prefetch mode we need to "await" the prefetch entities that cannot be deferred.
      // When encountering these, we continue to show the current route entry whilst we "await".
      // Otherwise we render the new route immediately and let the component deal with loading states while prefetching.
      const newlyPrefetched = toBePrefetched.length
        ? await toBePrefetched.reduce(
            async (newlyPrefetched, { key, data }) => {
              await data.load() // wait for prefetch entity to resolve
              return { ...newlyPrefetched, [key]: data }
            },
            {}
          )
        : {}
      const routeEntry = {
        ...nextEntry,
        prefetched: { ...prefetched, ...newlyPrefetched }
      }

      setRouteEntry(routeEntry)
      if (shouldUpdatePendingIndicator) setIsPendingEntry(false)
    })
    return () => dispose() // cleanup/unsubscribe function
  }, [
    assistPrefetch,
    awaitComponent,
    processFetchEntities,
    pendingIndicator,
    subscribe
  ])

  // Create a unique key based on the route location to force remounting when navigation occurs
  // This ensures that any Error Boundary state is reset on navigation
  const locationKey = routeEntry.location 
    ? routeEntry.location.pathname + routeEntry.location.search + routeEntry.location.hash
    : 'default'

  return (
    <Fragment key={locationKey}>
      {isPendingEntry && pendingIndicator ? pendingIndicator : null}
      <Component
        key={window.location.href} // force component remount when location changes
        params={routeEntry.params}
        prefetched={routeEntry.prefetched}
      />
    </Fragment>
  )
}

RouteRenderer.propTypes = {
  pendingIndicator: PropTypes.node
}

export default RouteRenderer
