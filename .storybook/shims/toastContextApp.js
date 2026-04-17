import React from 'react';

export function useToast() {
  return {
    showToast: () => undefined,
    hideToast: () => undefined,
  };
}

export function ToastProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

export default {
  useToast,
  ToastProvider,
};
