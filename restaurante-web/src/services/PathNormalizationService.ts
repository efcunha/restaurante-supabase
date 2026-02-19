/**
 * Path Normalization Service
 * 
 * Garante que todos os acessos a dados de pedidos usem o padrão consistente:
 * companies/{companyId}/orders/{orderId}
 * 
 * Requirements: 13.3
 */

/**
 * Padrão de path normalizado
 */
export const NORMALIZED_PATHS = {
  orders: (companyId: string) => `companies/${companyId}/orders`,
  order: (companyId: string, orderId: string) => `companies/${companyId}/orders/${orderId}`,
  archived: (companyId: string) => `companies/${companyId}/archived`,
  archivedOrder: (companyId: string, orderId: string) => `companies/${companyId}/archived/${orderId}`,
  statistics: (companyId: string) => `companies/${companyId}/statistics`,
  dailyStats: (companyId: string, dateKey: string) => `companies/${companyId}/statistics/${dateKey}`,
  users: (companyId: string) => `companies/${companyId}/users`,
  user: (companyId: string, userId: string) => `companies/${companyId}/users/${userId}`,
  payments: (companyId: string) => `companies/${companyId}/payments`,
  payment: (companyId: string, paymentId: string) => `companies/${companyId}/payments/${paymentId}`
} as const;

/**
 * Paths legados (deprecated) - para migração
 */
export const LEGACY_PATHS = {
  // Paths antigos que devem ser migrados
  rootOrders: 'pedidos',
  rootOrder: (orderId: string) => `pedidos/${orderId}`,
  companyPedidos: (companyId: string) => `companies/${companyId}/pedidos`,
  companyPedido: (companyId: string, orderId: string) => `companies/${companyId}/pedidos/${orderId}`
} as const;

/**
 * Path Normalization Service
 */
