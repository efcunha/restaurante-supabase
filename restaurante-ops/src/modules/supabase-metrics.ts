import { supabase } from '../auth/supabase.js';

export interface SupabaseMetrics {
  status: 'online' | 'offline';
  activeConnections?: number;
  databaseSize?: string;
  responseTime?: number;
  error?: string;
  detail?: string;
}

export async function getSupabaseMetrics(): Promise<SupabaseMetrics> {
  const start = Date.now();

  try {
    // Test connectivity com query simples
    const { error: connError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (connError) {
      return {
        status: 'offline',
        error: connError.message,
        detail: 'Falha ao consultar companies',
        responseTime: Date.now() - start,
      };
    }

    // Tenta buscar stats via RPC se disponível, senão usa valores padrão
    let activeConnections: number | undefined;
    let databaseSize: string | undefined;

    try {
      const { data: statsData } = await supabase.rpc('get_db_stats');
      if (statsData) {
        activeConnections = statsData.active_connections;
        databaseSize = statsData.database_size_mb ? `${statsData.database_size_mb}MB` : undefined;
      }
    } catch {
      // RPC não existe ainda, usa valores padrão
    }

    const responseTime = Date.now() - start;

    return {
      status: 'online',
      activeConnections,
      databaseSize,
      responseTime,
      detail: 'Consulta simples ao Supabase concluida com sucesso',
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      status: 'offline',
      error,
      detail: 'Erro inesperado na coleta de metricas do banco',
      responseTime: Date.now() - start,
    };
  }
}
