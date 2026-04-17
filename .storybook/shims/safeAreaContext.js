import React from 'react';

const DEFAULT_INSETS = {
  top: 24,
  right: 0,
  bottom: 0,
  left: 0,
};

export function SafeAreaProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

export function SafeAreaView({ children, style }) {
  return React.createElement('div', { style }, children);
}

export function useSafeAreaInsets() {
  return DEFAULT_INSETS;
}

export default {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
};
