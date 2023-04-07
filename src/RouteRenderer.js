import React, {
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

  // This function is invoked in assist-prefetch mode when receiving a new route entry. It will check
  // the fetch entities within the route prefetch object and 'await' the ones that cannot be deferred.
  // Eventually it will then set the new route entry and composed prefetched object.
  // NOTE: this is similar to 'computeInitialEntry' above but we cannot converge the two because here
  // we need async/await that won't work above since initial setState value cannot be a promise.
  const computePendingEntry = useCallback(async pendingEntry => {
    const prefetched = {}

    for (const [property, value] of pendingEntry.prefetched.entries()) {
      if (!value.defer) await value.data.load()
      prefetched[property] = value.data
    }

    return { ...pendingEntry, prefetched }
  }, [])

  // On mount subscribe for route changes
  useEffect(() => {
    const dispose = subscribe(async nextEntry => {
      if (nextEntry.skipRender) return

      setIsPendingEntry(true)

      // In case of awaitComponent we want to keep user on existing route until the new component
      // code has been loaded. Obviously in this case we wouldn't fallback to the Suspense boundary.
      // NOTE: there is no actual implication on performance!
      // One might think that after finishing waiting here we will then also have to wait for
      // prefetch requests to resolve (for non-deferrable entities); however this is not the case!
      // The router kicks all requests before we receive the route entry here, so any data prefetch
      // request as well as code chunks requests have already been initialised and are in progress.
      if (awaitComponent) await nextEntry.component.load()

      // In assist-prefetch mode we need to compute the prefetch entities to check if we can/cannot
      // defer them. When we can't defer prefetch entities we will continue to show the current
      // route entry whilst we wait for a response; otherwise we render the new route immediately and
      // let the component deal with loading states while prefetching.
      const routeEntry = nextEntry.assistedPrefetch
        ? await computePendingEntry(nextEntry)
        : nextEntry

      setRouteEntry(routeEntry)
      setIsPendingEntry(false)
    })
    return () => dispose() // cleanup/unsubscribe function
  }, [assistPrefetch, awaitComponent, computePendingEntry, subscribe])

  return (
    <>
      {isPendingEntry && pendingIndicator ? pendingIndicator : null}
      <Component
        prefetched={routeEntry.prefetched}
        params={routeEntry.params}
      />
    </>
  )
}

RouteRenderer.propTypes = {
  pendingIndicator: PropTypes.node
}

export default RouteRenderer
