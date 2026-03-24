/**
 * Audit Service - Migrado para Supabase
 * 
 * Sistema de auditoria para rastreamento de operações críticas:
 * - Todas as operações de escrita (create, update, delete)
 * - Eventos de autenticação (login, logout, falhas)
 * - Eventos de permissão negada
 * - Mudanças em campos sensíveis (isPago, role, etc.)
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5
 */

import { supabase } from '../config/SupabaseConfig';

/**
 * Tipos de eventos auditáveis
 */
export type AuditEventType =
  // Autenticação
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  | 'auth.password_changed'
  // Pedidos
  | 'order.created'
  | 'order.updated'
  | 'order.deleted'
  | 'order.payment_changed'
  | 'order.status_changed'
  | 'order.item_cancelled'
  // Comandas
  | 'comanda.cancelled'
  // Usuários
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  // Produtos
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.price_changed'
  // Empresa
  | 'company.created'
  | 'company.updated'
  | 'company.settings_changed'
  // Permissões
  | 'permission.denied'
  | 'permission.granted'
  // Sistema
  | 'system.error'
  | 'system.warning'
  // Relatorios
  | 'report.cancellation_generated';

/**
 * Tipos de recursos auditáveis
 */
export type ResourceType = 
  | 'order' 
  | 'comanda'
  | 'user' 
  | 'product' 
  | 'company' 
  | 'payment'
  | 'settings'
  | 'report';

/**
 * Severidade do evento
 */
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Mudança em um campo específico
 */
export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Registro de auditoria
 */
export interface AuditLog {
  id?: string;
  
  // Evento
  eventType: AuditEventType;
  severity: AuditSeverity;
  
  // Recurso afetado
  resourceType: ResourceType;
  resourceId: string;
  
  // Tenant
  companyId: string;
  
  // Usuário que executou a ação
  userId: string;
  userEmail: string;
  userRole: string;
  
  // Mudanças
  before?: Record<string, any>;
  after?: Record<string, any>;
  changes?: FieldChange[];
  
  // Contexto adicional
  metadata?: Record<string, any>;
  
  // Informações de rede
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamp
  timestamp: string;
}

/**
 * Filtros para busca de logs
 */
export interface AuditLogFilters {
  companyId?: string;
  userId?: string;
  eventType?: AuditEventType;
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: AuditSeverity;
  limit?: number;
}

/**
 * Serviço de Auditoria
 */
export class AuditService {
  private readonly tableName = 'audit_logs';

