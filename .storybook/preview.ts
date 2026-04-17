import type { Preview } from '@storybook/react';

// CRITICAL: Inject polyfills BEFORE any other code executes
// This must run synchronously to intercept all requires
(function setupNodePolyfills() {
  // EventEmitter - needed by Webpack, Vite, and other bundler deps
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
          console.error('[Storybook] EventEmitter listener error:', err);
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
    static EventEmitter = EventEmitter;
  }

  // Inject into MULTIPLE global scopes to be safe
  const scopes = [];
  if (typeof globalThis !== 'undefined') scopes.push(globalThis);
  if (typeof window !== 'undefined') scopes.push(window);
  if (typeof global !== 'undefined') scopes.push(global);

  scopes.forEach((scope) => {
    scope.EventEmitter = EventEmitter;
    // Also set as default export-style
    if (typeof scope.events === 'undefined') {
      scope.events = EventEmitter;
    }

    // Expo runtime compatibility for expo-modules-core in Storybook.
    if (typeof scope.expo === 'undefined') {
      scope.expo = {};
    }
    if (typeof scope.expo.EventEmitter === 'undefined') {
      scope.expo.EventEmitter = EventEmitter;
    }
    if (typeof scope.expo.NativeModule === 'undefined') {
      scope.expo.NativeModule = class NativeModule {};
    }
    if (typeof scope.expo.SharedObject === 'undefined') {
      scope.expo.SharedObject = class SharedObject {};
    }
    if (typeof scope.expo.SharedRef === 'undefined') {
      scope.expo.SharedRef = class SharedRef {};
    }
    if (typeof scope.expo.modules === 'undefined') {
      scope.expo.modules = {};
    }
  });

  // Ensure process object
  scopes.forEach((scope) => {
    if (!scope.process) {
      scope.process = {
        env: { NODE_ENV: 'development' },
        nextTick:
          typeof queueMicrotask !== 'undefined'
            ? queueMicrotask
            : (cb) => Promise.resolve().then(cb),
      };
    }
  });

  // Polyfill util module in case it's needed
  if (typeof globalThis !== 'undefined' && !globalThis.util) {
    globalThis.util = {
      inspect: (v) => String(v),
      format: (...args) => args.map(String).join(' '),
      inherits: (ctor, superCtor) => {
        ctor.prototype = Object.create(superCtor.prototype);
        ctor.prototype.constructor = ctor;
      },
    };
  }
})();

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
};

export default preview;
