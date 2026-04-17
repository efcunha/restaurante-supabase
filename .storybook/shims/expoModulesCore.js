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
};
