import * as ReactNativeWeb from 'react-native-web';

const noop = () => undefined;

const rncNetInfoModule = {
  configure: noop,
  addListener: noop,
  removeListeners: noop,
  getCurrentState() {
    return Promise.resolve({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
      },
    });
  },
};

export const TurboModuleRegistry = {
  get() {
    return null;
  },
  getEnforcing() {
    return {};
  },
};

export class NativeEventEmitter {
  addListener() {
    return { remove: noop };
  }

  removeAllListeners() {
    return;
  }

  removeListener() {
    return;
  }

  emit() {
    return false;
  }
}

export const NativeModules = {
  RNCNetInfo: rncNetInfoModule,
};

export * from 'react-native-web';

export default {
  ...ReactNativeWeb,
  TurboModuleRegistry,
  NativeEventEmitter,
  NativeModules,
};
