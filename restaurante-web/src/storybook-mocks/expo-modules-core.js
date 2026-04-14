/**
 * Mock mínimo de expo-modules-core para o ambiente Storybook (web/webpack).
 * Evita o crash "Cannot find native module 'ExpoFontLoader'" que ocorre quando
 * @expo/vector-icons tenta chamar requireNativeModule em ambiente não-native.
 */

const noop = () => {};
const noopObj = new Proxy(
  {},
  {
    get: () => noop,
    apply: () => undefined,
  }
);

module.exports = {
  requireNativeModule: () => noopObj,
  requireOptionalNativeModule: () => null,
  NativeModulesProxy: noopObj,
  Platform: { OS: 'web' },
  EventEmitter: class {
    addListener() {}
    removeListeners() {}
  },
};
