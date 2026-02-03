/**
 * ServiceContainer.ts
 * Dependency Injection container for all services
 * 
 * Requirements: 23.2, 23.3
 */

import OrderService from './OrderService';
import OrderFirestoreService from './OrderFirestoreService';
import StatisticsService from './StatisticsService';
import AuthService from './AuthService';
import CaixaService from './CaixaService';
import ComandasService from './ComandasService';
import PagamentosService from './PagamentosService';
import CacheLayerService from './CacheLayerService';
import AuditService from './AuditService';
import RateLimiterService from './RateLimiterService';

// ============================================================================
// TYPES
// ============================================================================

type ServiceName = 
  | 'orderService'
  | 'orderFirestoreService'
  | 'statisticsService'
  | 'authService'
  | 'caixaService'
  | 'comandasService'
  | 'pagamentosService'
  | 'cacheService'
  | 'auditService'
  | 'rateLimiterService';

// ============================================================================
// SERVICE CONTAINER
// ============================================================================

/**
 * ServiceContainer
 * Provides centralized access to all services with dependency injection
 */
class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Initialize all services
   */
  private initializeServices(): void {
    // Core Services
    this.services.set('cacheService', CacheLayerService);
    this.services.set('auditService', AuditService);
    this.services.set('rateLimiterService', RateLimiterService);

    // Business Services
    this.services.set('orderService', OrderService);
    this.services.set('orderFirestoreService', OrderFirestoreService);
    this.services.set('statisticsService', StatisticsService);
    this.services.set('authService', AuthService);
    this.services.set('caixaService', CaixaService);
    this.services.set('comandasService', ComandasService);
    this.services.set('pagamentosService', PagamentosService);

    console.log('[ServiceContainer] Services initialized');
  }

  /**
   * Get service by name
   */
  get<T>(serviceName: ServiceName): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  /**
   * Register a custom service (for testing or extensions)
   */
  register<T>(serviceName: string, service: T): void {
    this.services.set(serviceName, service);
  }

  /**
   * Check if service exists
   */
  has(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const serviceContainer = ServiceContainer.getInstance();
export default ServiceContainer;