class PathNormalizationService {
  /**
   * Valida se um path segue o padrão normalizado
   */
  isNormalizedPath(path: string): boolean {
    // Padrão esperado: companies/{companyId}/orders/{orderId}
    const normalizedPattern = /^companies\/[^/]+\/orders(\/[^/]+)?$/;
    
    // Também aceita archived, statistics, users, payments
    const validPatterns = [
      /^companies\/[^/]+\/orders(\/[^/]+)?$/,
      /^companies\/[^/]+\/archived(\/[^/]+)?$/,
      /^companies\/[^/]+\/statistics(\/[^/]+)?$/,
      /^companies\/[^/]+\/users(\/[^/]+)?$/,
      /^companies\/[^/]+\/payments(\/[^/]+)?$/
    ];

    return validPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Valida se um path é legado (precisa migração)
   */
  isLegacyPath(path: string): boolean {
    const legacyPatterns = [
      /^pedidos(\/[^/]+)?$/,  // Root-level pedidos
      /^companies\/[^/]+\/pedidos(\/[^/]+)?$/  // pedidos ao invés de orders
    ];

    return legacyPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Converte path legado para path normalizado
   */
  normalizePath(legacyPath: string, companyId?: string): string {
    // Se já está normalizado, retorna como está
    if (this.isNormalizedPath(legacyPath)) {
      return legacyPath;
    }

    // Root-level pedidos -> companies/{companyId}/orders
    if (legacyPath.startsWith('pedidos/')) {
      if (!companyId) {
        throw new Error('companyId é obrigatório para normalizar path root-level');
      }
      const orderId = legacyPath.split('/')[1];
      return NORMALIZED_PATHS.order(companyId, orderId);
    }

    if (legacyPath === 'pedidos') {
      if (!companyId) {
        throw new Error('companyId é obrigatório para normalizar path root-level');
      }
      return NORMALIZED_PATHS.orders(companyId);
    }

    // companies/{companyId}/pedidos -> companies/{companyId}/orders
    const pedidosPattern = /^companies\/([^/]+)\/pedidos(\/([^/]+))?$/;
    const match = legacyPath.match(pedidosPattern);
    
    if (match) {
      const [, pathCompanyId, , orderId] = match;
      if (orderId) {
        return NORMALIZED_PATHS.order(pathCompanyId, orderId);
      }
      return NORMALIZED_PATHS.orders(pathCompanyId);
    }

    // Se não reconheceu o padrão, retorna como está
    console.warn('[PathNormalization] Path não reconhecido:', legacyPath);
    return legacyPath;
  }

  /**
   * Extrai companyId de um path normalizado
   */
  extractCompanyId(path: string): string | null {
    const pattern = /^companies\/([^/]+)\//;
    const match = path.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Extrai orderId de um path normalizado
   */
  extractOrderId(path: string): string | null {
    const pattern = /\/(orders|archived|pedidos)\/([^/]+)$/;
    const match = path.match(pattern);
    return match ? match[2] : null;
  }

  /**
   * Valida integridade de path
   */
  validatePathIntegrity(path: string): {
    valid: boolean;
    normalized: boolean;
    legacy: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const normalized = this.isNormalizedPath(path);
    const legacy = this.isLegacyPath(path);

    // Path não pode ser nem normalizado nem legado
    if (!normalized && !legacy) {
      errors.push('Path não segue nenhum padrão conhecido');
    }

    // Path legado deve ser migrado
    if (legacy) {
      errors.push('Path usa padrão legado e deve ser migrado');
    }

    // Valida estrutura básica
    if (!path.includes('/')) {
      errors.push('Path deve conter pelo menos uma barra');
    }

    // Valida que não tem barras duplas
    if (path.includes('//')) {
      errors.push('Path contém barras duplas');
    }

    // Valida que não termina com barra
    if (path.endsWith('/')) {
      errors.push('Path não deve terminar com barra');
    }

    return {
      valid: errors.length === 0,
      normalized,
      legacy,
      errors
    };
  }

  /**
   * Obtém path normalizado para orders
   */
  getOrdersPath(companyId: string): string {
    return NORMALIZED_PATHS.orders(companyId);
  }

  /**
   * Obtém path normalizado para order específico
   */
  getOrderPath(companyId: string, orderId: string): string {
    return NORMALIZED_PATHS.order(companyId, orderId);
  }

  /**
   * Obtém path normalizado para archived
   */
  getArchivedPath(companyId: string): string {
    return NORMALIZED_PATHS.archived(companyId);
  }

  /**
   * Obtém path normalizado para archived order específico
   */
  getArchivedOrderPath(companyId: string, orderId: string): string {
    return NORMALIZED_PATHS.archivedOrder(companyId, orderId);
  }

  /**
   * Obtém path normalizado para statistics
   */
  getStatisticsPath(companyId: string): string {
    return NORMALIZED_PATHS.statistics(companyId);
  }

  /**
   * Obtém path normalizado para daily statistics
   */
  getDailyStatsPath(companyId: string, dateKey: string): string {
    return NORMALIZED_PATHS.dailyStats(companyId, dateKey);
  }

  /**
   * Obtém path normalizado para users
   */
  getUsersPath(companyId: string): string {
    return NORMALIZED_PATHS.users(companyId);
  }

  /**
   * Obtém path normalizado para user específico
   */
  getUserPath(companyId: string, userId: string): string {
    return NORMALIZED_PATHS.user(companyId, userId);
  }

  /**
   * Obtém path normalizado para payments
   */
  getPaymentsPath(companyId: string): string {
    return NORMALIZED_PATHS.payments(companyId);
  }

  /**
   * Obtém path normalizado para payment específico
   */
  getPaymentPath(companyId: string, paymentId: string): string {
    return NORMALIZED_PATHS.payment(companyId, paymentId);
  }

  /**
   * Valida que todos os paths em uma lista estão normalizados
   */
  validateAllPaths(paths: string[]): {
    allNormalized: boolean;
    normalizedCount: number;
    legacyCount: number;
    invalidCount: number;
    details: Array<{
      path: string;
      status: 'normalized' | 'legacy' | 'invalid';
    }>;
  } {
    const details = paths.map(path => {
      const validation = this.validatePathIntegrity(path);
      
      let status: 'normalized' | 'legacy' | 'invalid';
      if (validation.normalized) {
        status = 'normalized';
      } else if (validation.legacy) {
        status = 'legacy';
      } else {
        status = 'invalid';
      }

      return { path, status };
    });

    const normalizedCount = details.filter(d => d.status === 'normalized').length;
    const legacyCount = details.filter(d => d.status === 'legacy').length;
    const invalidCount = details.filter(d => d.status === 'invalid').length;

    return {
      allNormalized: normalizedCount === paths.length,
      normalizedCount,
      legacyCount,
      invalidCount,
      details
    };
  }
}

// Singleton instance
export const pathNormalizationService = new PathNormalizationService();

// Export para testes
export { PathNormalizationService };
