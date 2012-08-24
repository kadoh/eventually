/**
 * EventEmitter class.
 * Create an object with events registering and firing methods.
 *
 * Any object can implement EventEmitter on the fly : simply copy the prototype.
 *
 * @example
 *     var noob = {foo :'bar'};
 *     utils.inherits(noob, EventEmitter.prototype);
 *     noob.emit('hello');
 *
 * If a listener callback function throws an error, the error will be emited as
 * an `error` event and callbacks execution continues. Unless there is no
 * callback registered on the `error` event.
 *
 * @event error (error) - emitted when an error is thrown while executing a
 *                        listener callback
 * @event __any__ (type, arg) - emitted when any event is fired
 */
var EventEmitter = function() {
  this._events = {};
};

exports.EventEmitter = EventEmitter;


//with the lazy init copying the prototype
//is enough to be an EventEmitter
// = no need to call the constructor
var eeLazyInit = function(ee) {
  if(!ee._events) ee._events = {};
};

EventEmitter.prototype = {

  /**
   * Adds an event listener for the specified event.
   *
   * An error callback can be provided that will be called if the handler throws
   * an exception. The error is passed as argument.
   * If no error callback is provided, the error is emited as `error` event of
   * the current event-emitter.
   * However, if there is no listener on `error`, the error is simply throwed.
   *
   * @param {String}   type            - event type name
   * @param {Function} handler         - function to be called when the event is
   *                                     fired
   * @param {Object}   [scope=this]    - object that _this_ should be set to
   *                                     when the listener is called
   * @param {Object}   [options]
   *        {Boolean}  options.once    - if true then the listener will be
   *                                     removed after the first call
   *        {Boolean}  options.unshift - if true the event is inserted at the
   *                                     begining of the stack
   *        {Function} options.errorCb – will be called if an error is throwed
   *                                     during the `handler` call
   *
   * @return {EventEmitter} this
   */
  on: function(type, handler, scope, options) {
    eeLazyInit(this);

    var event, events;

    // handle multiple events object
    if (typeof type === 'object') {

      //shift arguments
      events = type;
      var _scope = handler;
      var _options = scope;

      for (event in events) {
        if (events.hasOwnProperty(event)) {
          this.on(event, events[event], _scope, _options);
        }
      }
      return this;
    }

    if(typeof handler !== 'function')
      throw new Error('handler should be a function');

    //add the new listener
    events = this._events;
    if (events.hasOwnProperty(type)) {
      event = events[type];
    } else {
      event = events[type] = new Event();
    }

    //options could be the `once` flag
    if(typeof options === 'boolean')
      options = { once : options};

    event.addListener(handler, scope || this, options || {});
    return this;
  },

  /**
   * Alias for {@link #on}, but will remove the handler after first call.
   *
   * @param {String}   type            - event type name
   * @param {Function} handler         - function to be called when the event is
   *                                     fired
   * @param {Object}   [scope=this]    - object that _this_ should be set to
   *                                     when the listener is called
   * @param {Object}   [options]
   *        {Boolean}  options.unshift - if true the event is inserted at the
   *                                     begining of the stack
   *        {Function} options.errorCb – will be called if an error is throwed
   *                                     during the `handler` call
   *
   * @return {EventEmitter} this
   */
  once: function(type, handler, scope, options) {
    options = options || {};
    options.once = true;
    return this.on(type, handler, scope, options);
  },

  /**
  * Emits an event executing all appropriate listeners.
  *
  * All values passed after the type will be passed as arguments to the
  * listeners.
  *
  * @param {String} type - Event type name to run all listeners from
  *
  * @return {EventEmitter} The current EventEmitter instance to allow chaining
  */
  emit: function(type) {
    eeLazyInit(this);

    //if any 'error' listeners
    //when a error is throwed in a listener cb
    //emit it as error rather than throwing
    var that = this;
    var errorListeners = this._events.error &&
      this._events.error.listeners.length > 0;

    var emitError = !errorListeners ? undefined : function(e) {
      that.emit('error', e);
    };

    //fire '__any__'
    if(this._events.hasOwnProperty('__any__'))
      this._events.__any__.fire(arguments, emitError);

    //fire the event
    var exists = this._events.hasOwnProperty(type),
        event  = this._events[type];
    if(exists)
      event.fire(Array.prototype.slice.call(arguments, 1), emitError);

    return this;
  },

  /**
   * Removes the listener for the specified event type.
   *
   * @param {String}   type    - event type of the listener to remove
   * @param {Function} handler - handler of the listener to remove
   * @param {Object}   [scope] - scope of listener to remove
   *
   * @return {EventEmitter} this
   */
  off: function(type, handler ,scope) {
    eeLazyInit(this);

    if(this._events.hasOwnProperty(type))
      this._events[type].removeListener(handler, scope);

    return this;
  },

  /**
   * Removes all listeners for all or a specified event.
   *
   * If no event type is provided, all listeners from all events are removed.
   *
   * @param  {String} [type] - event type listeners to remove
   *
   * @return {EventEmitter} this
   */
  offAll: function(type) {
    eeLazyInit(this);

    //when no type
    //remove all listeners from all events
    if(!type) {
      for(var event in this._events) {
        this.offAll(event);
      }
      return this;
    }

    if(this._events.hasOwnProperty(type))
      this._events[type].removeAllListener();

    return this;
  },

  /**
   * Subscribe to all events fired. The listener function will be called with
   * the name of the event as first argument.
   *
   * @param {Function} handler     - function to be called when any event is
   *                                 fired
   * @param {Object}  [scope=this] - object that _this_ should be set to when
   *                                 the listener is called
   * @param {Object} options       - see {@link #on}
   *
   * @return {EventEmitter} this
   */
  subscribe: function(handler, scope, options) {
    return this.on('__any__', handler, scope, options);

  },
  
  /**
   * Unsubscribe a listener from all the events.
   *
   * @param {Function} handler - handler to remove
   * @param {Object}   [scope] - scope of handler to remove
   *
   * @return {EventEmitter} this
   */
  unsubscribe: function(handler, scope) {
    return this.off('__any__', handler, scope);
  }

};

/**
 * Event class
 * @private
 */
var Event = function() {
  this.fired = false;
  this.lastFiredArgs = null;
  this.listeners = [];
};

Event.prototype = {

  addListener: function(handler, scope, options) {
    var listener = {
      handler  : handler,
      scope    : scope,
      once     : options.once || false,
      unshift  : options.unshift || false,
      errorCb  : options.errorCb || false
    };

    var insert = listener.unshift ? 'unshift' : 'push';
    this.listeners[insert](listener);
  },

  fire: function(args, errorCb) {
    this.fired = true;
    this.lastFiredArgs = args;

    for(var i=0; i< this.listeners.length; i++) {
      var listener = this.listeners[i];
      if(listener.once) {
        this.removeListener(i);
      }

      try {
        listener.handler.apply(listener.scope, args);
      } catch(e) {
        if(listener.errorCb)
          listener.errorCb(e);
        else if(errorCb)
          errorCb(e);
        else
          throw e;
      }
    }
  },

  removeListener: function(handler, scope) {
    if(typeof handler === 'number') {
      this.listeners.splice(handler, 1);
    } else {
      for(var i = 0; i< this.listeners.length; i++) {

        //veriffy the equality of handlers
        //and scopes if any
        if(this.listeners[i].handler === handler)
          if(!scope || this.listeners[i].scope === scope)
            this.listeners.splice(i, 1);
      }
    }
  },

  removeAllListener: function() {
    this.listeners = [];
  }
};