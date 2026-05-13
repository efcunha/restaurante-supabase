import {
  initiatePayment,
  respondPaymentGatewayError,
  validateInitiatePaymentInput,
  type InitiatePaymentInput,
  type PaymentOperatorIdentity,
  type InitiatePaymentResult,
} from './payment-gateway.js';

interface InitiatePaymentBody {
  companyId?: unknown;
  comandaNumber?: unknown;
  amount?: unknown;
  paymentMethod?: unknown;
  idempotencyKey?: unknown;
}

interface InitiatePaymentEndpointDeps {
  initiatePaymentFn?: (input: InitiatePaymentInput) => Promise<InitiatePaymentResult>;
}

export interface InitiatePaymentEndpointResult {
  statusCode: number;
  payload: Record<string, unknown>;
}

function sanitizePlainText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function sanitizePaymentMethod(rawPaymentMethod: unknown): '' | 'cartao_credito' | 'cartao_debito' | 'pix' {
  if (rawPaymentMethod === 'cartao_credito') return 'cartao_credito';
  if (rawPaymentMethod === 'cartao_debito') return 'cartao_debito';
  if (rawPaymentMethod === 'pix') return 'pix';
  return '';
}

export async function handleInitiatePaymentEndpoint(
  body: InitiatePaymentBody,
  operator: PaymentOperatorIdentity,
  requestId?: string,
  deps: InitiatePaymentEndpointDeps = {},
): Promise<InitiatePaymentEndpointResult> {
  const input = {
    companyId: sanitizePlainText(String(body.companyId || '')),
    comandaNumber: sanitizePlainText(String(body.comandaNumber || '')),
    amount: Number(body.amount),
    paymentMethod: sanitizePaymentMethod(body.paymentMethod),
    idempotencyKey: sanitizePlainText(String(body.idempotencyKey || '')),
  } as Partial<InitiatePaymentInput>;

  const validationError = validateInitiatePaymentInput(input);
  if (validationError) {
    return {
      statusCode: 400,
      payload: {
        code: 'invalid_request',
        message: validationError,
        correlation_id: requestId ?? null,
      },
    };
  }

  if (input.companyId !== operator.companyId) {
    return {
      statusCode: 403,
      payload: {
        code: 'forbidden',
        message: 'companyId nao corresponde ao tenant autenticado.',
        correlation_id: requestId ?? null,
      },
    };
  }

  try {
    const paymentResult = await (deps.initiatePaymentFn ?? initiatePayment)(input as InitiatePaymentInput);
    return {
      statusCode: 202,
      payload: {
        status: paymentResult.status,
        transactionId: paymentResult.transactionId,
        providerPaymentId: paymentResult.providerPaymentId,
        nextAction: paymentResult.nextAction,
        amount: paymentResult.amount,
        paymentMethod: paymentResult.paymentMethod,
        message: paymentResult.message,
        correlation_id: paymentResult.correlationId,
        created_at: paymentResult.createdAt,
      },
    };
  } catch (error) {
    const response = respondPaymentGatewayError(error, requestId);
    return {
      statusCode: response.statusCode,
      payload: response.payload,
    };
  }
}
