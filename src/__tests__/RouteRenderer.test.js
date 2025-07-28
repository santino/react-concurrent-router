/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom/jest-globals'
import React, { Suspense } from 'react'
import { act, render, screen } from '@testing-library/react'

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
  subscribe: mockRouterSubscribe,
  history: {
    location: { pathname: '/', search: '', hash: '' },
    listen: jest.fn().mockReturnValue(() => {})
  }
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
  params: { baz: 'qux' },
  location: { pathname: '/', search: '', hash: '' }
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
  params: { corge: 'grault' },
  location: { pathname: '/new-route', search: '', hash: '' }
}

// Error component that throws an error
const ErrorComponent = () => {
  throw new Error('Test error')
}

// Error Boundary component for testing
class TestErrorBoundary extends React.Component {
  constructor (props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError (error) {
    return { hasError: true, error }
  }

  componentDidCatch (error, errorInfo) {
    console.log('Error caught:', error, errorInfo)
  }

  render () {
    if (this.state.hasError) {
      return <div data-testid='error-boundary'>Error: {this.state.error.message}</div>
    }

    return this.props.children
  }
}

const wrap = (routerProps = {}) =>
  render(
    <RouterContext.Provider value={{ ...mockRouter, ...routerProps }}>
      <TestErrorBoundary key={window.location?.href || 'default'}>
        <Suspense fallback='Suspense fallback...'>
          <RouteRenderer pendingIndicator={<PendingIndicator />} />
        </Suspense>
      </TestErrorBoundary>
    </RouterContext.Provider>
  )

jest.useFakeTimers()

describe('RouteRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('Renders correctly initial component returned by router get', () => {
    wrap() // render

    expect(mockRouterGet).toHaveBeenCalledTimes(1)
    expect(initialEntry.component.read).toHaveBeenCalledTimes(1)
    expect(mockRouterSubscribe).toHaveBeenCalledTimes(1)

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"foo":"bar"}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
  })

  it('Maps correctly initial entry "prefetched" props in assist-prefetch mode', () => {
    wrap({ assistPrefetch: true, get: () => assistPrefetchInitialEntry })
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"testData":{"garply":"waldo"}}'
    )
  })

  it('"Suspends" the component whilst promise for this is resolving', async () => {
    const componentResource = new SuspendableResource(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(() => <div>My Component</div>)
          }, 500)
        })
    )
    wrap({ get: () => ({ component: componentResource }) }) // render

    expect(screen.queryByText('Suspense fallback...')).toBeInTheDocument()
    expect(screen.queryByText('My Component')).not.toBeInTheDocument()

    await act(() => {
      jest.advanceTimersByTime(520)
    })
    expect(screen.queryByText('Suspense fallback...')).not.toBeInTheDocument()
    expect(screen.queryByText('My Component')).toBeInTheDocument()
  })

  it('Immediately renders component returned by router subscription, when available', async () => {
    wrap() // render
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')

    // mock subscription notification
    await act(() => {
      mockRouterSubscribe.mock.calls[0][0](newRouteEntry)
    })

    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Subscribed')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"quux":"quuz"}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent(
      '{"corge":"grault"}'
    )
  })

  it('Maps correctly "prefetched" props on component returned by subscription, in assist-prefetch mode', async () => {
    const customNewEntry = {
      ...newRouteEntry,
      assistedPrefetch: true,
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
    wrap({ assistPrefetch: true, get: () => assistPrefetchInitialEntry }) // render
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')

    // mock subscription notification
    await act(async () => {
      mockRouterSubscribe.mock.calls[0][0](customNewEntry)
    })

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Subscribed')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"testData":{"garply":"waldo"}}'
    )
  })

  it('Disposes router subscription when unmounting', () => {
    const { unmount } = wrap()

    expect(mockRouterDispose).not.toHaveBeenCalled()
    unmount()
    expect(mockRouterDispose).toHaveBeenCalledTimes(1)
  })

  it('Displays <PendingIndicator /> alongside current entry whilst waiting for new entry to resolve component; in awaitComponent mode', async () => {
    const newComponentResource = new SuspendableResource(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(() => <div>My Component</div>)
          }, 500)
        })
    )

    wrap({ awaitComponent: true, get: () => initialEntry }) // render

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"foo":"bar"}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
    expect(screen.queryByText('My Component')).not.toBeInTheDocument()

    // mock subscription notification
    await act(() => {
      mockRouterSubscribe.mock.calls[0][0]({ component: newComponentResource })
    })

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"foo":"bar"}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
    expect(screen.queryByText('Pending indicator...')).toBeInTheDocument()

    await act(() => {
      jest.advanceTimersByTime(520)
    })
    expect(screen.queryByText('My Component')).toBeInTheDocument()
    expect(screen.queryByTestId('routeEntry')).not.toBeInTheDocument()
    expect(screen.queryByTestId('prefetchedProp')).not.toBeInTheDocument()
    expect(screen.queryByTestId('paramsProp')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
  })

  it('Waits for non-deferrable prefetch property on new entry, in assist-prefetch mode', async () => {
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
      assistedPrefetch: true,
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

    wrap({ assistPrefetch: true, get: () => assistPrefetchInitialEntry }) // render

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"testData":{"garply":"waldo"}}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()

    // mock subscription notification
    await act(() => {
      mockRouterSubscribe.mock.calls[0][0](newEntry)
    })

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"testData":{"garply":"waldo"}}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
    expect(screen.queryByText('Pending indicator...')).toBeInTheDocument()

    await act(() => {
      jest.advanceTimersByTime(320)
    })
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Subscribed')
    expect(screen.getByTestId('prefetchedTestData')).toHaveTextContent(
      '{"garply":"waldo"}'
    )
    expect(screen.queryByTestId('prefetchedProp')).not.toBeInTheDocument()
    expect(screen.queryByTestId('paramsProp')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
  })

  it('Waits only for non-deferrable prefetch property on new entry, in assist-prefetch mode', async () => {
    const newEntry = {
      component: {
        read: jest.fn().mockImplementation(() => ({ prefetched }) => {
          const nonDeferrableData = prefetched.nonDeferrableData?.read()
          const deferrableData = prefetched.deferrableData.read()
          return (
            <>
              <span data-testid='routeEntry'>Subscribed</span>
              <span data-testid='prefetchedTestData'>
                {JSON.stringify({ ...nonDeferrableData, ...deferrableData })}
              </span>
            </>
          )
        })
      },
      assistedPrefetch: true,
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

    wrap({ assistPrefetch: true, get: () => assistPrefetchInitialEntry }) // render

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"testData":{"garply":"waldo"}}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument(
      null
    )

    // mock subscription notification
    await act(() => {
      mockRouterSubscribe.mock.calls[0][0](newEntry)
    })

    expect(screen.queryByText('Pending indicator...')).toBeInTheDocument()
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.queryByTestId('prefetchedTestData')).not.toBeInTheDocument(
      null
    )

    // since we have been waiting for the faster request only we will fallback
    // to Suspense boundary once that completes and whilst the second request is resolved

    await act(() => {
      jest.advanceTimersByTime(320)
    })
    expect(screen.queryByText('Suspense fallback...')).toBeVisible()
    expect(screen.queryByText('Pending indicator...')).not.toBeVisible()
    expect(screen.queryByTestId('routeEntry')).not.toBeVisible()
    expect(screen.queryByTestId('prefetchedProp')).not.toBeVisible()
    expect(screen.queryByTestId('paramsProp')).not.toBeVisible()
    expect(screen.queryByTestId('prefetchedTestData')).not.toBeInTheDocument()

    await act(() => {
      jest.advanceTimersByTime(520)
    })
    expect(screen.queryByText('Suspense fallback...')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Subscribed')
    expect(screen.getByTestId('prefetchedTestData')).toHaveTextContent(
      '{"garply":"waldo","fred":"plugh"}'
    )
  })

  it('Does not displays <PendingIndicator /> nor "await" when new component to resolve is loaded; in awaitComponent mode', async () => {
    const newComponentResource = new SuspendableResource(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(() => <div>Component to be loaded</div>)
          }, 500)
        })
    )
    newComponentResource._result = () => <div>Component loaded</div> // force isLoaded to return true

    wrap({ awaitComponent: true }) // render

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"foo":"bar"}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
    expect(screen.queryByText('My Component')).not.toBeInTheDocument()

    // mock subscription notification
    await act(async () => {
      mockRouterSubscribe.mock.calls[0][0]({ component: newComponentResource })
    })

    expect(newComponentResource.isLoaded()).toBe(true)
    expect(screen.queryByText('Component to be loaded')).toBe(null)
    expect(screen.queryByText('Component loaded')).not.toBe(null)
    expect(screen.queryByTestId('routeEntry')).toBe(null)
    expect(screen.queryByTestId('prefetchedProp')).toBe(null)
    expect(screen.queryByTestId('paramsProp')).toBe(null)
    expect(screen.queryByText('Pending indicator...')).toBe(null)

    await act(() => {
      jest.advanceTimersByTime(520)
    })
    expect(screen.queryByText('Component to be loaded')).not.toBeInTheDocument()
    expect(screen.queryByText('Component loaded')).toBeInTheDocument()
    expect(screen.queryByTestId('routeEntry')).not.toBeInTheDocument()
    expect(screen.queryByTestId('prefetchedProp')).not.toBeInTheDocument()
    expect(screen.queryByTestId('paramsProp')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
  })

  it('Does not displays <PendingIndicator /> nor "await" when new component and its fetch entities to resolve is loaded; in awaitComponent mode', async () => {
    const nonDeferrableResource = new SuspendableResource(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({ garply: 'waldo' })
          }, 300)
        })
    )
    nonDeferrableResource.isLoaded = () => true
    const newEntry = {
      component: {
        read: jest.fn().mockImplementation(() => ({ prefetched }) => {
          const nonDeferrableData = prefetched.nonDeferrableData.read()
          const deferrableData = prefetched.deferrableData.read()
          return (
            <>
              <span data-testid='routeEntry'>Subscribed</span>
              <span data-testid='prefetchedTestData'>
                {JSON.stringify({ ...nonDeferrableData, ...deferrableData })}
              </span>
            </>
          )
        })
      },
      assistedPrefetch: true,
      prefetched: new Map([
        [
          'nonDeferrableData',
          {
            defer: false,
            data: nonDeferrableResource
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

    wrap({ assistPrefetch: true, get: () => assistPrefetchInitialEntry }) // render

    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"testData":{"garply":"waldo"}}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent('{"baz":"qux"}')
    expect(nonDeferrableResource.isLoaded()).toBe(true)
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()

    // mock subscription notification
    await act(() => {
      mockRouterSubscribe.mock.calls[0][0](newEntry)
    })

    await act(() => {
      jest.advanceTimersByTime(320)
    })
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
    expect(screen.queryByText('Suspense fallback...')).toBeInTheDocument()
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')
    expect(screen.queryByTestId('prefetchedTestData')).not.toBeInTheDocument()

    await act(() => {
      jest.advanceTimersByTime(520)
    })
    expect(screen.queryByText('Suspense fallback...')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
    expect(screen.getByTestId('prefetchedTestData')).toHaveTextContent(
      '{"garply":"waldo","fred":"plugh"}'
    )
  })

  it('does not re-render when "skipRender" is true', async () => {
    const mockComponentRead = jest.fn()
    wrap() // render
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Initial')

    // mock subscription notification
    await act(() => {
      mockRouterSubscribe.mock.calls[0][0](newRouteEntry)
    })

    expect(screen.queryByText('Pending indicator...')).toBe(null)
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Subscribed')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"quux":"quuz"}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent(
      '{"corge":"grault"}'
    )

    await act(() => {
      mockRouterSubscribe.mock.calls[0][0]({
        component: {
          read: mockComponentRead
        },
        prefetched: { alpha: 'beta' },
        params: { gamma: 'delta' },
        skipRender: true
      })
    })

    expect(screen.queryByText('Pending indicator...')).not.toBeInTheDocument()
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Subscribed')
    expect(screen.getByTestId('prefetchedProp')).toHaveTextContent(
      '{"quux":"quuz"}'
    )
    expect(screen.getByTestId('paramsProp')).toHaveTextContent(
      '{"corge":"grault"}'
    )
    expect(mockComponentRead).not.toHaveBeenCalled()
  })

  it('Should reset Error Boundary state when navigating to a new route', () => {
    // Mock window.location.href to simulate navigation
    const originalLocation = window.location
    delete window.location
    window.location = { href: 'http://localhost:3000/initial' }

    // Create an entry that throws an error
    const errorEntry = {
      component: {
        read: jest.fn().mockImplementation(() => ErrorComponent)
      },
      prefetched: {},
      params: {},
      location: { pathname: '/error', search: '', hash: '' }
    }

    // Mock the router to return the error entry initially
    mockRouterGet.mockImplementation(() => errorEntry)

    const { rerender } = wrap()

    // Should show error boundary
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    expect(screen.getByTestId('error-boundary')).toHaveTextContent('Error: Test error')

    // Simulate navigation by changing location and triggering subscription
    window.location = { href: 'http://localhost:3000/new-route' }

    // Mock the router to return a normal entry for the new route
    mockRouterGet.mockImplementation(() => newRouteEntry)

    // Re-render with the new location to trigger the Fragment key change
    rerender(
      <RouterContext.Provider value={{ ...mockRouter }}>
        <TestErrorBoundary key={window.location.href}>
          <Suspense fallback='Suspense fallback...'>
            <RouteRenderer pendingIndicator={<PendingIndicator />} />
          </Suspense>
        </TestErrorBoundary>
      </RouterContext.Provider>
    )

    // Should now show the new route component instead of the error boundary
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument()
    expect(screen.getByTestId('routeEntry')).toHaveTextContent('Subscribed')

    // Restore original location
    window.location = originalLocation
  })
})
