// Manager file - runs in the manager iframe, even earlier than preview
// This is our last-resort polyfill injection point

(function earlyPolyfillInjection() {
  // Inject EventEmitter ASAP
  class EventEmitter {
    constructor() {
      this._events = {};
    }
    on(event, listener) {
      if (!this._events[event]) {
        this._events[event] = [];
      }
      this._events[event].push(listener);
      return this;
    }
    off(event, listener) {
      if (!this._events[event]) return this;
      this._events[event] = this._events[event].filter((l) => l !== listener);
      return this;
    }
    emit(event, ...args) {
      if (!this._events[event]) return false;
      this._events[event].forEach((listener) => {
        try {
          listener(...args);
        } catch (err) {
          // Silently catch to prevent cascading failures
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
  }

  // Inject globally
  if (typeof globalThis !== 'undefined') {
    globalThis.EventEmitter = EventEmitter;
  }
  if (typeof window !== 'undefined') {
    window.EventEmitter = EventEmitter;
  }
})();
