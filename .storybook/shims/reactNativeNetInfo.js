import { useEffect, useState } from 'react';

export const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  cellular: 'cellular',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
};

export const NetInfoCellularGeneration = {
  '2g': '2g',
  '3g': '3g',
  '4g': '4g',
  '5g': '5g',
};

const listeners = new Set();
let configuration = {};
let currentState = {
  type: NetInfoStateType.wifi,
  isConnected: true,
  isInternetReachable: true,
  details: {
    isConnectionExpensive: false,
    ssid: null,
    bssid: null,
    strength: null,
    ipAddress: null,
    subnet: null,
    frequency: null,
    linkSpeed: null,
    rxLinkSpeed: null,
    txLinkSpeed: null,
  },
};

function emit(state) {
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // Ignore listener failures in Storybook mocks.
    }
  });
}

function cloneState() {
  return {
    ...currentState,
    details: currentState.details ? { ...currentState.details } : null,
  };
}

export function configure(nextConfiguration) {
  configuration = {
    ...configuration,
    ...(nextConfiguration ?? {}),
  };
}

export async function fetch() {
  return cloneState();
}

export async function refresh() {
  const state = cloneState();
  emit(state);
  return state;
}

export function addEventListener(listener) {
  if (typeof listener === 'function') {
    listeners.add(listener);
    listener(cloneState());
  }

  return () => {
    listeners.delete(listener);
  };
}

export function useNetInfo() {
  const [netInfo, setNetInfo] = useState(cloneState());

  useEffect(() => addEventListener(setNetInfo), []);

  return netInfo;
}

export function useNetInfoInstance(isPaused = false) {
  const [netInfo, setNetInfo] = useState(cloneState());

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }
    return addEventListener(setNetInfo);
  }, [isPaused]);

  return {
    netInfo,
    refresh: async () => {
      const state = await refresh();
      setNetInfo(state);
      return state;
    },
  };
}

export function __setNetInfoState(nextState) {
  currentState = {
    ...currentState,
    ...(nextState ?? {}),
    details: nextState && 'details' in nextState ? nextState.details : currentState.details,
  };
  emit(cloneState());
}

const NetInfo = {
  configure,
  fetch,
  refresh,
  addEventListener,
  useNetInfo,
  useNetInfoInstance,
};

export default NetInfo;
