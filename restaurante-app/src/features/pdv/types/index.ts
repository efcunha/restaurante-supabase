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
