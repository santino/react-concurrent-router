/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect'
import React, { useContext } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import useSearchParams from '../useSearchParams'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn()
}))
const mockHistoryPush = jest.fn()
const mockHistoryReplace = jest.fn()
useContext.mockImplementation(() => ({
  history: {
    location: {
      pathname: '/home',
      search: '?foo=bar&baz=qux',
      hash: '',
      state: null,
      key: 'siezotjq'
    },
    push: mockHistoryPush,
    replace: mockHistoryReplace
  }
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
            quux: 'corge'
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

  it('overrides searchParams correctly', () => {
    render(<ExampleComponent />)

    fireEvent.click(
      screen.getByRole('button', { name: 'overrideSearchParams' })
    )

    waitFor(() =>
      expect(screen.queryByText(/searchParams value:/)).toHaveTextContent(
        'searchParams value: "{"quux":"corge"}"'
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

    fireEvent.click(screen.getByRole('button', { name: 'mergeSearchParams' }))

    waitFor(() =>
      expect(screen.queryByText(/searchParams value:/)).toHaveTextContent(
        'searchParams value: "{"foo":"bar","baz":"qux","quux":"corge"}"'
      )
    )

    expect(mockHistoryReplace).not.toHaveBeenCalled()

    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
    expect(mockHistoryPush).toHaveBeenCalledWith(
      {
        pathname: '/home',
        search: '?baz=qux&foo=bar&quux=corge'
      },
      {}
    )
  })

  it('merges searchParams and replaces the history entry correctly', () => {
    useContext.mockImplementationOnce(() => ({
      history: {
        location: {
          pathname: '/home',
          search: '?foo=bar&baz=qux',
          hash: '',
          state: { a: 'b' },
          key: 'siezotjq'
        },
        push: mockHistoryPush,
        replace: mockHistoryReplace
      }
    }))
    render(<ExampleComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'replaceSearchParams' }))

    waitFor(() =>
      expect(screen.queryByText(/searchParams value:/)).toHaveTextContent(
        'searchParams value: "{"foo":"bar","baz":"qux","grault":"garply"}"'
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
})
