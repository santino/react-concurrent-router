/**
 * A generic resource: given some method to asynchronously load a value (the loader function
 * argument) it allows accessing the state of the resource.
 * It handle requests in a way that integrates natively with React Suspense.
 */
class SuspendableResource {
  constructor (loader, isModule = false) {
    this._isModule = isModule
    this._loader = loader
    this._promise = null
    this._result = null
    this._error = null
  }

  /**
   * Triggers loading of the resource.
   * Will check if we already have a result; could happen when router triggers load during route
   * warming and this resolves before triggering the second load when committing navigation action.
   * Also checks if we already have a promise; in case load had already been invoked on the resource.
   * This effectively ensures we don't dispatch multiple network requests to fetch the resource.
   */
  load = () => {
    if (this._result) return this._result // we have already a result, nothing else to do
    if (this._promise) return this._promise // we have already set a promise, hence initialised loading

    this._promise = this._loader()
      .then(result => {
        // if a js module has default export, we return that
        const returnValue = this._isModule ? result.default || result : result
        this._result = returnValue
        return this._result
      })
      .catch(error => {
        this._error = error
      })

    return this._promise
  }

  // tells if the component has already been loaded; hence is available
  isLoaded = () => Boolean(this._result)

  /**
   * This is the key method for integrating with React Suspense. Read will:
   * - "Suspend" if the resource loading has not been triggered or is still pending
   * - Throw an error if the resource failed to load
   * - Return the data of the resource if available
   */
  read = () => {
    if (this._result) return this._result
    if (this._error) throw this._error
    if (this._promise) throw this._promise

    // we don't expect reaching this line since the router should always initialise 'load' before
    // attempting to 'read'. Should aything go wrong we will initialise 'load' here which returns the promise
    throw this.load()
  }
}

export default SuspendableResource
