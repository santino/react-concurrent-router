import SuspendableResource from '../SuspendableResource'

describe('SuspendableResource', () => {
  const mockLoader = jest.fn().mockImplementation(
    () =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve('Resource result')
        }, 500)
      })
  )

  beforeEach(() => {
    mockLoader.mockClear()
  })

  describe('initialisation', () => {
    it('correctly generates an instance with expected extrernal methods', () => {
      const resource = new SuspendableResource(mockLoader)

      expect(resource).toMatchObject({
        load: expect.any(Function),
        read: expect.any(Function)
      })
    })
  })

  describe('load', () => {
    it('returns internal _result when available', () => {
      const resource = new SuspendableResource(mockLoader)
      resource._result = 'mockResult'

      expect(resource.load()).toBe('mockResult')
      expect(mockLoader).not.toHaveBeenCalled()
    })

    it('returns internal _promise when this is available but _result is not', () => {
      const resource = new SuspendableResource(mockLoader)
      resource._promise = 'mockPromise'

      expect(resource.load()).toBe('mockPromise')
      expect(resource._result).toBe(null)
      expect(mockLoader).not.toHaveBeenCalled()
    })

    it('invokes loader function and updates internal _promise instance', () => {
      const resource = new SuspendableResource(mockLoader)

      expect(mockLoader).not.toHaveBeenCalled()
      expect(resource._promise).toBe(null)
      resource.load()
      expect(mockLoader).toHaveBeenCalledTimes(1)
      expect(mockLoader).toHaveBeenCalledWith()
      expect(resource._promise).not.toBe(null)
    })

    it('never invokes loader function more than once', () => {
      const resource = new SuspendableResource(mockLoader)
      resource.load()
      resource.load()
      resource.load()
      resource.load()
      resource.load()
      expect(mockLoader).toHaveBeenCalledTimes(1)
    })

    it('stores loader result in internal _result instance once promise resolves', done => {
      const resource = new SuspendableResource(mockLoader)
      resource.load()

      expect(resource._result).toBe(null)
      setTimeout(() => {
        expect(resource._result).toBe('Resource result')
        done()
      }, 500)
    })

    it('stores loader result.default in internal _result instance when passinng _isModule true', done => {
      const mockModule = {
        default: () => 'mockModule',
        instance: () => 'mockMethod'
      }
      mockLoader.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve(mockModule)
            }, 500)
          })
      )
      const resource = new SuspendableResource(mockLoader, true)
      resource.load()

      expect(resource._result).toBe(null)
      setTimeout(() => {
        expect(resource._result).toEqual(mockModule.default)
        done()
      }, 500)
    })

    it('stores loader result in internal _result instance when _isModule is true and result does not have "default" property', done => {
      const mockModule = {
        instanceOne: 'mockInstanceOne',
        instanceTwo: 'mockInstanceTwo'
      }
      mockLoader.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve(mockModule)
            }, 500)
          })
      )
      const resource = new SuspendableResource(mockLoader, true)
      resource.load()

      expect(resource._result).toBe(null)
      setTimeout(() => {
        expect(resource._result).toEqual({
          instanceOne: 'mockInstanceOne',
          instanceTwo: 'mockInstanceTwo'
        })
        done()
      }, 500)
    })

    it('stores loader result in internal _error instance when promise rejects', done => {
      mockLoader.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('Resource result'))
            }, 500)
          })
      )
      const resource = new SuspendableResource(mockLoader)

      expect(resource._result).toBe(null)
      expect(resource._error).toBe(null)
      resource.load()
      setTimeout(() => {
        expect(resource._result).toBe(null)
        expect(resource._error).toEqual(new Error('Resource result'))
        done()
      }, 500)
    })
  })

  describe('read', () => {
    it('initialises load if that has not been done before (no _promise)', () => {
      const resource = new SuspendableResource(mockLoader)
      jest.spyOn(resource, 'load')

      expect(resource._result).toBe(null)
      expect(resource._error).toBe(null)
      expect(resource._promise).toBe(null)
      expect(resource.load).not.toHaveBeenCalled()
      expect(() => {
        resource.read()
      }).toThrow()
      expect(resource._promise).not.toBe(null)
      expect(resource.load).toHaveBeenCalledTimes(1)
      expect(resource._result).toBe(null)
      expect(resource._error).toBe(null)
    })

    it('throws _promise when not null', () => {
      const resource = new SuspendableResource(mockLoader)
      resource._promise = 'mockPromise'
      jest.spyOn(resource, 'load')

      expect(resource._result).toBe(null)
      expect(resource._error).toBe(null)
      expect(resource._promise).toBe('mockPromise')

      expect(() => {
        resource.read()
      }).toThrow('mockPromise')
      expect(resource.load).not.toHaveBeenCalled()
    })

    it('throws _error when not null', () => {
      const resource = new SuspendableResource(mockLoader)
      resource._error = 'mockError'
      jest.spyOn(resource, 'load')

      expect(resource._result).toBe(null)
      expect(resource._error).toBe('mockError')
      expect(resource._promise).toBe(null)

      expect(() => {
        resource.read()
      }).toThrow('mockError')
      expect(resource.load).not.toHaveBeenCalled()
    })

    it('returns result when not null', () => {
      const resource = new SuspendableResource(mockLoader)
      resource._result = 'mockResult'
      jest.spyOn(resource, 'load')

      expect(resource._result).toBe('mockResult')
      expect(resource._error).toBe(null)
      expect(resource._promise).toBe(null)

      expect(resource.read()).toBe('mockResult')
      expect(resource.load).not.toHaveBeenCalled()
    })
  })
})
