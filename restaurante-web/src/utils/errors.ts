/**
 * Error Handling System
 * 
 * Hierarquia de classes de erro customizadas para tratamento consistente:
 * - Classificação de erros (user/system/network)
 * - Mensagens user-friendly em português
 * - Logging completo com contexto
 * - Integração com sistema de monitoramento
 * 
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5
 */

/**
 * Categorias de erro
 */
export type ErrorCategory = 'user_error' | 'system_error' | 'network_error';

/**
 * Contexto adicional do erro
 */
export interface ErrorContext {
  [key: string]: any;
}

/**
 * Classe base para todos os erros da aplicação
 */
export abstract class AppError extends Error {
  public readonly timestamp: Date;
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly context?: ErrorContext;
  public readonly userMessage: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    retryable: boolean,
    userMessage: string,
    context?: ErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    this.userMessage = userMessage;
    this.context = context;

    // Mantém stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializa erro para logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      retryable: this.retryable,
      userMessage: this.userMessage,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

// ============================================================================
// USER ERRORS (não retryable)
// ============================================================================

/**
 * Erro de validação de dados
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'VALIDATION_ERROR',
      'user_error',
      false,
      'Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.',
      context
    );
  }
}

/**
 * Erro de autenticação
 */
export class AuthenticationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'AUTH_ERROR',
      'user_error',
      false,
      'Falha na autenticação. Por favor, faça login novamente.',
      context
    );
  }
}

/**
 * Erro de permissão
 */
export class PermissionError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'PERMISSION_ERROR',
      'user_error',
      false,
      'Você não tem permissão para realizar esta operação.',
      context
    );
  }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string, context?: ErrorContext) {
    super(
      `${resource} não encontrado: ${id}`,
      'NOT_FOUND_ERROR',
      'user_error',
      false,
      `${resource} não encontrado. Verifique se o ID está correto.`,
      { ...context, resource, id }
    );
  }
}

/**
 * Erro de conflito (ex: recurso já existe)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'CONFLICT_ERROR',
      'user_error',
      false,
      'Esta operação não pode ser realizada devido a um conflito. O recurso pode já existir.',
      context
    );
  }
}

/**
 * Erro de entrada inválida
 */
export class InvalidInputError extends AppError {
  constructor(field: string, reason: string, context?: ErrorContext) {
    super(
      `Campo inválido: ${field} - ${reason}`,
      'INVALID_INPUT_ERROR',
      'user_error',
      false,
      `O campo "${field}" é inválido: ${reason}`,
      { ...context, field, reason }
    );
  }
}

// ============================================================================
// NETWORK ERRORS (retryable)
// ============================================================================

/**
 * Erro de rede
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'NETWORK_ERROR',
      'network_error',
      true,
      'Erro de conexão. Verifique sua internet e tente novamente.',
      context
    );
  }
}

/**
 * Erro de timeout
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number, context?: ErrorContext) {
    super(
      `Timeout na operação: ${operation} (${timeoutMs}ms)`,
      'TIMEOUT_ERROR',
      'network_error',
      true,
      'A operação demorou muito. Por favor, tente novamente.',
      { ...context, operation, timeoutMs }
    );
  }
}

/**
 * Erro de conexão offline
 */
export class OfflineError extends AppError {
  constructor(context?: ErrorContext) {
    super(
      'Dispositivo está offline',
      'OFFLINE_ERROR',
      'network_error',
      true,
      'Você está offline. Conecte-se à internet e tente novamente.',
      context
    );
  }
}

// ============================================================================
// SYSTEM ERRORS (alguns retryable)
// ============================================================================

/**
 * Erro de banco de dados
 */
export class DatabaseError extends AppError {
  constructor(message: string, retryable: boolean, context?: ErrorContext) {
    super(
      message,
      'DATABASE_ERROR',
      'system_error',
      retryable,
      'Erro ao acessar dados. Por favor, tente novamente.',
      context
    );
  }
}

/**
 * Erro de configuração
 */
export class ConfigurationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'CONFIG_ERROR',
      'system_error',
      false,
      'Erro de configuração do aplicativo. Contate o suporte.',
      context
    );
  }
}

/**
 * Erro de rate limit
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number, context?: ErrorContext) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      'system_error',
      true,
      'Muitas requisições. Por favor, aguarde um momento.',
      { ...context, retryAfter }
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * Erro interno do servidor
 */
export class InternalServerError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'INTERNAL_SERVER_ERROR',
      'system_error',
      false,
      'Erro interno do servidor. Nossa equipe foi notificada.',
      context
    );
  }
}

/**
 * Erro de serviço indisponível
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, context?: ErrorContext) {
    super(
      `Serviço indisponível: ${service}`,
      'SERVICE_UNAVAILABLE_ERROR',
      'system_error',
      true,
      'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
      { ...context, service }
    );
  }
}

/**
 * Erro de operação não suportada
 */
export class UnsupportedOperationError extends AppError {
  constructor(operation: string, context?: ErrorContext) {
    super(
      `Operação não suportada: ${operation}`,
      'UNSUPPORTED_OPERATION_ERROR',
      'system_error',
      false,
      'Esta operação não é suportada.',
      { ...context, operation }
    );
  }
}

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Classifica um erro genérico em AppError apropriado
 */
export function classifyError(error: unknown): AppError {
  // Já é AppError
  if (error instanceof AppError) {
    return error;
  }

  // Error padrão do JavaScript
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return new NetworkError(error.message, { originalError: error });
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return new TimeoutError('Unknown operation', 30000, { originalError: error });
    }

    // Auth errors
    if (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('unauthenticated')
    ) {
      return new AuthenticationError(error.message, { originalError: error });
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('forbidden') ||
      message.includes('access denied')
    ) {
      return new PermissionError(error.message, { originalError: error });
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return new NotFoundError('Resource', 'unknown', { originalError: error });
    }

    // Database errors
    if (
      message.includes('firestore') ||
      message.includes('database') ||
      message.includes('query') ||
      message.includes('supabase') ||
      message.includes('postgres') ||
      message.includes('violates foreign key constraint') ||
      message.includes('violates unique constraint')
    ) {
      return new DatabaseError(error.message, true, { originalError: error });
    }

    // Default: Internal server error
    return new InternalServerError(error.message, { originalError: error });
  }

  // String error
  if (typeof error === 'string') {
    return new InternalServerError(error);
  }

  // Unknown error type
  return new InternalServerError('Unknown error occurred', {
    originalError: error
  });
}

/**
 * Verifica se erro é retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }

  // Por padrão, assume que erros desconhecidos não são retryable
  return false;
}

/**
 * Obtém mensagem user-friendly de um erro
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
  }

  return 'Erro desconhecido. Por favor, contate o suporte.';
}

/**
 * Extrai código do erro
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code;
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Extrai categoria do erro
 */
export function getErrorCategory(error: unknown): ErrorCategory {
  if (error instanceof AppError) {
    return error.category;
  }

  return 'system_error';
}
