import { useContext } from 'react'
import RouterContext from '../RouterContext'
import useRouter from '../useRouter'

jest.mock('react')
useContext.mockImplementation(() => ({
  history: 'mockHistory',
  isActive: 'mockIsActive',
  get: 'mockGet',
  preloadCode: 'mockPreloadCode',
  warmRoute: 'mockWarmRoute',
  subscribe: 'mockSubscribe'
}))

describe('useRouter', () => {
  it('exports an object with expected properties from RouterContext', () => {
    const router = useRouter()

    expect(useContext).toHaveBeenCalledTimes(1)
    expect(useContext).toHaveBeenCalledWith(RouterContext)
    expect(router).toEqual(expect.any(Object))
    expect(router).toEqual({
      isActive: 'mockIsActive',
      preloadCode: 'mockPreloadCode',
      warmRoute: 'mockWarmRoute'
    })
  })
})
