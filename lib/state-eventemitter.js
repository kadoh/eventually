var EventEmitter = require('./eventemitter').EventEmitter;

/**
 * StateEventEmitter class. An event emitter that has a state at any moment.
 *
 * When a state is set, 2 events are emitted :
 *
 * @event state_change (state) - emitted when state changes
 * @event %state%      (args)  - emiited when state changes
 *
 * @extends {EventEmitter}
 */
var StateEventEmitter = function() {
  EventEmitter.call(this);
  this.state = null;
};

exports.StateEventEmitter = StateEventEmitter;

var seeLazyInit = function(see) {
  if(!see.state) see.state = null;
};

StateEventEmitter.prototype = {
  /**
   * Set state of the object and emit an event whose name is the given state.
   *
   * Additional arguments can be passed and will be emitted with.
   *
   * @param {String} state  - state to set
   * @return {StateEventEmitter} this
   */
  setState: function(state) {
    seeLazyInit(this);
    if (this.state !== state) {
          this.setStateSilently(state);
          this.emit.apply(this, arguments);
          this.emit('state_change', state);
      }
    return this;
  },

  /**
   * Set state but doesn't emit any event.
   *
   * @param {String} state
   *
   * @return {StateEventEmitter} this
   */
  setStateSilently: function(state) {
    seeLazyInit(this);
    this.state = String(state);
    return this;
  },

  /**
   * Getter for the state of the object.
   * @return {String} - current state
   */
  getState: function() {
    seeLazyInit(this);
    return this.state;
  },

  /**
   * Match tester for the state of the object.
   * @param  {String} state state to be tested
   * @return {Booelean} result of the test
   */
  stateIs: function(state) {
    seeLazyInit(this);
    return this.state === state;
  },

  /**
   * Not match tester for the state of the object.
   * @param  {String} state state to be tested
   * @return {Booelean} result of the test
   */
  stateIsNot: function(state) {
    seeLazyInit(this);
    return this.state !== state;
  },

  /**
   * Call a function when the state change. The handler function willl be called
   * with the state as parameter.
   * @param {Function} handler - the function to be called when state changes
   * @param {Object}   [scope] - scope in which the callback function willl be
   *                              called
   * @param {Object}   [options] - EventEmmitter#on options
   * @return {self} this
   */
  onStateChange: function(handler, scope, options) {
    seeLazyInit(this);
    this.on('state_change', handler, scope, options);
    return this;
  }
};

for(var meth in EventEmitter.prototype) {
  StateEventEmitter.prototype[meth] = EventEmitter.prototype[meth];
}