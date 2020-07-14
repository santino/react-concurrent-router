import '@testing-library/jest-dom/extend-expect'
import React, { Suspense } from 'react'
import { act, render } from '@testing-library/react'

import SuspendableResource from '../SuspendableResource'
import RouterContext from '../RouterContext'
import RouteRenderer from '../RouteRenderer'

const mockRouterDispose = jest.fn()
const mockRouterGet = jest.fn().mockImplementation(() => initialEntry)
const mockRouterSubscribe = jest
  .fn()
  .mockImplementation(() => mockRouterDispose)
const mockRouter = {
  assistPrefetch: false,
  awaitComponent: false,
  get: mockRouterGet,
  subscribe: mockRouterSubscribe
}

const PendingIndicator = () => <span>Pending indicator...</span>
const initialEntry = {
  component: {
    read: jest.fn().mockImplementation(() => ({ prefetched, params }) => (
      <>
        <span data-testid='routeEntry'>Initial</span>
        <span data-testid='prefetchedProp'>{JSON.stringify(prefetched)}</span>
        <span data-testid='paramsProp'>{JSON.stringify(params)}</span>
      </>
    ))
  },
  prefetched: { foo: 'bar' },
  params: { baz: 'qux' }
}
const assistPrefetchInitialEntry = {
  ...initialEntry,
  prefetched: new Map([
    [
      'testData',
      {
        defer: true,
        data: { garply: 'waldo' }
      }
    ]
  ])
}
const newRouteEntry = {
  component: {
    read: jest.fn().mockImplementation(() => ({ prefetched, params }) => (
      <>
        <span data-testid='routeEntry'>Subscribed</span>
        <span data-testid='prefetchedProp'>{JSON.stringify(prefetched)}</span>
        <span data-testid='paramsProp'>{JSON.stringify(params)}</span>
      </>
    ))
  },
  prefetched: { quux: 'quuz' },
  params: { corge: 'grault' }
}

const wrap = (routerProps = {}) =>
  render(
    <RouterContext.Provider value={{ ...mockRouter, ...routerProps }}>
      <Suspense fallback={'Suspense fallback...'}>
        <RouteRenderer pendingIndicator={<PendingIndicator />} />
      </Suspense>
    </RouterContext.Provider>
  )

