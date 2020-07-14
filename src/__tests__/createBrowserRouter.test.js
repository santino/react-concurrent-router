import { createBrowserHistory } from 'history'
import createRouter from '../createRouter'

import createBrowserRouter from '../createBrowserRouter'

jest.mock('history')
jest.mock('../createRouter')
createBrowserHistory.mockReturnValue('BrowserHistory')

describe('createBrowserRouter', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('throws when initialised with no arguments', () => {
    expect(() => {
      createBrowserRouter()
    }).toThrow('')
  })

  it('passes only "window" property to createBrowserHistory and other properties to createRouter', () => {
    const routes = ['foo', 'bar']
    createBrowserRouter({ routes, baz: 'qux', quux: 'quuz', window: 'iframe' })

    expect(createRouter).toHaveBeenCalledTimes(1)
    expect(createBrowserHistory).toHaveBeenCalledTimes(1)
    expect(createBrowserHistory).toHaveBeenCalledWith({ window: 'iframe' })
    expect(createRouter).toHaveBeenCalledWith({
      routes,
      baz: 'qux',
      quux: 'quuz',
      history: 'BrowserHistory'
    })
  })
})
