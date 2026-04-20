import { useCallback, useEffect, useRef, useState } from 'react';

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

export const PermissionStatus = {
  GRANTED: 'granted',
  UNDETERMINED: 'undetermined',
  DENIED: 'denied',
};

const defaultPermissionResponse = {
  status: PermissionStatus.UNDETERMINED,
  expires: 'never',
  granted: false,
  canAskAgain: true,
};

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

export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return '00000000-0000-4000-8000-000000000000';
}

export function requireNativeModule(moduleName) {
  if (moduleName === 'ExpoFontLoader') {
    return ExpoFontLoader;
  }
  return createNoopProxy();
}

export function requireNativeViewManager() {
  return createNoopProxy();
}

export function requireOptionalNativeModule(moduleName) {
  if (moduleName === 'ExpoFontLoader') {
    return ExpoFontLoader;
  }
  return null;
}

export function registerWebModule(moduleImplementation) {
  return moduleImplementation;
}

export async function reload() {
  return;
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

export class LegacyEventEmitter extends EventEmitter {}

export function createPermissionHook(methods) {
  return function usePermission(options) {
    const isMounted = useRef(true);
    const [status, setStatus] = useState(null);
    const { get = true, request = false, ...permissionOptions } = options ?? {};

    const callWithOptions = useCallback(
      async (method) => {
        if (typeof method !== 'function') {
          return defaultPermissionResponse;
        }

        const hasOptions = Object.keys(permissionOptions).length > 0;
        const response = hasOptions ? await method(permissionOptions) : await method();
        return response ?? defaultPermissionResponse;
      },
      [permissionOptions],
    );

    const getPermission = useCallback(async () => {
      const response = await callWithOptions(methods?.getMethod);
      if (isMounted.current) {
        setStatus(response);
      }
      return response;
    }, [callWithOptions, methods]);

    const requestPermission = useCallback(async () => {
      const response = await callWithOptions(methods?.requestMethod);
      if (isMounted.current) {
        setStatus(response);
      }
      return response;
    }, [callWithOptions, methods]);

    useEffect(() => {
      isMounted.current = true;
      return () => {
        isMounted.current = false;
      };
    }, []);

    useEffect(() => {
      if (request) {
        void requestPermission();
        return;
      }
      if (get) {
        void getPermission();
      }
    }, [get, getPermission, request, requestPermission]);

    return [status, requestPermission, getPermission];
  };
}

export default {
  requireNativeModule,
  requireNativeViewManager,
  requireOptionalNativeModule,
  registerWebModule,
  reload,
  uuid,
  NativeModulesProxy,
  Platform,
  EventEmitter,
  LegacyEventEmitter,
  NativeModule,
  SharedObject,
  SharedRef,
  CodedError,
  PermissionStatus,
  createPermissionHook,
  UnavailabilityError,
};

export { CodedError, NativeModule, SharedObject, SharedRef };
