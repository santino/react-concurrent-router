import { useContext } from 'react'
import RouterContext from '../RouterContext'
import useNavigation from '../useNavigation'

jest.mock('react')
useContext.mockImplementation(() => ({
  history: {
    push: 'mockPush',
    replace: 'mockReplace',
    go: 'mockGo',
    goBack: 'mockGoBack',
    goForward: 'mockGoForward',
    canGo: 'mockCanGo',
    foo: 'bar'
  },
  baz: 'qux'
}))

describe('useNavigation', () => {
  it('exports an object with expected properties from RouterContext', () => {
    const navigation = useNavigation()

    expect(useContext).toHaveBeenCalledTimes(1)
    expect(useContext).toHaveBeenCalledWith(RouterContext)
    expect(navigation).toEqual(expect.any(Object))
    expect(navigation).toEqual({
      push: 'mockPush',
      replace: 'mockReplace',
      go: 'mockGo',
      goBack: 'mockGoBack',
      goForward: 'mockGoForward',
      canGo: 'mockCanGo'
    })
  })
})
