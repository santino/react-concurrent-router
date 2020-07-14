import { createMemoryHistory } from 'history'
import createRouter from '../createRouter'

import createMemoryRouter from '../createMemoryRouter'

jest.mock('history')
jest.mock('../createRouter')
createMemoryHistory.mockReturnValue('MemoryHistory')

describe('createMemoryRouter', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('throws when initialised with no arguments', () => {
    expect(() => {
      createMemoryRouter()
    }).toThrow('')
  })

  it('passes only "initialEntries" and "initialIndex" properties to createMemoryHistory and other properties to createRouter', () => {
    const routes = ['foo', 'bar']
    createMemoryRouter({
      routes,
      baz: 'qux',
      quux: 'quuz',
      initialEntries: ['/'],
      initialIndex: '/'
    })

    expect(createRouter).toHaveBeenCalledTimes(1)
    expect(createMemoryHistory).toHaveBeenCalledTimes(1)
    expect(createMemoryHistory).toHaveBeenCalledWith({
      initialEntries: ['/'],
      initialIndex: '/'
    })
    expect(createRouter).toHaveBeenCalledWith({
      routes,
      baz: 'qux',
      quux: 'quuz',
      history: 'MemoryHistory'
    })
  })
})
