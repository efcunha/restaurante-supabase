import * as ReactNativeWeb from 'react-native-web';

export const TurboModuleRegistry = {
  get() {
    return null;
  },
  getEnforcing() {
    return {};
  },
};

export * from 'react-native-web';

export default {
  ...ReactNativeWeb,
  TurboModuleRegistry,
};
