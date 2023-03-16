/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect'
import React, { useContext } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'

import useSearchParams from '../useSearchParams'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn()
}))
const mockHistoryPush = jest.fn()
const mockHistoryReplace = jest.fn()
const mockSubscribeDispose = jest.fn()
const mockSubscribe = jest.fn().mockReturnValue(mockSubscribeDispose)
useContext.mockImplementation(() => ({
  get: jest.fn().mockReturnValue({
    location: {
      pathname: '/home',
      search: '?foo=bar&baz=qux',
      hash: '',
      state: null,
      key: 'siezotjq'
    }
  }),
  history: {
    push: mockHistoryPush,
    replace: mockHistoryReplace
  },
  subscribe: mockSubscribe
}))

const ExampleComponent = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <>
      <div>searchParams value: "{JSON.stringify(searchParams)}"</div>
      <button onClick={() => setSearchParams({ quux: 'corge' })}>
        overrideSearchParams
      </button>
      <button
        onClick={() =>
          setSearchParams(currentParams => ({
            ...currentParams,
            'quux/': 'corge='
          }))
        }
      >
        mergeSearchParams
      </button>
      <button
        onClick={() =>
          setSearchParams(
            currentParams => ({
              ...currentParams,
              grault: 'garply'
            }),
            { replace: true }
          )
        }
      >
        replaceSearchParams
      </button>
    </>
  )
}

jest.useFakeTimers()
jest.spyOn(global, 'setTimeout')

describe('useSearchParams', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns current searchParams correctly', () => {
    render(<ExampleComponent />)

    expect(screen.queryByText(/searchParams value:/)).toHaveTextContent(
      'searchParams value: "{"foo":"bar","baz":"qux"}"'
    )

    expect(mockHistoryPush).not.toHaveBeenCalled()
    expect(mockHistoryReplace).not.toHaveBeenCalled()
  })

  it('overrides searchParams correctly', async () => {
    render(<ExampleComponent />)

    act(() =>
      fireEvent.click(
        screen.getByRole('button', { name: 'overrideSearchParams' })
      )
    )

    expect(mockHistoryReplace).not.toHaveBeenCalled()

    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
    expect(mockHistoryPush).toHaveBeenCalledWith(
      {
        pathname: '/home',
        search: '?quux=corge'
      },
      {}
    )
  })

  it('merges searchParams correctly', () => {
    render(<ExampleComponent />)

    act(() =>
      fireEvent.click(screen.getByRole('button', { name: 'mergeSearchParams' }))
    )

    expect(mockHistoryReplace).not.toHaveBeenCalled()

    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
    expect(mockHistoryPush).toHaveBeenCalledWith(
      {
        pathname: '/home',
        search: '?baz=qux&foo=bar&quux/=corge%3D'
      },
      {}
    )
  })

  it('merges searchParams and replaces the history entry correctly', () => {
    useContext.mockImplementationOnce(() => ({
      get: jest.fn().mockReturnValue({
        location: {
          pathname: '/home',
          search: '?foo=bar&baz=qux',
          hash: '',
          state: { a: 'b' },
          key: 'siezotjq'
        }
      }),
      history: {
        push: mockHistoryPush,
        replace: mockHistoryReplace
      },
      subscribe: mockSubscribe
    }))
    render(<ExampleComponent />)

    act(() =>
      fireEvent.click(
        screen.getByRole('button', { name: 'replaceSearchParams' })
      )
    )

    expect(mockHistoryPush).not.toHaveBeenCalled()

    expect(mockHistoryReplace).toHaveBeenCalledTimes(1)
    expect(mockHistoryReplace).toHaveBeenCalledWith(
      {
        pathname: '/home',
        search: '?baz=qux&foo=bar&grault=garply'
      },
      { a: 'b', skipRender: true }
    )
  })

  it('automatically updates searchParams when receiving new entry from subscription', () => {
    render(<ExampleComponent />)

    expect(mockSubscribe).toHaveBeenCalledTimes(1)

    expect(setTimeout).not.toHaveBeenCalled()
    mockSubscribe.mock.calls[0][0]({
      location: {
        pathname: 'subscribedLocation',
        search: '?alpha=beta',
        state: null
      }
    }) // trigger subscription
    expect(setTimeout).toHaveBeenCalledTimes(1)
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1)
    act(() => jest.runAllTimers()) // wait setTimeout

    expect(screen.queryByText(/searchParams value:/)).toHaveTextContent(
      'searchParams value: "{"alpha":"beta"}"'
    )

    expect(mockHistoryPush).not.toHaveBeenCalled()
    expect(mockHistoryReplace).not.toHaveBeenCalled()
    expect(mockSubscribeDispose).not.toHaveBeenCalled()
  })

  it('disposes of subscription when unmounting', () => {
    const { unmount } = render(<ExampleComponent />)

    expect(mockSubscribeDispose).not.toHaveBeenCalled()

    unmount()

    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribeDispose).toHaveBeenCalledTimes(1)
  })
})
