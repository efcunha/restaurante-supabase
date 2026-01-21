import React, { createContext, useState, useContext, useCallback } from 'react';
import Toast from '../components/ui/Toast';
import HapticsService from '../services/HapticsService';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success', // success, error, info, warning
  });

  const showToast = useCallback((message, type = 'success') => {
    // Haptic Feedback
    if (type === 'success') HapticsService.success();
    else if (type === 'error') HapticsService.error();
    else if (type === 'warning') HapticsService.warning();
    else HapticsService.light();

    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};
