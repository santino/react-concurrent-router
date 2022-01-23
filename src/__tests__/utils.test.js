import {
  getCanonicalPath,
  sortAndStringifyRequestParams,
  aggregateKeyValues,
  paramsStringToObject,
  routesToMap,
  locationsMatch,
  matchRegexRoute,
  prepareMatch,
  matchRoutes
} from '../utils'
import SuspendableResource from '../SuspendableResource'

jest.mock('../SuspendableResource', () =>
  jest.fn().mockImplementation(componentName => ({
    load: jest.fn(),
    read: jest.fn().mockReturnValue(`mock${componentName}`)
  }))
)

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCanonicalPath', () => {
    it('returns passed argument when it starts with "/"', () => {
      expect(getCanonicalPath('/')).toBe('/')
      expect(getCanonicalPath('/foo')).toBe('/foo')
    })

    it('prepends a leading slash to passed argument', () => {
      expect(getCanonicalPath('*')).toBe('/*')
      expect(getCanonicalPath('foo')).toBe('/foo')
      expect(getCanonicalPath(':userId')).toBe('/:userId')
    })
  })

  describe('sortAndStringifyRequestParams', () => {
    it('returns expected value on simple object', () => {
      expect(
        sortAndStringifyRequestParams({ foo: 'bar', qux: 'quux', baz: 'qux' })
      ).toBe('?baz=qux&foo=bar&qux=quux')
    })

    it('returns expected value on simple object with array values', () => {
      expect(
        sortAndStringifyRequestParams({
          corge: 'grault',
          foo: 'bar',
          qux: ['quux', 'quuz'],
          baz: 'qux'
        })
      ).toBe('?baz=qux&corge=grault&foo=bar&qux=quux,quuz')
    })
  })

  describe('aggregateKeyValues', () => {
    it('returns single value to non-present key', () => {
      expect(aggregateKeyValues({}, 'foo', 'bar')).toBe('bar')
    })

    it('returns array of values to key that had single value', () => {
      expect(aggregateKeyValues({ foo: 'bar' }, 'foo', 'baz')).toEqual([
        'bar',
        'baz'
      ])
    })

    it('appends value to existing array for given key', () => {
      expect(aggregateKeyValues({ foo: ['bar', 'baz'] }, 'foo', 'qux')).toEqual(
        ['bar', 'baz', 'qux']
      )
    })

    it('defaults to empty string when value is not passed in', () => {
      expect(aggregateKeyValues({}, 'foo')).toBe('')
    })

    it('decodes URI encoded values passed', () => {
      expect(aggregateKeyValues({}, 'foo', 'bar%20-%20baz')).toBe('bar - baz')

      expect(
        aggregateKeyValues({ foo: 'bar' }, 'foo', 'baz%20-%20qux')
      ).toEqual(['bar', 'baz - qux'])

      expect(
        aggregateKeyValues({ foo: ['bar', 'baz'] }, 'foo', 'qux%20-%20quux')
      ).toEqual(['bar', 'baz', 'qux - quux'])
    })
  })

  describe('locationSearchToObject', () => {
    it('returns empty object if no argument passed', () => {
      expect(paramsStringToObject()).toEqual({})
    })

    it('correctly transforms string of query params to object', () => {
      expect(paramsStringToObject('?foo=bar&baz=qux&quux=quuz')).toEqual({
        foo: 'bar',
        baz: 'qux',
        quux: 'quuz'
      })
    })

    it('correctly transforms string of query params to object with nested parameters', () => {
      expect(
        paramsStringToObject(
          '?foo=bar&baz=qux&quux=quuz&quux=corge&quux=grault'
        )
      ).toEqual({
        foo: 'bar',
        baz: 'qux',
        quux: ['quuz', 'corge', 'grault']
      })
    })
  })

  describe('routesToMap', () => {
    const originalWarn = console.warn

    beforeAll(() => {
      console.warn = jest.fn()
    })
    afterAll(() => {
      console.warn = originalWarn
    })

    it('Attaches new instance of SuspendableResource as route component', () => {
      const routes = [
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            { path: '*', component: 'NotFoundPage' }
          ]
        }
      ]
      const routesMap = routesToMap(routes)

      expect(SuspendableResource).toHaveBeenCalledTimes(3)
      expect(SuspendableResource).toHaveBeenNthCalledWith(1, 'HomePage', true)
      expect(SuspendableResource).toHaveBeenNthCalledWith(2, 'LoginPage', true)
      expect(SuspendableResource).toHaveBeenNthCalledWith(
        3,
        'NotFoundPage',
        true
      )
      expect(routesMap).toEqual(
        new Map([
          [
            '/',
            {
              component: {
                load: expect.any(Function),
                read: expect.any(Function)
              }
            }
          ],
          [
            '/login',
            {
              component: {
                load: expect.any(Function),
                read: expect.any(Function)
              }
            }
          ],
          [
            '/*',
            {
              component: {
                load: expect.any(Function),
                read: expect.any(Function)
              }
            }
          ]
        ])
      )
    })

    it('correctly transforms simple array of routes to Map', () => {
      const routes = [
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            { path: 'account', component: 'AccountPage' },
            { path: 'contacts', component: 'ContactsPage' },
            { path: '*', component: 'NotFoundPage' }
          ]
        }
      ]
      const expectedMap = new Map([
        [
          '/',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/login',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/contacts',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/*',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ]
      ])
      expect(routesToMap(routes)).toEqual(expectedMap)
    })

    it('warns about missing wildcard route in non-prod environment', () => {
      routesToMap([
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            { path: 'account', component: 'AccountPage' },
            { path: 'contacts', component: 'ContactsPage' }
          ]
        }
      ])
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /(?=.*wildcard)*\n?(?=.*route)*\n?(?=.*Not Found)*\n?(?=.*404)/
        )
      )
    })

    it('does not warn about missing wildcard route in Prod environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      routesToMap([
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            { path: 'account', component: 'AccountPage' },
            { path: 'contacts', component: 'ContactsPage' }
          ]
        }
      ])
      expect(console.warn).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv // restore original value
    })

    it('ignores children route not in array', () => {
      const routes = [
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            {
              path: 'account',
              component: 'AccountPage',
              children: { path: 'orders', component: 'OrdersPage' }
            },
            { path: 'contacts', component: 'ContactsPage' },
            { path: '*', component: 'NotFoundPage' }
          ]
        }
      ]
      const expectedMap = new Map([
        [
          '/',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/login',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/contacts',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/*',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ]
      ])
      expect(routesToMap(routes)).toEqual(expectedMap)
    })

    it('correctly transforms array of routes with nested children to Map', () => {
      const routes = [
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            {
              path: 'account',
              component: 'AccountPage',
              children: [
                {
                  path: 'orders',
                  component: 'OrdersPage',
                  children: [
                    {
                      path: ':orderId',
                      component: 'OrderPage',
                      children: [
                        { path: 'exchange', component: 'ExchangeOrderPage' }
                      ]
                    }
                  ]
                }
              ]
            },
            { path: 'contacts', component: 'ContactsPage' },
            { path: '*', component: 'NotFoundPage' }
          ]
        }
      ]
      const expectedMap = new Map([
        [
          '/',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/login',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account/orders',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account/orders/:orderId',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account/orders/:orderId/exchange',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/contacts',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/*',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ]
      ])
      expect(routesToMap(routes)).toEqual(expectedMap)
    })

    it('correctly merges group route properties to all children', () => {
      const routes = [
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            {
              path: 'account',
              redirectRules: 'authorisedAreaVerification',
              children: [
                { component: 'AccountPage' },
                {
                  path: 'orders',
                  component: 'OrdersPage',
                  children: [
                    {
                      path: ':orderId',
                      component: 'OrderPage',
                      children: [
                        { path: 'exchange', component: 'ExchangeOrderPage' }
                      ]
                    }
                  ]
                }
              ]
            },
            { path: 'contacts', component: 'ContactsPage' },
            { path: '*', component: 'NotFoundPage' }
          ]
        }
      ]
      const expectedMap = new Map([
        [
          '/',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/login',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/account/orders',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/account/orders/:orderId',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/account/orders/:orderId/exchange',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/contacts',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/*',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ]
      ])
      expect(routesToMap(routes)).toEqual(expectedMap)
    })

    it('overrides group route property when same name is explicitly declared on children', () => {
      const routes = [
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            {
              path: 'account',
              redirectRules: 'authorisedAreaVerification',
              children: [
                { component: 'AccountPage' },
                {
                  path: 'orders',
                  component: 'OrdersPage',
                  children: [
                    {
                      path: ':orderId',
                      component: 'OrderPage',
                      redirectRules: 'orderPageCustomVerification',
                      children: [
                        { path: 'exchange', component: 'ExchangeOrderPage' }
                      ]
                    }
                  ]
                }
              ]
            },
            { path: 'contacts', component: 'ContactsPage' },
            { path: '*', component: 'NotFoundPage' }
          ]
        }
      ]
      const expectedMap = new Map([
        [
          '/',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/login',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/account/orders',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/account/orders/:orderId',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'orderPageCustomVerification'
          }
        ],
        [
          '/account/orders/:orderId/exchange',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/contacts',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/*',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ]
      ])
      expect(routesToMap(routes)).toEqual(expectedMap)
    })

    it('stops merging group propertes when setting a new artificial group route', () => {
      const routes = [
        {
          path: '/',
          component: 'HomePage',
          children: [
            { path: 'login', component: 'LoginPage' },
            {
              path: 'account',
              redirectRules: 'authorisedAreaVerification',
              children: [
                { component: 'AccountPage' },
                {
                  path: 'orders',
                  component: 'OrdersPage',
                  children: [
                    {
                      path: ':orderId', // set a new group but without properties to be merged
                      children: [
                        {
                          component: 'OrderPage',
                          children: [
                            { path: 'exchange', component: 'ExchangeOrderPage' }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            { path: 'contacts', component: 'ContactsPage' },
            { path: '*', component: 'NotFoundPage' }
          ]
        }
      ]
      const expectedMap = new Map([
        [
          '/',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/login',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/account/orders',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            },
            redirectRules: 'authorisedAreaVerification'
          }
        ],
        [
          '/account/orders/:orderId',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/account/orders/:orderId/exchange',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/contacts',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ],
        [
          '/*',
          {
            component: {
              load: expect.any(Function),
              read: expect.any(Function)
            }
          }
        ]
      ])
      expect(routesToMap(routes)).toEqual(expectedMap)
    })
  })

  describe('locationsMatch', () => {
    it('performs correctly non-exact matches with positive result', () => {
      expect(locationsMatch('/foo/bar', '/foo/bar')).toBe(true)
      expect(locationsMatch('/foo/bar?id=123', '/foo/bar?id=456')).toBe(true)
      expect(locationsMatch('/foo/bar#abc', '/foo/bar#def')).toBe(true)
      expect(locationsMatch('/foo/bar?id=123#abc', '/foo/bar?id=456#def')).toBe(
        true
      )

      expect(
        locationsMatch({ pathname: '/foo/bar' }, { pathname: '/foo/bar' })
      ).toBe(true)
      expect(
        locationsMatch(
          { search: '?id=123', pathname: '/foo/bar' },
          { search: '?id=456', pathname: '/foo/bar' }
        )
      ).toBe(true)
      expect(
        locationsMatch(
          { hash: '#abc', pathname: '/foo/bar' },
          { hash: '#def', pathname: '/foo/bar' }
        )
      ).toBe(true)
      expect(
        locationsMatch(
          { hash: '#abc', search: '?id=123', pathname: '/foo/bar' },
          { hash: '#def', search: '?id=456', pathname: '/foo/bar' }
        )
      ).toBe(true)
    })

    it('performs correctly non-exact matches with negative result', () => {
      expect(locationsMatch('/foo/bar', '/foo/baz')).toBe(false)
      expect(locationsMatch('/foo/bar?id=123', '/foo/baz?id=123')).toBe(false)
      expect(locationsMatch('/foo/bar#abc', '/foo/baz#abc')).toBe(false)
      expect(locationsMatch('/foo/bar?id=123#abc', '/foo/baz?id=123#abc')).toBe(
        false
      )

      expect(
        locationsMatch({ pathname: '/foo/bar' }, { pathname: '/foo/baz' })
      ).toBe(false)
      expect(
        locationsMatch(
          { search: '?id=123', pathname: '/foo/bar' },
          { search: '?id=123', pathname: '/foo/baz' }
        )
      ).toBe(false)
      expect(
        locationsMatch(
          { hash: '#abc', pathname: '/foo/bar' },
          { hash: '#abc', pathname: '/foo/baz' }
        )
      ).toBe(false)
      expect(
        locationsMatch(
          { hash: '#abc', search: '?id=123', pathname: '/foo/bar' },
          { hash: '#abc', search: '?id=123', pathname: '/foo/baz' }
        )
      ).toBe(false)
    })

    it('performs correctly exact matches with positive result', () => {
      expect(locationsMatch('/foo/bar', '/foo/bar', true)).toBe(true)
      expect(locationsMatch('/foo/bar?id=123', '/foo/bar?id=123', true)).toBe(
        true
      )
      expect(locationsMatch('/foo/bar#abc', '/foo/bar#abc', true)).toBe(true)
      expect(
        locationsMatch('/foo/bar?id=123#abc', '/foo/bar?id=123#abc', true)
      ).toBe(true)

      expect(
        locationsMatch({ pathname: '/foo/bar' }, { pathname: '/foo/bar' }, true)
      ).toBe(true)
      expect(
        locationsMatch(
          { search: '?id=123', pathname: '/foo/bar' },
          { search: '?id=123', pathname: '/foo/bar' },
          true
        )
      ).toBe(true)
      expect(
        locationsMatch(
          { hash: '#abc', pathname: '/foo/bar' },
          { hash: '#abc', pathname: '/foo/bar' },
          true
        )
      ).toBe(true)
      expect(
        locationsMatch(
          { hash: '#abc', search: '?id=123', pathname: '/foo/bar' },
          { hash: '#abc', search: '?id=123', pathname: '/foo/bar' },
          true
        )
      ).toBe(true)
    })

    it('performs correctly exact matches with negative result', () => {
      expect(locationsMatch('/foo/bar', '/foo/baz', true)).toBe(false)
      expect(locationsMatch('/foo/bar?id=123', '/foo/bar?id=1234', true)).toBe(
        false
      )
      expect(locationsMatch('/foo/bar#abc', '/foo/bar#abcd', true)).toBe(false)
      expect(
        locationsMatch('/foo/bar?id=123#abc', '/foo/bar?id=123#abcd', true)
      ).toBe(false)
      expect(
        locationsMatch('/foo/bar?id=123#abc', '/foo/bar?id=1234#abc', true)
      ).toBe(false)

      expect(
        locationsMatch({ pathname: '/foo/bar' }, { pathname: '/foo/baz' }, true)
      ).toBe(false)
      expect(
        locationsMatch(
          { search: '?id=123', pathname: '/foo/bar' },
          { search: '?id=1234', pathname: '/foo/bar' },
          true
        )
      ).toBe(false)
      expect(
        locationsMatch(
          { hash: '#abc', pathname: '/foo/bar' },
          { hash: '#abcd', pathname: '/foo/bar' },
          true
        )
      ).toBe(false)
      expect(
        locationsMatch(
          { hash: '#abc', search: '?id=123', pathname: '/foo/bar' },
          { hash: '#abcd', search: '?id=123', pathname: '/foo/bar' },
          true
        )
      ).toBe(false)
      expect(
        locationsMatch(
          { hash: '#abc', search: '?id=123', pathname: '/foo/bar' },
          { hash: '#abc', search: '?id=1234', pathname: '/foo/bar' },
          true
        )
      ).toBe(false)
    })
  })

  describe('matchRegexRoute', () => {
    it('matches correctly when expecting positive result', () => {
      expect(matchRegexRoute('/path/:param', '/path/foo')).toEqual({
        params: { param: 'foo' }
      })
      expect(matchRegexRoute('/:foo/:bar', '/path/subpath')).toEqual({
        params: { foo: 'path', bar: 'subpath' }
      })
      expect(
        matchRegexRoute('/:attr1-:attr2-:attr3', '/test1-test2-test3')
      ).toEqual({
        params: { attr1: 'test1', attr2: 'test2', attr3: 'test3' }
      })
      expect(matchRegexRoute('/:foo/*', '/test/route')).toEqual({
        params: { foo: 'test', rest: 'route' }
      })
      expect(matchRegexRoute('/:foo/*', '/test/route/child')).toEqual({
        params: { foo: 'test', rest: 'route/child' }
      })
      expect(matchRegexRoute('/:foo/*/*', '/test/route/child')).toEqual({
        params: { foo: 'test', rest: ['route', 'child'] }
      })
      expect(matchRegexRoute('/:foo*', '/bar/baz')).toEqual({
        params: { foo: 'bar', rest: '/baz' }
      })
      expect(
        matchRegexRoute('/:foo/file/prefix-*.*', '/bar/file/prefix-baz.js')
      ).toEqual({
        params: { foo: 'bar', rest: ['baz', 'js'] }
      })
      expect(
        matchRegexRoute(
          '/:foo/file/prefix-*.:extension',
          '/bar/file/prefix-baz.js'
        )
      ).toEqual({
        params: { foo: 'bar', extension: 'js', rest: 'baz' }
      })
      expect(
        matchRegexRoute(
          '/search/:tableName?useIndex=true&term=amazing',
          '/search/people?useIndex=true&term=amazing'
        )
      ).toEqual({
        params: { tableName: 'people' }
      })
    })

    it('matches correctly when expecting negative result', () => {
      expect(matchRegexRoute('/path/subpath', '/path/sub-path')).toEqual(null)
      expect(matchRegexRoute('/path/:param', '/path/foo/bar')).toEqual(null)
      expect(matchRegexRoute('/:foo/:bar', '/path/subpath/subsubpath')).toEqual(
        null
      )
      expect(
        matchRegexRoute('/:attr1-:attr2-:attr3', '/test1/test2/test3')
      ).toEqual(null)
      expect(matchRegexRoute('/:foo/file/*.js', '/bar/file/baz.jsx')).toEqual(
        null
      )
      expect(
        matchRegexRoute(
          '/search/:tableName?useIndex=true&term=amazing',
          '/search/people?term=amazing&useIndex=true'
        )
      ).toEqual(null)
    })
  })

  describe('matchRoutes', () => {
    const routesMap = new Map([
      ['/', { component: 'HomePage' }],
      ['/login', { component: 'LoginPage' }],
      [
        '/account',
        {
          component: 'AccountPage',
          redirectRules: jest.fn().mockReturnValue('/login')
        }
      ],
      [
        '/account/orders',
        {
          component: 'OrdersPage'
        }
      ],
      [
        '/account/orders/:orderId',
        {
          component: 'OrderPage'
        }
      ],
      [
        '/account/orders/:orderId/exchange',
        {
          component: 'ExchangeOrderPage'
        }
      ],
      ['/contacts', { component: 'ContactsPage' }],
      ['/*', { component: 'NotFoundPage' }]
    ])

    it('matches pathname only', () => {
      expect(matchRoutes(routesMap, '/account/orders')).toEqual({
        location: { pathname: '/account/orders' },
        params: {},
        route: { component: 'OrdersPage' }
      })
    })

    it('matches pathname with query params', () => {
      expect(matchRoutes(routesMap, '/account/orders?foo=bar&baz=qux')).toEqual(
        {
          location: { pathname: '/account/orders', search: '?foo=bar&baz=qux' },
          params: { foo: 'bar', baz: 'qux' },
          route: { component: 'OrdersPage' }
        }
      )
    })

    it('matches pathname with hash params', () => {
      expect(matchRoutes(routesMap, '/account/orders#foo')).toEqual({
        location: { pathname: '/account/orders', hash: '#foo' },
        params: {},
        route: { component: 'OrdersPage' }
      })
    })

    it('matches pathname with both query and hash params', () => {
      expect(matchRoutes(routesMap, '/account/orders?foo=bar#baz')).toEqual({
        location: {
          pathname: '/account/orders',
          search: '?foo=bar',
          hash: '#baz'
        },
        params: { foo: 'bar' },
        route: { component: 'OrdersPage' }
      })
    })

    it('matches location with both query and hash params', () => {
      expect(
        matchRoutes(routesMap, {
          pathname: '/account/orders',
          search: '?foo=bar',
          hash: '#baz'
        })
      ).toEqual({
        location: {
          pathname: '/account/orders',
          search: '?foo=bar',
          hash: '#baz'
        },
        params: { foo: 'bar' },
        route: { component: 'OrdersPage' }
      })
    })

    it('matches pathname with named params', () => {
      expect(matchRoutes(routesMap, '/account/orders/123')).toEqual({
        location: { pathname: '/account/orders/123' },
        params: { orderId: '123' },
        route: { component: 'OrderPage' }
      })
    })

    it('applies correctly redirectRules when available', () => {
      expect(matchRoutes(routesMap, '/account?foo=bar')).toEqual({
        location: { pathname: '/login' },
        params: {},
        route: { component: 'LoginPage' }
      })

      expect(routesMap.get('/account').redirectRules).toHaveBeenCalledTimes(1)
      expect(routesMap.get('/account').redirectRules).toHaveBeenCalledWith({
        foo: 'bar'
      })
    })

    it('ignores redirectRules when "ignoreRedirectRules" is true', () => {
      expect(matchRoutes(routesMap, '/account?foo=bar', true)).toEqual({
        location: { pathname: '/account', search: '?foo=bar' },
        params: { foo: 'bar' },
        route: {
          component: 'AccountPage',
          redirectRules: routesMap.get('/account').redirectRules
        }
      })

      expect(routesMap.get('/account').redirectRules).not.toHaveBeenCalled()
    })

    it('matches wildcard (*) route when pathname is not found', () => {
      expect(matchRoutes(routesMap, '/myAccount/purchases')).toEqual({
        location: { pathname: '/myAccount/purchases' },
        params: {},
        route: { component: 'NotFoundPage' }
      })
    })

    it('returns null when pathname is not found and no wildcard is provided', () => {
      routesMap.delete('/*') // remove the wildcard route
      expect(matchRoutes(routesMap, '/myAccount/purchases')).toBe(null)
    })
  })

  describe('prepareMatch', () => {
    it("behaves as expected when we don't have data to prefetch", () => {
      const match = {
        route: {
          component: { load: jest.fn() }
        },
        params: {},
        location: 'matchedLocation'
      }
      const preparedMatch = prepareMatch(match, false, false)

      expect(match.route.component.load).toHaveBeenCalledTimes(1)
      expect(match.route.component.load).toHaveBeenCalledWith()
      expect(preparedMatch).toEqual({
        component: match.route.component,
        location: match.location,
        params: match.params
      })
    })

    it('behaves as expected when we have data to prefetch', () => {
      const match = {
        route: {
          prefetch: jest.fn().mockReturnValue('prefetchedData'),
          component: { load: jest.fn() }
        },
        params: { foo: 'bar' },
        location: 'matchedLocation'
      }
      const preparedMatch = prepareMatch(match)

      expect(match.route.component.load).toHaveBeenCalledTimes(1)
      expect(match.route.component.load).toHaveBeenCalledWith()
      expect(match.route.prefetch).toHaveBeenCalledTimes(1)
      expect(match.route.prefetch).toHaveBeenCalledWith(match.params)

      expect(preparedMatch).toEqual({
        component: match.route.component,
        location: match.location,
        params: match.params,
        prefetched: 'prefetchedData'
      })
    })

    it('behaves as expected when assistPrefetch is true but no prefetch', () => {
      const match = {
        route: {
          component: { load: jest.fn() }
        },
        params: { foo: 'bar' },
        location: { pathname: 'matchedLocationNoPrefetch' }
      }
      const preparedMatch = prepareMatch(match, true)

      expect(match.route.component.load).toHaveBeenCalledTimes(1)
      expect(match.route.component.load).toHaveBeenCalledWith()

      expect(preparedMatch).toEqual({
        component: match.route.component,
        location: match.location,
        params: match.params
      })
    })

    it('behaves as expected when assistPrefetch is true', () => {
      const match = {
        route: {
          prefetch: jest.fn().mockReturnValue({
            foo: () => 'prefetchedFoo',
            bar: { defer: false, data: () => 'prefetchedBar' }
          }),
          component: { load: jest.fn() }
        },
        params: { foo: 'bar' },
        location: { pathname: 'matchedLocation' }
      }
      const preparedMatch = prepareMatch(match, true)

      expect(match.route.prefetch).toHaveBeenCalledTimes(1)
      expect(match.route.prefetch).toHaveBeenCalledWith(match.params)
      expect(match.route.component.load).toHaveBeenCalledTimes(1)
      expect(match.route.component.load).toHaveBeenCalledWith()

      expect(preparedMatch).toEqual({
        component: match.route.component,
        location: match.location,
        params: match.params,
        prefetched: new Map([
          [
            'foo',
            {
              defer: true,
              data: { load: expect.any(Function), read: expect.any(Function) }
            }
          ],
          [
            'bar',
            {
              defer: false,
              data: { load: expect.any(Function), read: expect.any(Function) }
            }
          ]
        ])
      })

      expect(
        preparedMatch.prefetched.get('bar').data.load
      ).toHaveBeenCalledTimes(1)
      expect(
        preparedMatch.prefetched.get('bar').data.load
      ).toHaveBeenCalledWith()
      expect(
        preparedMatch.prefetched.get('foo').data.load
      ).toHaveBeenCalledTimes(1)
      expect(
        preparedMatch.prefetched.get('foo').data.load
      ).toHaveBeenCalledWith()
    })

    it('behaves as expected when both assistPrefetch and awaitPrefetch are true', () => {
      const match = {
        route: {
          prefetch: jest.fn().mockReturnValue({
            foo: { defer: true, data: () => 'prefetchedFoo' },
            bar: () => 'prefetchedBar'
          }),
          component: { load: jest.fn() }
        },
        params: { foo: 'bar', baz: 'qux' },
        location: { pathname: 'matchedLocation' }
      }
      const preparedMatch = prepareMatch(match, true, true)

      expect(match.route.prefetch).toHaveBeenCalledTimes(1)
      expect(match.route.prefetch).toHaveBeenCalledWith(match.params)
      expect(match.route.component.load).toHaveBeenCalledTimes(1)
      expect(match.route.component.load).toHaveBeenCalledWith()

      expect(preparedMatch).toEqual({
        component: match.route.component,
        location: match.location,
        params: match.params,
        prefetched: new Map([
          [
            'foo',
            {
              defer: true,
              data: { load: expect.any(Function), read: expect.any(Function) }
            }
          ],
          [
            'bar',
            {
              defer: false,
              data: { load: expect.any(Function), read: expect.any(Function) }
            }
          ]
        ])
      })

      expect(
        preparedMatch.prefetched.get('bar').data.load
      ).toHaveBeenCalledTimes(1)
      expect(
        preparedMatch.prefetched.get('bar').data.load
      ).toHaveBeenCalledWith()
      expect(
        preparedMatch.prefetched.get('foo').data.load
      ).toHaveBeenCalledTimes(1)
      expect(
        preparedMatch.prefetched.get('foo').data.load
      ).toHaveBeenCalledWith()
    })

    it('return cached match when route is same as last and assistPrefetch is true', () => {
      const match = {
        route: {
          prefetch: jest.fn().mockReturnValue({
            foo: { defer: true, data: () => 'prefetchedFoo' },
            bar: () => 'prefetchedBar'
          }),
          component: { load: jest.fn() }
        },
        params: { foo: 'bar', baz: 'qux' },
        location: { pathname: 'matchedLocation' }
      }
      const preparedMatch = prepareMatch(match, true, true)

      expect(match.route.prefetch).not.toHaveBeenCalled()
      expect(match.route.component.load).not.toHaveBeenCalled()

      expect(preparedMatch).toEqual({
        component: { load: expect.any(Function) },
        location: match.location,
        params: { baz: 'qux', foo: 'bar' },
        prefetched: new Map([
          [
            'foo',
            {
              data: { load: expect.any(Function), read: expect.any(Function) },
              defer: true
            }
          ],
          [
            'bar',
            {
              data: { load: expect.any(Function), read: expect.any(Function) },
              defer: false
            }
          ]
        ])
      })

      expect(
        preparedMatch.prefetched.get('bar').data.load
      ).not.toHaveBeenCalled()
    })
  })
})
