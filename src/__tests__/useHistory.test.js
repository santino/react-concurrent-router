/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect'
import React, { useContext } from 'react'
import { act, render, screen } from '@testing-library/react'
import useHistory from '../useHistory'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn()
}))
const mockSubscribeDispose = jest.fn()
const mockSubscribe = jest.fn().mockReturnValue(mockSubscribeDispose)
useContext.mockImplementation(() => ({
  history: {
    length: 2,
    location: 'mockLocation',
    action: 'PUSH',
    index: 2,
    entries: 'mockEntries',
    foo: 'bar'
  },
  subscribe: mockSubscribe
}))

const ExampleComponent = () => {
  const history = useHistory()

  return <div>history value: "{JSON.stringify(history)}"</div>
}

jest.useFakeTimers()
jest.spyOn(global, 'setTimeout')

describe('useHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns current params correctly', () => {
    render(<ExampleComponent />)

    expect(screen.queryByText(/history value:/)).toHaveTextContent(
      'history value: "{"length":2,"location":"mockLocation","action":"PUSH","index":2,"entries":"mockEntries"}"'
    )
  })

  it('automatically updates params when receiving new entry from subscription', () => {
    render(<ExampleComponent />)

    expect(mockSubscribe).toHaveBeenCalledTimes(1)

    useContext.mockImplementationOnce(() => ({
      history: {
        length: 3,
        location: 'newMockLocation',
        action: 'POP',
        index: 3,
        entries: 'newMockEntries',
        foo: 'baz'
      },
      subscribe: mockSubscribe
    }))

    expect(setTimeout).not.toHaveBeenCalled()
    mockSubscribe.mock.calls[0][0]({ foo: 'bar' }) // trigger subscription
    expect(setTimeout).toHaveBeenCalledTimes(1)
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1)
    act(() => jest.runAllTimers()) // wait setTimeout

    expect(screen.queryByText(/history value:/)).toHaveTextContent(
      'history value: "{"length":3,"location":"newMockLocation","action":"POP","index":3,"entries":"newMockEntries"}"'
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
