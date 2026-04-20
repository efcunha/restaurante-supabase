const noop = () => undefined;

function createNoopProxy() {
  return new Proxy(noop, {
    apply: () => undefined,
    get: (_, prop) => {
      if (prop === 'then') {
        return undefined;
      }
      return createNoopProxy();
    },
  });
}

class NativeModule {}

class SharedObject {}

class SharedRef {}

class CodedError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const ExpoFontLoader = {
  async loadAsync() {
    return;
  },
  async unloadAsync() {
    return;
  },
  getLoadedFonts() {
    return [];
  },
  isLoaded() {
    return true;
  },
  isLoading() {
    return false;
  },
};

export function requireNativeModule(moduleName) {
  if (moduleName === 'ExpoFontLoader') {
    return ExpoFontLoader;
  }
  return createNoopProxy();
}

export function requireOptionalNativeModule(moduleName) {
  if (moduleName === 'ExpoFontLoader') {
    return ExpoFontLoader;
  }
  return null;
}

export const NativeModulesProxy = createNoopProxy();

export const Platform = {
  OS: 'web',
  select: (specifics) => specifics?.web ?? specifics?.default,
};

export class UnavailabilityError extends CodedError {
  constructor(moduleName, propertyName) {
    super(
      'ERR_UNAVAILABLE',
      `The method or property ${moduleName}.${propertyName} is not available on ${Platform.OS}, are you sure you've linked all the native dependencies properly?`,
    );
  }
}

export class EventEmitter {
  addListener() {
    return { remove: noop };
  }

  removeListeners() {
    return;
  }
}

export default {
  requireNativeModule,
  requireOptionalNativeModule,
  NativeModulesProxy,
  Platform,
  EventEmitter,
  NativeModule,
  SharedObject,
  SharedRef,
  CodedError,
  UnavailabilityError,
};

export { CodedError, NativeModule, SharedObject, SharedRef };
