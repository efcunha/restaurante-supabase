// Shim for Node.js 'events' module in Storybook/web context
class EventEmitter {
  constructor() {
    this._events = {};
    this._maxListeners = 10;
  }

  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this;
  }

  addListener(event, listener) {
    return this.on(event, listener);
  }

  off(event, listener) {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter((l) => l !== listener);
    return this;
  }

  removeListener(event, listener) {
    return this.off(event, listener);
  }

  emit(event, ...args) {
    if (!this._events[event]) return false;
    this._events[event].forEach((listener) => {
      try {
        listener(...args);
      } catch (err) {
        console.error('EventEmitter listener error:', err);
      }
    });
    return true;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }

  listeners(event) {
    return this._events[event] || [];
  }

  listenerCount(event) {
    return (this._events[event] || []).length;
  }

  setMaxListeners(n) {
    this._maxListeners = n;
    return this;
  }

  getMaxListeners() {
    return this._maxListeners;
  }

  rawListeners(event) {
    return this._events[event] || [];
  }

  prependListener(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].unshift(listener);
    return this;
  }

  prependOnceListener(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.prependListener(event, wrapper);
  }
}

// Export all common variations
// Support multiple import patterns
export { EventEmitter };
export default EventEmitter;

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventEmitter;
  module.exports.EventEmitter = EventEmitter;
}