describe('RouteRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('Renders correctly initial component returned by router get', () => {
    const { getByTestId } = wrap()

    expect(mockRouterGet).toHaveBeenCalledTimes(1)
    expect(initialEntry.component.read).toHaveBeenCalledTimes(1)
    expect(mockRouterSubscribe).toHaveBeenCalledTimes(1)

    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(getByTestId('prefetchedProp')).toHaveTextContent('{"foo":"bar"}')
    expect(getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
  })

  it('Maps correctly initial entry "prefetched" props in assist-prefetch mode', () => {
    const { getByTestId } = wrap({
      assistPrefetch: true,
      get: () => assistPrefetchInitialEntry
    })
    expect(getByTestId('prefetchedProp')).toHaveTextContent(
      '{"testData":{"garply":"waldo"}}'
    )
  })

  it('"Suspends" the component whilst promise for this is resolving', done => {
    const componentResource = new SuspendableResource(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(() => <div>My Component</div>)
          }, 500)
        })
    )
    const { queryByText } = wrap({
      get: () => ({ component: componentResource })
    })

    expect(queryByText('Suspense fallback...')).not.toBe(null)
    expect(queryByText('My Component')).toBe(null)

    setTimeout(() => {
      expect(queryByText('Suspense fallback...')).toBe(null)
      expect(queryByText('My Component')).not.toBe(null)
      done()
    }, 520)
  })

  it('Immediately renders component returned by router subscription, when available', async () => {
    const { getByTestId, queryByText } = wrap()
    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')

    // mock subscription notification
    await act(async () => {
      mockRouterSubscribe.mock.calls[0][0](newRouteEntry)
    })

    expect(queryByText('Pending indicator...')).toBe(null)
    expect(getByTestId('routeEntry')).toHaveTextContent('Subscribed')
    expect(getByTestId('prefetchedProp')).toHaveTextContent('{"quux":"quuz"}')
    expect(getByTestId('paramsProp')).toHaveTextContent('{"corge":"grault"}')
  })

  it('Maps correctly "prefetched" props on component returned by subscription, in assist-prefetch mode', async () => {
    const customNewEntry = {
      ...newRouteEntry,
      prefetched: new Map([
        [
          'testData',
          {
            defer: true,
            data: { garply: 'waldo' }
          }
        ]
      ])
    }
    const { getByTestId } = wrap({
      assistPrefetch: true,
      get: () => assistPrefetchInitialEntry
    })
    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')

    // mock subscription notification
    await act(async () => {
      mockRouterSubscribe.mock.calls[0][0](customNewEntry)
    })

    expect(getByTestId('routeEntry')).toHaveTextContent('Subscribed')
    expect(getByTestId('prefetchedProp')).toHaveTextContent(
      '{"testData":{"garply":"waldo"}}'
    )
  })

  it('Disposes router subscription when unmounting', () => {
    const { unmount } = wrap()

    expect(mockRouterDispose).not.toHaveBeenCalled()
    unmount()
    expect(mockRouterDispose).toHaveBeenCalledTimes(1)
  })

  it('Displays <PendingIndicator /> alongside current entry whilst waiting for new entry to resolve; in awaitComponent mode', async done => {
    const newComponentResource = new SuspendableResource(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(() => <div>My Component</div>)
          }, 500)
        })
    )

    const { getByTestId, queryByText, queryByTestId } = wrap({
      awaitComponent: true
    })

    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(queryByText('Pending indicator...')).toBe(null)
    expect(queryByText('My Component')).toBe(null)

    // mock subscription notification
    await act(async () => {
      mockRouterSubscribe.mock.calls[0][0]({ component: newComponentResource })
    })

    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(queryByText('Pending indicator...')).not.toBe(null)

    setTimeout(() => {
      expect(getByTestId('routeEntry')).toHaveTextContent('Initial')
      expect(queryByText('Pending indicator...')).not.toBe(null)
      expect(queryByText('My Component')).toBe(null)
    }, 400)

    setTimeout(() => {
      expect(queryByTestId('routeEntry')).toBe(null)
      expect(queryByText('Pending indicator...')).toBe(null)
      expect(queryByText('My Component')).not.toBe(null)
      done()
    }, 520)
  })

  it('Waits for non-deferrable prefetch property on new entry, in assist-prefetch mode', async done => {
    const newEntry = {
      component: {
        read: jest.fn().mockImplementation(() => ({ prefetched, params }) => {
          const testData = prefetched.testData.read()
          return (
            <>
              <span data-testid='routeEntry'>Subscribed</span>
              <span data-testid='prefetchedTestData'>
                {JSON.stringify(testData)}
              </span>
            </>
          )
        })
      },
      prefetched: new Map([
        [
          'testData',
          {
            defer: false,
            data: new SuspendableResource(
              () =>
                new Promise(resolve => {
                  setTimeout(() => {
                    resolve({ garply: 'waldo' })
                  }, 300)
                })
            )
          }
        ]
      ])
    }

    const { getByTestId, queryByText } = wrap({
      assistPrefetch: true,
      get: () => assistPrefetchInitialEntry
    })

    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(queryByText('Pending indicator...')).toBe(null)

    // mock subscription notification
    await act(async () => {
      mockRouterSubscribe.mock.calls[0][0](newEntry)
    })

    expect(queryByText('Pending indicator...')).not.toBe(null)
    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')

    setTimeout(() => {
      expect(queryByText('Pending indicator...')).not.toBe(null)
      expect(getByTestId('routeEntry')).toHaveTextContent('Initial')
    }, 250)

    setTimeout(() => {
      expect(queryByText('Pending indicator...')).toBe(null)
      expect(getByTestId('routeEntry')).toHaveTextContent('Subscribed')
      expect(getByTestId('prefetchedTestData')).toHaveTextContent(
        '{"garply":"waldo"}'
      )
      done()
    }, 320)
  })

  it('Waits only for non-deferrable prefetch property on new entry, in assist-prefetch mode', async done => {
    const newEntry = {
      component: {
        read: jest.fn().mockImplementation(() => ({ prefetched }) => {
          const nonDeferrableData = prefetched.nonDeferrableData.read()
          const deferrableData = prefetched.deferrableData.read()
          return (
            <>
              <span data-testid='routeEntry'>Subscribed</span>
              <span data-testid='prefetchedData'>
                {JSON.stringify({ ...nonDeferrableData, ...deferrableData })}
              </span>
            </>
          )
        })
      },
      prefetched: new Map([
        [
          'nonDeferrableData',
          {
            defer: false,
            data: new SuspendableResource(
              () =>
                new Promise(resolve => {
                  setTimeout(() => {
                    resolve({ garply: 'waldo' })
                  }, 300)
                })
            )
          }
        ],
        [
          'deferrableData',
          {
            defer: true,
            data: new SuspendableResource(
              () =>
                new Promise(resolve => {
                  setTimeout(() => {
                    resolve({ fred: 'plugh' })
                  }, 500)
                })
            )
          }
        ]
      ])
    }

    const { getByTestId, queryByTestId, queryByText } = wrap({
      assistPrefetch: true,
      get: () => assistPrefetchInitialEntry
    })

    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(queryByText('Pending indicator...')).toBe(null)

    // mock subscription notification
    await act(async () => {
      mockRouterSubscribe.mock.calls[0][0](newEntry)
    })

    expect(queryByText('Pending indicator...')).not.toBe(null)
    expect(getByTestId('routeEntry')).toHaveTextContent('Initial')

    setTimeout(() => {
      expect(queryByText('Pending indicator...')).not.toBe(null)
      expect(getByTestId('routeEntry')).toHaveTextContent('Initial')
    }, 250)

    setTimeout(() => {
      // since we have been waiting for the faster request only we will fallback
      // to Suspense boundary once that completes and whilst the second request is resolved
      expect(queryByText('Suspense fallback...')).not.toBe(null)
      expect(queryByText('Pending indicator...')).toBe(null)
      expect(queryByTestId('routeEntry')).toBe(null)
      expect(queryByTestId('prefetchedTestData')).toBe(null)
      done()
    }, 320)

    setTimeout(() => {
      expect(queryByText('Pending indicator...')).toBe(null)
      expect(getByTestId('routeEntry')).toHaveTextContent('Subscribed')
      expect(getByTestId('prefetchedTestData')).toHaveTextContent(
        '{"garply":"waldo","fred":"plugh"}'
      )
      done()
    }, 520)
  })
})
