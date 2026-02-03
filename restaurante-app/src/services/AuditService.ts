/**
 * Audit Service
 * 
 * Sistema de auditoria para rastreamento de operações críticas:
 * - Todas as operações de escrita (create, update, delete)
 * - Eventos de autenticação (login, logout, falhas)
 * - Eventos de permissão negada
 * - Mudanças em campos sensíveis (isPago, role, etc.)
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5
 */

import { db, auth } from '../config/firebaseConfig';
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

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
  | 'system.warning';

/**
 * Tipos de recursos auditáveis
 */
export type ResourceType = 
  | 'order' 
  | 'user' 
  | 'product' 
  | 'company' 
  | 'payment'
  | 'settings';

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
  timestamp: Timestamp;
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
  private readonly collectionPath = 'audit';

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
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado. Não é possível criar log de auditoria.');
    }

    // Calcula mudanças se before e after foram fornecidos
    const changes = this.calculateChanges(params.before, params.after);

    // Determina severidade baseada no tipo de evento
    const severity = this.determineSeverity(params.eventType);

    // Cria registro de auditoria
    const auditLog: Omit<AuditLog, 'id'> = {
      eventType: params.eventType,
      severity,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      companyId: params.companyId,
      userId: currentUser.uid,
      userEmail: currentUser.email || '',
      userRole: await this.getUserRole(currentUser.uid),
      before: params.before,
      after: params.after,
      changes,
      metadata: params.metadata,
      timestamp: Timestamp.now()
    };

    // Salva no Firestore
    const docRef = await addDoc(collection(db, this.collectionPath), auditLog);

    // Log para console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('[Audit]', params.eventType, {
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        userId: currentUser.uid,
        changes: changes?.length || 0
      });
    }

    return docRef.id;
  }

  /**
   * Registra evento de autenticação
   */
  async logAuthEvent(
    eventType: Extract<AuditEventType, 'auth.login' | 'auth.logout' | 'auth.failed_login'>,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const auditLog: Omit<AuditLog, 'id'> = {
      eventType,
      severity: eventType === 'auth.failed_login' ? 'high' : 'low',
      resourceType: 'user',
      resourceId: userId,
      companyId: metadata?.companyId || '',
      userId,
      userEmail: metadata?.email || '',
      userRole: metadata?.role || '',
      metadata,
      timestamp: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, this.collectionPath), auditLog);
    return docRef.id;
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
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const auditLog: Omit<AuditLog, 'id'> = {
      eventType: 'permission.denied',
      severity: 'high',
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      companyId: params.companyId,
      userId: currentUser.uid,
      userEmail: currentUser.email || '',
      userRole: await this.getUserRole(currentUser.uid),
      metadata: {
        attemptedAction: params.attemptedAction,
        reason: params.reason
      },
      timestamp: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, this.collectionPath), auditLog);

    // Log warning para console
    console.warn('[Audit] Permission Denied', {
      userId: currentUser.uid,
      resource: `${params.resourceType}/${params.resourceId}`,
      action: params.attemptedAction,
      reason: params.reason
    });

    return docRef.id;
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async queryLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    let q = query(collection(db, this.collectionPath));

    // Aplica filtros
    if (filters.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }

    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    if (filters.eventType) {
      q = query(q, where('eventType', '==', filters.eventType));
    }

    if (filters.resourceType) {
      q = query(q, where('resourceType', '==', filters.resourceType));
    }

    if (filters.resourceId) {
      q = query(q, where('resourceId', '==', filters.resourceId));
    }

    if (filters.severity) {
      q = query(q, where('severity', '==', filters.severity));
    }

    if (filters.startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }

    // Ordena por timestamp decrescente
    q = query(q, orderBy('timestamp', 'desc'));

    // Limita resultados
    const maxLimit = filters.limit || 100;
    q = query(q, limit(maxLimit));

    // Executa query
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog));
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
      eventType.includes('changed')
    ) {
      return 'medium';
    }

    // Eventos de baixa severidade (criação, login normal)
    return 'low';
  }

  /**
   * Obtém role do usuário (via custom claims ou Firestore)
   */
  private async getUserRole(userId: string): Promise<string> {
    try {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        // Tenta obter de custom claims
        const idTokenResult = await currentUser.getIdTokenResult();
        if (idTokenResult.claims.role) {
          return idTokenResult.claims.role as string;
        }
      }

      // Fallback: busca no Firestore
      // TODO: Implementar busca no Firestore se necessário
      return 'unknown';
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
