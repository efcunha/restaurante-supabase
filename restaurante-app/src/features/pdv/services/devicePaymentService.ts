import { supabase } from '../../../config/SupabaseConfig';
import { isFeatureEnabled } from '../../../config/featureFlags';
import { DevicePaymentRequest, DevicePaymentResult } from '../types';

function getOpsBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_OPS_BASE_URL || '').replace(/\/$/, '');
}

function buildPaymentMethodLabel(paymentMethod: DevicePaymentRequest['paymentMethod']): string {
  return paymentMethod === 'cartao_credito' ? 'credito' : 'debito';
}

function mapBackendStatusToDeviceStatus(status: unknown): DevicePaymentResult['status'] {
  const normalized = typeof status === 'string' ? status.toLowerCase() : '';
  if (normalized === 'succeeded' || normalized === 'approved') return 'approved';
  if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'declined') return 'declined';
  if (normalized === 'processing' || normalized === 'pending') return 'processing';
  return 'error';
}

function getPayloadMessage(payload: Record<string, unknown>, fallback: string): string {
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  return fallback;
}

async function getAccessToken(): Promise<string | undefined> {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.access_token;
}

export async function initiateDevicePayment(request: DevicePaymentRequest): Promise<DevicePaymentResult> {
  if (!isFeatureEnabled('pdv_enabled') || !isFeatureEnabled('pdv_devicePayment_enabled')) {
    return {
      status: 'error',
      message: 'Pagamento por maquininha desabilitado por feature flag.',
    };
  }

  if (request.amount <= 0) {
    return {
      status: 'error',
      message: 'Valor invalido para pagamento presencial.',
    };
  }

  if (process.env.EXPO_PUBLIC_PDV_DEVICE_SIMULATION === 'true') {
    return {
      status: 'approved',
      transactionId: `sim-${Date.now()}`,
      authCode: 'SIM-APPROVED',
      message: `Pagamento ${buildPaymentMethodLabel(request.paymentMethod)} aprovado (simulacao).`,
    };
  }

  const baseUrl = getOpsBaseUrl();
  if (!baseUrl) {
    return {
      status: 'error',
      message: 'EXPO_PUBLIC_OPS_BASE_URL nao configurada para iniciar maquininha.',
    };
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${baseUrl}/payments/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      companyId: request.companyId,
      comandaNumber: request.comandaNumber,
      amount: Math.round(request.amount * 100),
      paymentMethod: request.paymentMethod,
      idempotencyKey: request.idempotencyKey,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    return {
      status: 'error',
      message: getPayloadMessage(payload, 'Falha ao iniciar pagamento na maquininha.'),
    };
  }

  return {
    status: mapBackendStatusToDeviceStatus(payload.status),
    transactionId: typeof payload.transactionId === 'string' ? payload.transactionId : undefined,
    providerPaymentId: typeof payload.providerPaymentId === 'string' ? payload.providerPaymentId : undefined,
    authCode: typeof payload.authCode === 'string' ? payload.authCode : undefined,
    message: getPayloadMessage(payload, 'Pagamento presencial iniciado com sucesso.'),
  };
}

export async function getDevicePaymentStatus(transactionId: string): Promise<DevicePaymentResult> {
  const baseUrl = getOpsBaseUrl();
  if (!baseUrl) {
    return {
      status: 'error',
      message: 'EXPO_PUBLIC_OPS_BASE_URL nao configurada para consultar status da maquininha.',
    };
  }

  const safeTransactionId = String(transactionId || '').trim();
  if (!safeTransactionId) {
    return {
      status: 'error',
      message: 'transactionId invalido para consulta de status.',
    };
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${baseUrl}/payments/${encodeURIComponent(safeTransactionId)}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    return {
      status: 'error',
      transactionId: safeTransactionId,
      message: getPayloadMessage(payload, 'Falha ao consultar status da maquininha.'),
    };
  }

  return {
    status: mapBackendStatusToDeviceStatus(payload.status),
    transactionId: typeof payload.transactionId === 'string' ? payload.transactionId : safeTransactionId,
    providerPaymentId: typeof payload.providerPaymentId === 'string' ? payload.providerPaymentId : undefined,
    authCode: typeof payload.authCode === 'string' ? payload.authCode : undefined,
    message: getPayloadMessage(payload, 'Status da transacao atualizado.'),
  };
}