  /**
   * Registra um evento de auditoria
   */
  async log(params: {
    eventType: AuditEventType;
    resourceType: ResourceType;
    resourceId: string;
    companyId: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado. Não é possível criar log de auditoria.');
    }

    // Calcula mudanças se before e after foram fornecidos
    const changes = this.calculateChanges(params.before, params.after);

    // Determina severidade baseada no tipo de evento
    const severity = this.determineSeverity(params.eventType);

    // Busca role do usuário
    const userRole = await this.getUserRole(user.id);

    // Cria registro de auditoria
    const auditLog = {
      event_type: params.eventType,
      severity,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      company_id: params.companyId,
      user_id: user.id,
      user_email: user.email || '',
      user_role: userRole,
      old_data: params.before || null,
      new_data: params.after || null,
      changes: changes || null,
      metadata: params.metadata || null,
    };

    // Salva no Supabase
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(auditLog)
      .select()
      .single();

    if (error) {
      console.error('[Audit] Erro ao salvar log:', error);
      throw error;
    }

    // Log para console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('[Audit]', params.eventType, {
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        userId: user.id,
        changes: changes?.length || 0
      });
    }

    return data.id;
  }

  /**
   * Registra evento de autenticação
   */
  async logAuthEvent(
    eventType: Extract<AuditEventType, 'auth.login' | 'auth.logout' | 'auth.failed_login'>,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const auditLog = {
      event_type: eventType,
      severity: eventType === 'auth.failed_login' ? 'high' : 'low',
      resource_type: 'user',
      resource_id: userId,
      company_id: metadata?.companyId || '',
      user_id: userId,
      user_email: metadata?.email || '',
      user_role: metadata?.role || '',
      metadata: metadata || null,
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(auditLog)
      .select()
      .single();

    if (error) {
      console.error('[Audit] Erro ao salvar log de auth:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Registra evento de permissão negada
   */
  async logPermissionDenied(params: {
    resourceType: ResourceType;
    resourceId: string;
    companyId: string;
    attemptedAction: string;
    reason: string;
  }): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const userRole = await this.getUserRole(user.id);

    const auditLog = {
      event_type: 'permission.denied' as AuditEventType,
      severity: 'high' as AuditSeverity,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      company_id: params.companyId,
      user_id: user.id,
      user_email: user.email || '',
      user_role: userRole,
      metadata: {
        attemptedAction: params.attemptedAction,
        reason: params.reason
      },
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(auditLog)
      .select()
      .single();

    if (error) {
      console.error('[Audit] Erro ao salvar log de permissão negada:', error);
      throw error;
    }

    // Log warning para console
    console.warn('[Audit] Permission Denied', {
      userId: user.id,
      resource: `${params.resourceType}/${params.resourceId}`,
      action: params.attemptedAction,
      reason: params.reason
    });

    return data.id;
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async queryLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    let query = supabase
      .from(this.tableName)
      .select('*');

    // Aplica filtros
    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    // Ordena por timestamp decrescente
    query = query.order('created_at', { ascending: false });

    // Limita resultados
    const maxLimit = filters.limit || 100;
    query = query.limit(maxLimit);

    // Executa query
    const { data, error } = await query;

    if (error) {
      console.error('[Audit] Erro ao buscar logs:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      companyId: row.company_id,
      userId: row.user_id,
      userEmail: row.user_email,
      userRole: row.user_role,
      before: row.old_data,
      after: row.new_data,
      changes: row.changes,
      metadata: row.metadata,
      timestamp: row.created_at,
    }));
  }

  /**
   * Busca logs de um recurso específico
   */
  async getResourceLogs(
    resourceType: ResourceType,
    resourceId: string,
    maxResults: number = 50
  ): Promise<AuditLog[]> {
    return this.queryLogs({
      resourceType,
      resourceId,
      limit: maxResults
    });
  }

  /**
   * Busca logs de um usuário específico
   */
  async getUserLogs(
    userId: string,
    maxResults: number = 100
  ): Promise<AuditLog[]> {
    return this.queryLogs({
      userId,
      limit: maxResults
    });
  }

  /**
   * Busca eventos de segurança (falhas de login, permissões negadas)
   */
  async getSecurityEvents(
    companyId: string,
    days: number = 7
  ): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.queryLogs({
      companyId,
      startDate,
      severity: 'high',
      limit: 500
    });

    // Filtra apenas eventos de segurança
    return logs.filter(log => 
      log.eventType.startsWith('auth.failed') ||
      log.eventType === 'permission.denied'
    );
  }

  /**
   * Calcula mudanças entre dois estados
   */
  private calculateChanges(
    before?: Record<string, any>,
    after?: Record<string, any>
  ): FieldChange[] | undefined {
    if (!before || !after) {
      return undefined;
    }

    const changes: FieldChange[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    allKeys.forEach(key => {
      const oldValue = before[key];
      const newValue = after[key];

      // Ignora campos de timestamp e metadata
      if (key === 'updatedAt' || key === 'lastModifiedAt') {
        return;
      }

      // Compara valores
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue
        });
      }
    });

    return changes.length > 0 ? changes : undefined;
  }

  /**
   * Determina severidade baseada no tipo de evento
   */
  private determineSeverity(eventType: AuditEventType): AuditSeverity {
    // Eventos críticos
    if (
      eventType === 'order.payment_changed' ||
      eventType === 'comanda.cancelled' ||
      eventType === 'user.role_changed' ||
      eventType === 'permission.denied' ||
      eventType === 'auth.failed_login' ||
      eventType === 'product.price_changed'
    ) {
      return 'critical';
    }

    // Eventos de alta severidade
    if (
      eventType.includes('deleted') ||
      eventType === 'auth.mfa_disabled' ||
      eventType === 'company.settings_changed'
    ) {
      return 'high';
    }

    // Eventos de média severidade
    if (
      eventType.includes('updated') ||
      eventType === 'order.item_cancelled' ||
      eventType === 'report.cancellation_generated' ||
      eventType.includes('changed')
    ) {
      return 'medium';
    }

    // Eventos de baixa severidade (criação, login normal)
    return 'low';
  }

  /**
   * Obtém role do usuário do Supabase profiles
   */
  private async getUserRole(userId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return 'unknown';
      }

      return data.role || 'unknown';
    } catch (error) {
      console.error('Erro ao obter role do usuário:', error);
      return 'unknown';
    }
  }
}

// Singleton instance
export const auditService = new AuditService();

/**
 * Helper: Wrapper para operações que devem ser auditadas
 */
export async function withAudit<T>(
  operation: () => Promise<T>,
  auditParams: {
    eventType: AuditEventType;
    resourceType: ResourceType;
    resourceId: string;
    companyId: string;
    getBefore?: () => Promise<Record<string, any>>;
    getAfter?: () => Promise<Record<string, any>>;
    metadata?: Record<string, any>;
  }
): Promise<T> {
  let before: Record<string, any> | undefined;
  let after: Record<string, any> | undefined;

  try {
    // Captura estado antes
    if (auditParams.getBefore) {
      before = await auditParams.getBefore();
    }

    // Executa operação
    const result = await operation();

    // Captura estado depois
    if (auditParams.getAfter) {
      after = await auditParams.getAfter();
    }

    // Registra auditoria de sucesso
    await auditService.log({
      eventType: auditParams.eventType,
      resourceType: auditParams.resourceType,
      resourceId: auditParams.resourceId,
      companyId: auditParams.companyId,
      before,
      after,
      metadata: auditParams.metadata
    });

    return result;
  } catch (error) {
    // Registra auditoria de falha
    await auditService.log({
      eventType: auditParams.eventType,
      resourceType: auditParams.resourceType,
      resourceId: auditParams.resourceId,
      companyId: auditParams.companyId,
      before,
      metadata: {
        ...auditParams.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }
    });

    throw error;
  }
}
