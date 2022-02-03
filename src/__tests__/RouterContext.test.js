import { createContext } from 'react'
import RouterContext from '../RouterContext'

describe('RouterContext', () => {
  it('exports react context as expected', () => {
    const expectedContext = createContext(null)
    expect(RouterContext).toEqual(expectedContext)
  })
})
