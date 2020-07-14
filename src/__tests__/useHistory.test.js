import { useContext } from 'react'
import RouterContext from '../RouterContext'
import useHistory from '../useHistory'

jest.mock('react')
useContext.mockImplementation(() => ({
  history: {
    length: 2,
    location: 'mockLocation',
    action: 'PUSH',
    index: 2,
    entries: 'mockEntries',
    foo: 'bar'
  },
  baz: 'qux'
}))

describe('useHistory', () => {
  it('exports an object with expected properties from RouterContext', () => {
    const history = useHistory()

    expect(useContext).toHaveBeenCalledTimes(1)
    expect(useContext).toHaveBeenCalledWith(RouterContext)
    expect(history).toEqual(expect.any(Object))
    expect(history).toEqual({
      length: 2,
      location: 'mockLocation',
      action: 'PUSH',
      index: 2,
      entries: 'mockEntries'
    })
  })
})
