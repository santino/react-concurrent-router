/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect'
import React, { useContext } from 'react'
import { act, render, screen } from '@testing-library/react'
import useParams from '../useParams'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn()
}))
const mockSubscribeDispose = jest.fn()
const mockSubscribe = jest.fn().mockReturnValue(mockSubscribeDispose)
useContext.mockImplementation(() => ({
  get: jest.fn().mockReturnValue({ params: { foo: 'bar', baz: 'qux' } }),
  subscribe: mockSubscribe
}))

const ExampleComponent = () => {
  const params = useParams()

  return <div>params value: "{JSON.stringify(params)}"</div>
}

jest.useFakeTimers()
jest.spyOn(global, 'setTimeout')

describe('useParams', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns current params correctly', () => {
    render(<ExampleComponent />)

    expect(screen.queryByText(/params value:/)).toHaveTextContent(
      'params value: "{"foo":"bar","baz":"qux"}"'
    )
  })

  it('automatically updates params when receiving new entry from subscription', () => {
    render(<ExampleComponent />)

    expect(mockSubscribe).toHaveBeenCalledTimes(1)

    expect(setTimeout).not.toHaveBeenCalled()
    mockSubscribe.mock.calls[0][0]({
      params: { alpha: 'beta' }
    }) // trigger subscription
    expect(setTimeout).toHaveBeenCalledTimes(1)
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1)
    act(() => jest.runAllTimers()) // wait setTimeout

    expect(screen.queryByText(/params value:/)).toHaveTextContent(
      'params value: "{"alpha":"beta"}"'
    )

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
