var StateEventEmitter = require('./state-eventemitter').StateEventEmitter;

/**
 * A Promise/A compatible implementation of promise.
 * @extends {StateEventEmitter}
 *
 * ```js
 * var promise = new Promise();
 * promise.resolve('hello');
 * promise.then(function(data) {
 *   console.log(data);
 * });
 * ```
 *
 * 3 possible states : `progress`, `resolved`, `rejected`.
 *
 * @event progress [args] - emitted when progress is called
 * @event resolved [args] - emitted when promise is resolved (called once)
 * @event rejected [args] - emitted when promise is rejected (called once)
 *
 */
var Promise = function() {
  StateEventEmitter.call(this);

  promiseLazyInit(this);

  if (arguments.length > 0) {
    this.then.apply(this, arguments);
  }
};

exports.Promise = Promise;

var promiseLazyInit = function(promise) {
  if(!promise.state || promise.state === null)
    promise.setStateSilently('progress');

  // reate the events
  promise.on('progress');
  promise.on('resolved');
  promise.on('rejected');
};

Promise.prototype = {
  /**
   * Attach (callback, errback and progress) functions.
   *
   * Takes the argument provided in the according #resolve, #reject, #progress
   * methods.
   *
   * ```js
   * promise.then(obj.ok, obj.notok, obj);
   * ```
   *
   * @param  {Function} callback   - called for resolve
   * @param  {Function} [errback]  - called for reject
   * @param  {Function} [progress] - called for progress
   * @param  {Object}   [context]  - last argument is always the context
   *
   * @return {this}
   */
  then: function(callback, errback, progress, context) {
    context = arguments[arguments.length - 1];
    if (typeof context === 'function')
      context = this;

    this.addCallback(callback, context)
        .addErrback(errback,   context)
        .addProgress(progress, context);

    return this;
  },

  /**
   * Like #then but instead return a new promise to allow piping as in chain,
   * where the resolved (respectively rejected) argument is the value returned
   * by the provided callback (respectively errback).
   *
   * ```js
   * new Promise()
   *     .resolve(1)
   *     .pipe(function(num) {
   *       return num + 1;
   *     }).then(function(res) {
   *       console.log(res)
   *     });
   * // in console : "2"
   * ```
   *
   * Flow switching
   * --------------
   *   It's possible to switch resolve/reject flow in the returned promise.
   *
   *   resolve -> reject:
   *     If callback returns an intances of Error, the returned promise is 
   *     rejected with the returned error as argument.
   *
   *   reject -> resolve:
   *     In opposite, if the errback returns something (!=undefined), that is
   *     not an instance of Error, the returned promise is resolved with the
   *     returned variable as argument.
   *
   * ```js
   * new Promise()
   *     .resolve(1)
   *     .pipe(function(num) {
   *       return new Error('hi');
   *     }).addErrback(function(err) {
   *       console.log(err)
   *     });
   * // in console : "Error: hi"
   * ```
   *
   * @param  {Function} callback   - called for resolve
   * @param  {Function} [errback]  - called for reject
   * @param  {Function} [progress] - called for progress
   * @param  {Object}   [context]  - last argument is always the context
   *
   * @return {this}
   */
  pipe: function() {
    var promise  = new Promise(),
        callbacks = arguments,
        context   = arguments[arguments.length - 1];

    if (typeof context === 'function')
      context = this;

    var pipes = ['resolve', 'reject', 'progress'].map(function(action, index) {
      return (typeof callbacks[index] === 'function') ? function() {
        var returned = callbacks[index].apply(context, arguments);
        if (typeof returned === 'undefined') {
          promise[action]();
        } else if (Promise.isPromise(returned)) {
          returned.then(promise.resolve,
                        promise.reject,
                        promise.progress,
                        promise);
        } else if (action !== 'progress') {
          if (returned instanceof Error) {
            promise.reject(returned);
          } else {
            promise.resolve(returned);
          }
        } else {
          promise[action](returned);
        }
      } : function() {
        promise[action].apply(promise, arguments);
      }
      ;
    });

    this.then.apply(this, pipes);
    return promise;
  },

  /**
   * Add a callback that will be called on resolve, on reject or if already
   * completed.
   *
   * @param  {Function} callback
   * @param  {Object}   context
   *
   * @return {this}
   */
  always: function(callback, context) {
    this.addCallback.apply(this, arguments)
        .addErrback.apply(this, arguments);

    return this;
  },

  /**
   * Add callback called on `resolve` state or immediately if already resolved.
   *
   * @param {Function} callback
   * @param {Object}   context
   */
  addCallback: function(callback, context) {
    promiseLazyInit(this);

    if(!this.isCompleted()) {
      this.on('resolved', callback, context || this);
    } else if(this.isResolved()) {
     this._events.resolved.execute({
      handler : callback,
      context : context
      });
    }
    return this;
  },

  /**
   * Add errback called on `reject` state or immediately if already rejected.
   *
   * @param {Function} errback
   * @param {Object}   context
   */
  addErrback: function(errback, context) {
    promiseLazyInit(this);

    if(!this.isCompleted()) {
      this.on('rejected', errback, context || this);
    } else if(this.isRejected()) {
     this._events.rejected.execute({
      handler : errback,
      context : context
      });
    }
    return this;
  },

  /**
   * Add a progress callback called when `progress` is emitted.
   * @param {Function} progress
   * @param {Object} context
   */
  addProgress: function(progress, context) {
    promiseLazyInit(this);

    this.on('progress', progress, context || this);
    return this;
  },

  /**
   * Resolve the current promise.
   *
   * Arguments are passed when callbacks are executed.
   *
   * If the promise is alredy completed, nothing happens.
   */
  resolve: function() {
    this._complete('resolved', arguments);
    return this;
  },

  /**
   * Reject the current promise.
   *
   * Arguments are passed when callbacks are executed.
   *
   * If the promise is alredy completed, nothing happens.
   */
  reject: function() {
    this._complete('rejected', arguments);
    return this;
  },

  /**
   * Complete the curren promise
   * @private
   *
   * @param  {String} state   - `resolved` or `rejected`
   * @param  {Arguments} args - arguments to pass to callback/errback
   */
  _complete: function(state, args) {
    promiseLazyInit(this);

    // Deactivate firing functions
    var self = this;
    this.resolve = this.reject = this.progress = function() {
      return self;
    };

    // free the progress event

    // Fire the event chain
    args = Array.prototype.slice.call(args);
    args.unshift(state);
    this.setState.apply(this, args);

    //disable events
    this._events.progress.disable();
    this._events.rejected.disable();
    this._events.resolved.disable();
  },

  /**
   * Emit `progress` event
   */
  progress: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('progress');
    this.emit.apply(this, args);
    return this;
  },

  /**
   * Cancel the promise: cannot be rejected nor resolved.
   *
   * There is no state `canceled`, the promise stays in `progress` state
   * (if not already completed before).
   */
  cancel: function() {
    this._events.rejected.disable();
    this._events.resolved.disable();
    return this;
  },

  /**
   * @return {Boolean} true if the promise is completed.
   */
  isCompleted: function() {
    promiseLazyInit(this);
    return this.stateIs('resolved') || this.stateIs('rejected');
  },

  /**
   * @return {Boolean} true if promise is resolved.
   */
  isResolved: function() {
    promiseLazyInit(this);
    return this.stateIs('resolved');
  },

  /**
   * @return {Boolean} true if promise is rejected.
   */
  isRejected: function() {
    promiseLazyInit(this);
    return this.stateIs('rejected');
  },

  /**
   * @return {Boolean} true if in progress
   */
  inProgress: function() {
    promiseLazyInit(this);
    return this.stateIs('progress');
  },

  /**
   * @return {Array} arguments passed during #reject call.
   */
  rejectedArguments: function() {
    promiseLazyInit(this);
    return this._events.rejected.firedArgs;
  },

  /**
   * @return {Array} arguments passed during #resolve call.
   */
  resolvedArguments: function() {
    promiseLazyInit(this);
    return this._events.resolved.firedArgs;
  }
};

