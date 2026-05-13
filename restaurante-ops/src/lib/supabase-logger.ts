/**
 * supabase-logger.ts
 *
 * Wrapper para instrumentacao de queries Supabase no restaurante-ops.
 *
 * Responsabilidade:
 * - Medir o tempo de execucao de cada query
 * - Logar queries lentas (> SLOW_QUERY_THRESHOLD_MS) como warn + evento slow_query
 * - Logar erros de query como error + evento db_error
 * - Propagar request_id no contexto de cada operacao para rastreamento cross-service
 *
 * Uso:
 *   const { data, error } = await supabaseQuery(
 *     { table: 'orders', operation: 'select', requestId },
 *     () => supabase.from('orders').select('*').eq('id', orderId),
 *   );
 *
 * Nao substitui o cliente Supabase — e um wrapper auxiliar opt-in.
 * O cliente principal continua sendo importado diretamente de auth/supabase.ts.
 */

import { buildEnv } from '../config/env.js';
import { logWarn, logError } from './logger.js';

const env = buildEnv();

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────

/** Resultado padrao da @supabase/supabase-js */
interface SupabaseResult<T> {
  data: T | null;
  error: { message: string; code?: string; details?: string } | null;
}

interface QueryOptions {
  /** Nome da tabela ou recurso sendo acessado */
  table: string;
  /** Operacao: 'select' | 'insert' | 'update' | 'delete' | 'rpc' | string */
  operation: string;
  /** request_id para rastreamento cross-service (opcional) */
  requestId?: string;
  /** Override do threshold para esta query especifica (ms) */
  slowThresholdMs?: number;
}

// ────────────────────────────────────────────────────────────
// Util interno
// ────────────────────────────────────────────────────────────

function sanitizeErrorMessage(msg: string | null | undefined): string {
  if (!msg) return 'unknown db error';
  // Nao logar mensagens que possam conter dados sensiveis
  return msg.replace(/password\s*=\s*\S+/gi, 'password=[REDACTED]')
            .replace(/key\s*=\s*\S+/gi, 'key=[REDACTED]')
            .slice(0, 500);
}

// ────────────────────────────────────────────────────────────
// Wrapper principal
// ────────────────────────────────────────────────────────────

/**
 * Executa uma query do Supabase com medicao de performance e logging automatico.
 *
 * @param options  - Contexto da query (table, operation, requestId)
 * @param queryFn  - Funcao que retorna a query do Supabase (thenable)
 * @returns        - Resultado original { data, error } sem modificacoes
 *
 * Contrato de falha silenciosa:
 * - Erros do proprio logging NAO propagam para o chamador.
 * - O resultado { data, error } original e sempre retornado inalterado.
 */
export async function supabaseQuery<T>(
  options: QueryOptions,
  queryFn: () => PromiseLike<SupabaseResult<T>>,
): Promise<SupabaseResult<T>> {
  const startedAt = Date.now();
  const threshold = options.slowThresholdMs ?? env.SLOW_QUERY_THRESHOLD_MS;

  let result: SupabaseResult<T>;
  try {
    result = await queryFn();
  } catch (unexpectedErr) {
    // Erro inesperado (ex: rede, timeout nao tratado pelo SDK)
    const durationMs = Date.now() - startedAt;
    const errorMessage = unexpectedErr instanceof Error
      ? unexpectedErr.message
      : String(unexpectedErr);

    try {
      logError('db_error', {
        service: 'ops',
        message: `Unexpected error in ${options.table}.${options.operation}: ${sanitizeErrorMessage(errorMessage)}`,
        request_id: options.requestId,
        duration_ms: durationMs,
        metadata: {
          table: options.table,
          operation: options.operation,
          error_type: 'unexpected',
        },
      });
    } catch {
      // Logging falhou silenciosamente — nao impedir o chamador
    }

    throw unexpectedErr;
  }

  const durationMs = Date.now() - startedAt;

  try {
    if (result.error) {
      logError('db_error', {
        service: 'ops',
        message: `DB error in ${options.table}.${options.operation}: ${sanitizeErrorMessage(result.error.message)}`,
        request_id: options.requestId,
        duration_ms: durationMs,
        metadata: {
          table: options.table,
          operation: options.operation,
          error_code: result.error.code,
          error_details: result.error.details?.slice(0, 200),
        },
      });
    } else if (durationMs >= threshold) {
      logWarn('slow_query', {
        service: 'ops',
        message: `Slow query detected: ${options.table}.${options.operation} took ${durationMs}ms (threshold: ${threshold}ms)`,
        request_id: options.requestId,
        duration_ms: durationMs,
        metadata: {
          table: options.table,
          operation: options.operation,
          threshold_ms: threshold,
        },
      });
    }
  } catch {
    // Logging falhou silenciosamente — nao impedir o chamador
  }

  return result;
}

// ────────────────────────────────────────────────────────────
// Wrapper para RPC / funcoes stored
// ────────────────────────────────────────────────────────────

/**
 * Equivalente ao supabaseQuery para chamadas de RPC (stored procedures).
 *
 * @param fnName    - Nome da funcao RPC
 * @param queryFn   - Funcao que retorna a query RPC do Supabase
 * @param requestId - ID de rastreamento (opcional)
 */
export async function supabaseRpc<T>(
  fnName: string,
  queryFn: () => PromiseLike<SupabaseResult<T>>,
  requestId?: string,
): Promise<SupabaseResult<T>> {
  return supabaseQuery(
    { table: fnName, operation: 'rpc', requestId },
    queryFn,
  );
}

// ────────────────────────────────────────────────────────────
// Helper: medir operacoes customizadas (nao Supabase)
// ────────────────────────────────────────────────────────────

/**
 * Mede e loga o tempo de qualquer operacao async (nao precisa ser Supabase).
 * Util para medir chamadas a APIs externas com o mesmo padrao de logging.
 *
 * @param label    - Nome da operacao (ex: 'evolution_send_message')
 * @param options  - { service?, requestId?, slowThresholdMs? }
 * @param fn       - Funcao async a ser medida
 *
 * Lanca o erro original se a operacao falhar — nao faz swallow.
 */
export async function timedOperation<T>(
  label: string,
  options: { service?: string; requestId?: string; slowThresholdMs?: number },
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  const threshold = options.slowThresholdMs ?? env.SLOW_QUERY_THRESHOLD_MS;
  const service = options.service ?? 'ops';

  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;

    if (durationMs >= threshold) {
      try {
        logWarn('slow_query', {
          service,
          message: `Slow operation detected: ${label} took ${durationMs}ms (threshold: ${threshold}ms)`,
          request_id: options.requestId,
          duration_ms: durationMs,
          metadata: { label, threshold_ms: threshold },
        });
      } catch {
        // Silent
      }
    }

    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    try {
      logError('db_error', {
        service,
        message: `Operation failed: ${label} — ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`,
        request_id: options.requestId,
        duration_ms: durationMs,
        metadata: { label },
      });
    } catch {
      // Silent
    }

    throw err;
  }
}
