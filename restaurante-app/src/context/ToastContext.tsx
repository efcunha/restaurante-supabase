import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import Toast from '../components/ui/Toast';
import HapticsService from '../services/HapticsService';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success', // success, error, info, warning
  });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    console.log('[ToastContext] showToast called:', message, 'type:', type);
    try {
      // Haptic Feedback
      if (type === 'success') HapticsService.success();
      else if (type === 'error') HapticsService.error();
      else if (type === 'warning') HapticsService.warning();
      else HapticsService.light();
    } catch (error) {
      console.warn('[ToastContext] Haptics error (ignoring):', error);
    }

    setToast({ visible: true, message, type });
    console.log('[ToastContext] setToast called with visible=true');
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

