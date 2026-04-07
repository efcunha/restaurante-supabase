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

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

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
      message: typeof payload.error === 'string' ? payload.error : 'Falha ao iniciar pagamento na maquininha.',
    };
  }

  return {
    status: mapBackendStatusToDeviceStatus(payload.status),
    transactionId: typeof payload.transactionId === 'string' ? payload.transactionId : undefined,
    authCode: typeof payload.authCode === 'string' ? payload.authCode : undefined,
    message: typeof payload.message === 'string' ? payload.message : 'Pagamento presencial iniciado com sucesso.',
  };
}