//inherits methods from StateEventEmitter
for(var meth in StateEventEmitter.prototype) {
  Promise.prototype[meth] = StateEventEmitter.prototype[meth];
}

/**
 * Test if an object is a promise = test if it has a #then method.
 * @static
 *
 * @param  {Object}  promise - to test
 * @return {Boolean} true if it's a promise.
 */
Promise.isPromise = function(promise) {
  return promise && typeof promise.then === 'function';
};

/**
 * Static function which accepts a promise object or any kind of object and
 * returns a promise.
 *
 * @static
 *
 * If the given object is a promise, it simply returns the same object.
 * If it's a value it returns a new resolved promise object with this value as
 * resolved argument.
 *
 *
 * @param  {Object} promise - Promise or value
 * @return {Promise}
 */
Promise.when = function(promise) {
  if (this.isPromise(promise))
    return promise;

  return new Promise().resolve(promise);
};

 //Inspiration : when.js from Brian Cavalier

/**
 * Returns a promise that completes when all the given promises are completed
 * and that resolves only if at least a given number of them have been resolved.
 *
 * The resolved and rejected arguments are : 
 *   as first argument, an array of the resolved promises
 *   as second argument, an array of the rejected promises.
 *
 * @param  {Array}  promises      - array of promises to test
 * @param  {Number} [toResolve=1] - number of promises that need to be resolved
 *                                  to resolve the returned promise
 *
 * @return {Promise} promise
 */
