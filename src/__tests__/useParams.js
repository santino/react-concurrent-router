import { useContext } from 'react'
import RouterContext from '../RouterContext'
import useParams from '../useParams'

jest.mock('react')
useContext.mockImplementation(() => ({
  get: jest.fn().mockReturnValue({ params: { foo: 'bar', baz: 'qux' } })
}))

describe('useParams', () => {
  it('exports an object with expected route params from RouterContext', () => {
    const params = useParams()

    expect(useContext).toHaveBeenCalledTimes(1)
    expect(useContext).toHaveBeenCalledWith(RouterContext)
    expect(params).toEqual(expect.any(Object))
    expect(params).toEqual({
      foo: 'bar',
      baz: 'qux'
    })
  })
})
