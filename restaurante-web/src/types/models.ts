/**
 * TypeScript Data Models
 * 
 * Interfaces centralizadas para todos os data models do sistema.
 * Garante type safety e consistência em todo o código.
 * 
 * Requirements: 22.2
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// ORDER MODELS
// ============================================================================

export interface Order {
  id: string;
  companyId: string;
  comandaNumber: string;
  dateKey: string; // YYYY-MM-DD format
  status: OrderStatus;
  items: OrderItem[];
  itemsWithStatus?: any[]; // Array com status para cozinha/pagamento
  totalAmount: number;
  subtotal: number;
  tax: number;
  discount: number;
  isPago: boolean;
  createdBy: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  notes?: string;
  customerName?: string;
  mesa?: string;
  formaPagamento?: PaymentMethod;
  lastModifiedBy?: string;
  lastModifiedAt?: Date | Timestamp;
}

export type OrderStatus = 
  | 'pending'      // Pedido criado, aguardando preparo
  | 'preparing'    // Em preparo na cozinha
  | 'ready'        // Pronto para entrega
  | 'delivered'    // Entregue ao cliente
  | 'cancelled';   // Cancelado

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  modifiers?: ItemModifier[];
  status?: ItemStatus;
  paid?: boolean;
  paid_quantity?: number;
}

export type ItemStatus = 
  | 'pending'
  | 'preparing'
  | 'ready';

export interface ItemModifier {
  id: string;
  name: string;
  price: number;
}

// ============================================================================
// COMANDA MODELS
// ============================================================================

export interface Comanda {
  id: string;
  companyId: string;
  comandaNumber: string;
  dateKey: string;
  status: ComandaStatus;
  mesa?: string;
  totalAmount: number;
  isPago: boolean;
  createdBy: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  canceladaEm?: Date | Timestamp;
  fechadaEm?: Date | Timestamp;
}

export type ComandaStatus = 
  | 'aberta'      // Comanda aberta, aceitando pedidos
  | 'fechada'     // Comanda fechada, aguardando pagamento
  | 'cancelada';  // Comanda cancelada

// ============================================================================
// USER MODELS
// ============================================================================

export interface User {
  uid: string;
  email: string;
  nome?: string;
  companyId: string;
  role: UserRole;
  funcao?: string; // Deprecated, use role
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type UserRole = 
  | 'admin'       // Administrador completo
  | 'manager'     // Gerente (pode modificar isPago)
  | 'waiter'      // Garçom (cria pedidos)
  | 'kitchen'     // Cozinha (visualiza pedidos)
  | 'entregador'; // Entregador (acesso restrito às entregas)

export interface CustomClaims {
  companyId: string;
  role: UserRole;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  updatedAt: number;
}

// ============================================================================
// COMPANY MODELS
// ============================================================================

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  settings?: CompanySettings;
}

export interface CompanySettings {
  businessDayCutoff?: number; // Hora do corte (0-23), default 6
  categories?: MenuCategorySetting[];
  categoryOrder?: Record<string, number>;
}

export interface MenuCategorySetting {
  slug: string;
  name: string;
  order: number;
  active: boolean;
}

// ============================================================================
// STATISTICS MODELS
// ============================================================================

export interface DailyStatistics {
  companyId: string;
  dateKey: string; // YYYY-MM-DD
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  paidOrders: number;
  unpaidOrders: number;
  topItems: TopItem[];
  topWaiters: TopWaiter[];
  ordersByHour: Record<string, number>; // "14": 25 (25 pedidos às 14h)
  lastUpdated: Date | Timestamp;
  version: number;
}

export interface TopItem {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface TopWaiter {
  userId: string;
  name: string;
  ordersCount: number;
  totalRevenue: number;
}

// ============================================================================
// PAYMENT MODELS
// ============================================================================

export interface Payment {
  id: string;
  orderId: string;
  companyId: string;
  amount: number;
  method: PaymentMethod;
  paidBy: string;
  paidByEmail: string;
  paidByRole: UserRole;
  paidAt: Date | Timestamp;
  orderData: {
    comandaNumber: string;
    items: OrderItem[];
    createdAt: Date | Timestamp;
  };
  immutable: boolean;
  retroactive?: boolean;
}

export type PaymentMethod = 
  | 'dinheiro'
  | 'pix'
  | 'debito'
  | 'credito'
  | 'voucher';

// ============================================================================
// AUDIT MODELS
// ============================================================================

export interface AuditLog {
  id: string;
  companyId: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  resourceType: ResourceType;
  resourceId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  changes?: FieldChange[];
  timestamp: Date | Timestamp;
  ipAddress?: string;
  userAgent?: string;
  triggeredBy?: string;
}

export type AuditEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.mfa_enabled'
  | 'order.created'
  | 'order.updated'
  | 'order.deleted'
  | 'order.status_changed'
  | 'order.payment_changed'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'permission.denied';

export type AuditSeverity = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type ResourceType = 
  | 'order'
  | 'user'
  | 'product'
  | 'company'
  | 'comanda'
  | 'payment';

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

// ============================================================================
// RATE LIMIT MODELS
// ============================================================================

export interface RateLimit {
  userId: string;
  reads: number;
  writes: number;
  windowStart: Date | Timestamp;
  violations: number;
  blockedUntil?: Date | Timestamp;
  lastViolation?: Date | Timestamp;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remainingQuota: number;
  windowReset?: boolean;
  retryAfter?: number;
}

// ============================================================================
// CACHE MODELS
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  keys: string[];
}

// ============================================================================
// PAGINATION MODELS
// ============================================================================

export interface PageResult<T> {
  items: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface PaginationOptions {
  pageSize: number;
  cursor?: string;
  direction?: 'forward' | 'backward';
}

// ============================================================================
// VALIDATION MODELS
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule<T> {
  field: keyof T;
  validator: (value: any) => boolean;
  message: string;
}

// ============================================================================
// ERROR MODELS
// ============================================================================

export interface AppErrorContext {
  operation?: string;
  userId?: string;
  companyId?: string;
  resourceId?: string;
  [key: string]: any;
}

export type ErrorCategory = 
  | 'user_error'
  | 'system_error'
  | 'network_error';

// ============================================================================
// PRODUCT MODELS
// ============================================================================

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  unit: string;
  available: boolean;
  imageUrl?: string;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

// ============================================================================
// PIZZA EXTRAS MODELS
// ============================================================================

export interface Extra {
  id: string;
  companyId: string;
  type: 'borda' | 'adicional';
  name: string;
  price: number;
  active: boolean;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type ExtraType = 'borda' | 'adicional';

export interface SelectedExtra {
  extraId: string;
  name: string;
  type: ExtraType;
  price: number;
}

// ============================================================================
// ARCHIVE MODELS
// ============================================================================

export interface ArchivedOrder extends Omit<Order, 'items'> {
  archivedAt: Date | Timestamp;
  compressedData: string; // JSON stringified and compressed
  originalSize: number;
  compressedSize: number;
}

export interface ArchivalStats {
  totalArchived: number;
  totalSize: number;
  compressionRatio: number;
  oldestArchived: Date | Timestamp;
  newestArchived: Date | Timestamp;
}

// ============================================================================
// MIGRATION MODELS
// ============================================================================

export interface MigrationResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: MigrationError[];
}

export interface MigrationError {
  documentId: string;
  error: string;
  timestamp: Date;
}

export interface MigrationProgress {
  phase: string;
  totalDocuments: number;
  processedDocuments: number;
  successCount: number;
  failureCount: number;
  startedAt: Date;
  estimatedCompletion?: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Firestore document with ID
export type WithId<T> = T & { id: string };

// Omit Firestore-specific fields for creation
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

// Update input (all fields optional except id)
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt'>> & { id: string };
