/**
 * Global Error Handler
 * 
 * Sistema centralizado de tratamento de erros:
 * - Logging completo com contexto
 * - Notificação ao usuário
 * - Integração com sistema de monitoramento (Sentry)
 * - Classificação automática de erros
 * 
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5
 */

import React from 'react';
import {
  AppError,
  classifyError,
  getUserFriendlyMessage,
  getErrorCode,
  getErrorCategory,
  ErrorContext
} from './errors';
import { auditService } from '../services/AuditService';
// Firebase auth import disabled during Supabase migration
// import { auth } from '../config/firebaseConfig';

/**
 * Configuração do error handler
 */
interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableMonitoring: boolean;
  enableUserNotification: boolean;
  logToConsole: boolean;
}

/**
 * Callback para notificação de erro ao usuário
 */
type ErrorNotificationCallback = (message: string, error: AppError) => void;

/**
 * Informações do usuário para contexto de erro
 */
interface UserInfo {
  userId?: string;
  email?: string;
  role?: string;
  companyId?: string;
}

/**
 * Global Error Handler
 */
class ErrorHandler {
  private config: ErrorHandlerConfig = {
    enableLogging: true,
    enableMonitoring: process.env.NODE_ENV === 'production',
    enableUserNotification: true,
    logToConsole: process.env.NODE_ENV === 'development'
  };

  private notificationCallback?: ErrorNotificationCallback;

  /**
   * Configura o error handler
   */
  configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Registra callback para notificação de erro
   */
  setNotificationCallback(callback: ErrorNotificationCallback): void {
    this.notificationCallback = callback;
  }

  /**
   * Trata um erro
   */
  async handle(error: unknown, context?: ErrorContext): Promise<void> {
    // Classifica erro
    const appError = classifyError(error);

    // Adiciona contexto do usuário
    const userInfo = await this.getUserInfo();
    const fullContext = {
      ...context,
      ...userInfo,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    };

    // Log do erro
    if (this.config.enableLogging) {
      await this.logError(appError, fullContext);
    }

    // Console log em desenvolvimento
    if (this.config.logToConsole) {
      this.logToConsole(appError, fullContext);
    }

    // Envia para sistema de monitoramento
    if (this.config.enableMonitoring) {
      await this.sendToMonitoring(appError, fullContext);
    }

    // Notifica usuário
    if (this.config.enableUserNotification) {
      this.notifyUser(appError);
    }
  }

  /**
   * Loga erro no sistema de auditoria
   */
  private async logError(error: AppError, context: ErrorContext): Promise<void> {
    try {
      // Firebase auth disabled during Supabase migration
      // const currentUser = auth.currentUser;
      
      // Temporarily disabled - no user authentication during migration
      console.error('[ErrorHandler] Error logged (auth disabled):', error.toJSON());
      return;
      
      /*
      if (!currentUser) {
        // Se não há usuário autenticado, apenas log no console
        console.error('[ErrorHandler] Error without authenticated user:', error.toJSON());
        return;
      }

      // Cria log de auditoria para erros críticos
      if (error.category === 'system_error') {
        await auditService.log({
          eventType: 'system.error',
          resourceType: 'company',
          resourceId: context.companyId || 'unknown',
          companyId: context.companyId || 'unknown',
          metadata: {
            errorCode: error.code,
            errorMessage: error.message,
            errorCategory: error.category,
            retryable: error.retryable,
            context
          }
        });
      }
      */
    } catch (loggingError) {
      // Não propaga erro de logging
      console.error('[ErrorHandler] Failed to log error:', loggingError);
    }
  }

  /**
   * Loga erro no console (desenvolvimento)
   */
  private logToConsole(error: AppError, context: ErrorContext): void {
    console.group(`🔴 ${error.name}`);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Category:', error.category);
    console.error('Retryable:', error.retryable);
    console.error('User Message:', error.userMessage);
    console.error('Context:', context);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }

  /**
   * Envia erro para sistema de monitoramento (Sentry)
   */
  private async sendToMonitoring(error: AppError, context: ErrorContext): Promise<void> {
    try {
      // TODO: Integrar com Sentry ou outro sistema de monitoramento
      // Exemplo com Sentry:
      /*
      import * as Sentry from '@sentry/react-native';
      
      Sentry.captureException(error, {
        tags: {
          category: error.category,
          code: error.code,
          retryable: error.retryable.toString()
        },
        extra: {
          context,
          userMessage: error.userMessage
        },
        level: this.getSentryLevel(error)
      });
      */

      // Por enquanto, apenas log
      if (process.env.NODE_ENV === 'production') {
        console.error('[ErrorHandler] Would send to monitoring:', {
          error: error.toJSON(),
          context
        });
      }
    } catch (monitoringError) {
      console.error('[ErrorHandler] Failed to send to monitoring:', monitoringError);
    }
  }

  /**
   * Notifica usuário sobre o erro
   */
  private notifyUser(error: AppError): void {
    if (this.notificationCallback) {
      this.notificationCallback(error.userMessage, error);
    } else {
      // Fallback: alert (não recomendado em produção)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ErrorHandler] No notification callback set. Error:', error.userMessage);
      }
    }
  }

  /**
   * Obtém informações do usuário atual
   */
  private async getUserInfo(): Promise<UserInfo> {
    // Firebase auth disabled during Supabase migration
    return {};
    
    /*
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        return {};
      }

      // Obtém custom claims
      const idTokenResult = await currentUser.getIdTokenResult();
      
      return {
        userId: currentUser.uid,
        email: currentUser.email || undefined,
        role: idTokenResult.claims.role as string | undefined,
        companyId: idTokenResult.claims.companyId as string | undefined
      };
    } catch (error) {
      console.error('[ErrorHandler] Failed to get user info:', error);
      return {};
    }
    */
  }

  /**
   * Determina nível de severidade para Sentry
   */
  private getSentryLevel(error: AppError): 'fatal' | 'error' | 'warning' | 'info' {
    if (error.category === 'user_error') {
      return 'info';
    }

    if (error.category === 'network_error') {
      return 'warning';
    }

    if (error.retryable) {
      return 'warning';
    }

    return 'error';
  }

  /**
   * Wrapper para operações assíncronas com tratamento de erro
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      await this.handle(error, context);
      throw error; // Re-throw para permitir tratamento local
    }
  }

  /**
   * Wrapper para operações síncronas com tratamento de erro
   */
  withErrorHandlingSync<T>(
    operation: () => T,
    context?: ErrorContext
  ): T {
    try {
      return operation();
    } catch (error) {
      // Handle assíncrono, mas não bloqueia
      this.handle(error, context);
      throw error;
    }
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Hook React para tratamento de erros
 */
export function useErrorHandler() {
  const handleError = async (error: unknown, context?: ErrorContext) => {
    await errorHandler.handle(error, context);
  };

  return { handleError };
}

/**
 * Decorator para métodos de classe (tratamento automático de erros)
 */
export function HandleErrors(context?: ErrorContext) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        await errorHandler.handle(error, {
          ...context,
          method: propertyKey,
          class: target.constructor.name
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Boundary de erro para React (HOC)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: AppError; reset: () => void }>
) {
  return class ErrorBoundary extends React.Component<
    P,
    { error: AppError | null }
  > {
    constructor(props: P) {
      super(props);
      this.state = { error: null };
    }

    static getDerivedStateFromError(error: unknown) {
      return { error: classifyError(error) };
    }

    componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
      errorHandler.handle(error, {
        componentStack: errorInfo.componentStack,
        component: Component.name
      });
    }

    render() {
      if (this.state.error) {
        if (fallback) {
          const FallbackComponent = fallback;
          return React.createElement(FallbackComponent, {
            error: this.state.error,
            reset: () => this.setState({ error: null })
          });
        }

        return React.createElement(
          'div',
          { style: { padding: 20, textAlign: 'center' } },
          React.createElement('h2', null, 'Algo deu errado'),
          React.createElement('p', null, this.state.error.userMessage),
          React.createElement(
            'button',
            { onClick: () => this.setState({ error: null }) },
            'Tentar novamente'
          )
        );
      }

      return React.createElement(Component, this.props);
    }
  };
}

// Export para uso global
export default errorHandler;
