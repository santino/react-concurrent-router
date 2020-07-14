import { createHashHistory } from 'history'
import createRouter from '../createRouter'

import createHashRouter from '../createHashRouter'

jest.mock('history')
jest.mock('../createRouter')
createHashHistory.mockReturnValue('HashHistory')

describe('createHashRouter', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('throws when initialised with no arguments', () => {
    expect(() => {
      createHashRouter()
    }).toThrow('')
  })

  it('passes only "window" property to createHashHistory and other properties to createRouter', () => {
    const routes = ['foo', 'bar']
    createHashRouter({ routes, baz: 'qux', quux: 'quuz', window: 'iframe' })

    expect(createRouter).toHaveBeenCalledTimes(1)
    expect(createHashHistory).toHaveBeenCalledTimes(1)
    expect(createHashHistory).toHaveBeenCalledWith({ window: 'iframe' })
    expect(createRouter).toHaveBeenCalledWith({
      routes,
      baz: 'qux',
      quux: 'quuz',
      history: 'HashHistory'
    })
  })
})
