import React from 'react'
import { render } from '@testing-library/react'

import RouterContext from '../RouterContext'
import useBeforeRouteLeave from '../useBeforeRouteLeave'

jest.spyOn(window, 'addEventListener')
jest.spyOn(window, 'removeEventListener')
const mockHistoryUnblock = jest.fn()
const mockHistoryBlock = jest.fn().mockImplementation(() => mockHistoryUnblock)
const mockRouterContextValue = { history: { block: mockHistoryBlock } }

const Component = props => {
  useBeforeRouteLeave(props)
  return <div>Component subscribed to useBeforeRouteLeave</div>
}

const wrap = (props = {}) =>
  render(
    <RouterContext.Provider value={mockRouterContextValue}>
      <Component {...props} />
    </RouterContext.Provider>
  )

describe('useBeforeRouteLeave', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('attaches expected handler to "beforeunload" event', () => {
    const mockEvent = { preventDefault: jest.fn(), returnValue: 'foo' }
    const { unmount } = wrap()
    const beforeunloadAddedListener = window.addEventListener.mock.calls.filter(
      call => call[0] === 'beforeunload'
    )

    expect(beforeunloadAddedListener).toHaveLength(1) // listener should be added only once
    expect(beforeunloadAddedListener[0]).toEqual([
      'beforeunload',
      expect.any(Function)
    ])
    expect(
      window.removeEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(0)

    beforeunloadAddedListener[0][1](mockEvent)
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)
    expect(mockEvent.preventDefault).toHaveBeenCalledWith()
    expect(mockEvent.returnValue).toBe('')

    unmount()
    const beforeunloadRemovedListener = window.addEventListener.mock.calls.filter(
      call => call[0] === 'beforeunload'
    )
    expect(beforeunloadRemovedListener).toHaveLength(1) // listener should be removed only once
    expect(beforeunloadRemovedListener[0]).toEqual([
      'beforeunload',
      beforeunloadAddedListener[0][1]
    ])
  })

  it('does not attach handler to "beforeunload" event when unload prop is set to false', () => {
    const { unmount } = wrap({ unload: false })

    expect(
      window.addEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(0)

    unmount()

    expect(
      window.removeEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(0)
  })

  it('triggers history "block" when attempting to navigate away', () => {
    const { unmount } = wrap({ message: "don't leave me" })

    expect(mockHistoryBlock).toHaveBeenCalledTimes(1)
    expect(mockHistoryBlock).toHaveBeenCalledWith("don't leave me")

    unmount()

    expect(mockHistoryUnblock).toHaveBeenCalledTimes(1)
    expect(mockHistoryUnblock).toHaveBeenCalledWith()
  })

  it('attaches and removes listeners correctly when updating value of "toggle" prop', () => {
    const { rerender } = wrap({ toggle: false })

    expect(mockHistoryBlock).not.toHaveBeenCalled()
    expect(
      window.addEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(0)
    expect(mockHistoryUnblock).not.toHaveBeenCalled()
    expect(
      window.removeEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(0)

    rerender(
      <RouterContext.Provider value={mockRouterContextValue}>
        <Component toggle />
      </RouterContext.Provider>
    )

    expect(mockHistoryBlock).toHaveBeenCalledTimes(1)
    expect(
      window.addEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(1)
    expect(mockHistoryUnblock).not.toHaveBeenCalled()
    expect(
      window.removeEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(0)

    rerender(
      <RouterContext.Provider value={mockRouterContextValue}>
        <Component toggle={false} />
      </RouterContext.Provider>
    )

    expect(mockHistoryBlock).toHaveBeenCalledTimes(1)
    expect(
      window.addEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(1)
    expect(mockHistoryUnblock).toHaveBeenCalledTimes(1)
    expect(
      window.removeEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
    ).toHaveLength(1)
  })
})