Promise.whenAtLeast = function(promises, toResolve) {
    toResolve = Math.max(1, Math.min(toResolve || 1, promises.length));

    var promise = new Promise(),
        promisesLeft = promises.length,
        resolved = [],
        rejected = [];

    function finish() {
      if (--promisesLeft === 0) {
        if (resolved.length >= toResolve) {
          promise.resolve(resolved, rejected);
        } else {
          promise.reject(resolved, rejected);
        }
      }
    }

    function failure(promise) {
      return function() {
        rejected.push(promise);
        finish();
      };
    }

    function success(promise) {
      return function() {
        resolved.push(promise);
        finish();
      };
    }

    for (var i = 0; i < promises.length; i++) {
      Promise.when(promises[i])
              .then(success(promises[i]),
                    failure(promises[i]),
                    promise.progress);
    }
    return promise;
  };

/**
 * Returns a promise that:
 *  - resolves as soon as the given number of the given promises are resolved
 *  - rejects as soon there is no more chance to be resolved given the previous
 *  condition.
 *
 * The resolved and rejected arguments are : 
 *   as first argument, an array of the resolved promises
 *   as second argument, an array of the rejected promises.
 *
 * @param  {Array}  promises   - array of promises to test
 * @param  {Number} toResolve  - number of promises that need to be resolved
 *                               to resolve the returned promise
 *
 * @return {Promise} promise
 */
Promise.whenSome = function(promises, toResolve) {
    var resolved = [],
        rejected = [],
        res = new Promise(),
        slice = Array.prototype.slice,
        notToReject;

    toResolve = Math.max(0, Math.min(toResolve, promises.length));
    notToReject = promises.length - toResolve;
    function success(promise) {
      return function() {
        resolved.push(promise);
        if (--toResolve === 0) {
          res.resolve(resolved, rejected);
        }
      };
    }

    function failure(promise) {
      return function() {
        rejected.push(promise);
        if (notToReject-- === 0) {
          res.reject(resolved, rejected);
        }
      };
    }

    if (toResolve === 0) {
      res.resolve(resolved, rejected);
    } else {
      for (var i = 0; i < promises.length; i++) {
        Promise.when(promises[i])
                .then(success(promises[i]),
                      failure(promises[i]),
                      res.progress);
      }
    }
    return res;
  };

  /**
   * Return a promise that is resolved when all given promises are resolved.
   *
   * If one of the promises is rejected the returned promise is immediately
   * rejected.
   *
   * @param  {Array} promises - array of promises
   * @return {Promise} promise that will be resolved
   */
  Promise.whenAll = function(promises) {
    return Promise.whenSome(promises, promises.length);
  };

  Promise.whenMap = function(promises, map) {
    var results  = [],
        res = new Promise(),
        total    = promises.length;
        
    function success(promise) {
      return function() {
        var index = promises.indexOf(promise);
        results[index] = map.apply(promise, arguments);
        if (--total === 0) {
          res.resolve(results);
        }
      };
    }

    for (var i = 0, l = promises.length; i < l; i++) {
      Promise.when(promises[i])
             .then(success(promises[i]), res.reject, res.progress);
    }
    return res;
  };