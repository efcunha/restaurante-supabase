export type DevicePaymentMethod = 'cartao_credito' | 'cartao_debito';

export type DevicePaymentStatus =
  | 'idle'
  | 'processing'
  | 'approved'
  | 'declined'
  | 'timeout'
  | 'error';

export interface DevicePaymentRequest {
  companyId: string;
  comandaNumber: string;
  amount: number;
  paymentMethod: DevicePaymentMethod;
  idempotencyKey: string;
}

export interface DevicePaymentResult {
  status: DevicePaymentStatus;
  transactionId?: string;
  providerPaymentId?: string;
  authCode?: string;
  message: string;
}

export type ScaleReadingStatus =
  | 'idle'
  | 'not_initialized'
  | 'connecting'
  | 'ready'
  | 'reading'
  | 'stable'
  | 'unstable'
  | 'timeout'
  | 'unavailable'
  | 'error';

export interface ScaleReading {
  weightKg: number;
  isStable: boolean;
  capturedAt: string;
  raw?: string | null;
}

export interface ScaleBridgeResult {
  status: ScaleReadingStatus;
  reading?: ScaleReading;
  message: string;
  source?: 'automatic' | 'manual';
}

export interface ScaleBridgeStatus {
  serialOpen: boolean;
  port?: string;
  baud?: number;
  protocol?: string;
  lastReading?: string | null;
  error?: string | null;
  timestamp: string;
}

export interface ScaleBridgePort {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}
