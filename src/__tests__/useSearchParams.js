/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect'
import React, { useContext } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import RouterContext from '../RouterContext'
import useSearchParams from '../useSearchParams'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn()
}))
const mockHistoryPush = jest.fn()
useContext.mockImplementation(() => ({
  history: {
    location: {
      pathname: '/home',
      search: '?foo=bar&baz=qux',
      hash: '',
      state: null,
      key: 'siezotjq'
    },
    push: mockHistoryPush
  }
}))

const ExampleComponent = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <>
      <div>searchParams value: "{JSON.stringify(searchParams)}"</div>
      <button onClick={() => setSearchParams({ quux: 'corge' })}>
        replaceSearchParams
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
  })

  it('overrides searchParams correctly', () => {
    render(<ExampleComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'replaceSearchParams' }))

    waitFor(() =>
      expect(screen.queryByText(/searchParams value:/)).toHaveTextContent(
        'searchParams value: "{"quux":"corge"}"'
      )
    )

    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
    expect(mockHistoryPush).toHaveBeenCalledWith(
      {
        pathname: '/home',
        search: '?quux=corge'
      },
      null
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

    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
    expect(mockHistoryPush).toHaveBeenCalledWith(
      {
        pathname: '/home',
        search: '?baz=qux&foo=bar&quux=corge'
      },
      null
    )
  })
})
