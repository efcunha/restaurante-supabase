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
  return {};
}

export function requireOptionalNativeModule(moduleName) {
  if (moduleName === 'ExpoFontLoader') {
    return ExpoFontLoader;
  }
  return null;
}

export default {
  requireNativeModule,
  requireOptionalNativeModule,
};
