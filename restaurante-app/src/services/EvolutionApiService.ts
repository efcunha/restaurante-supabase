/**
 * Service for reservation WhatsApp notifications via Evolution API.
 * Kept intentionally focused on sendText to avoid coupling with web-only flows.
 */

const DEFAULT_EVO_API_URL = 'https://evolution-api-production-203d4.up.railway.app';

function normalizeEvolutionBaseUrl(rawUrl: string | undefined): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return DEFAULT_EVO_API_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin.replace(/\/+$/, '');
  } catch {
    throw new Error(`URL da Evolution API invalida: ${trimmed}`);
  }
}

// Vite/Expo substitui EXPO_PUBLIC_* em tempo de build
const EVO_API_URL = normalizeEvolutionBaseUrl(process.env.EXPO_PUBLIC_EVO_API_URL);
const EVO_API_KEY = String(process.env.EXPO_PUBLIC_EVO_API_KEY || '').trim();

function ensureApiKeyConfigured(): string {
  if (!EVO_API_KEY) {
    throw new Error('Configuracao ausente: defina EXPO_PUBLIC_EVO_API_KEY no ambiente e reinicie o app.');
  }
  return EVO_API_KEY;
}

function parseEvolutionApiError(response: Response, data: any, fallbackMessage: string): Error {
  if (response.status === 401 || response.status === 403) {
    return new Error('Unauthorized na Evolution API. Verifique EXPO_PUBLIC_EVO_API_KEY no ambiente ativo do app.');
  }

  return new Error(data?.message || data?.error || fallbackMessage);
}

function getFriendlyNetworkError(error: unknown): Error {
  const message = (error as any)?.message ? String((error as any).message) : '';
  const host = (() => {
    try {
      return new URL(EVO_API_URL).host;
    } catch {
      return EVO_API_URL;
    }
  })();

  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(message)) {
    return new Error(
      `Falha ao conectar na Evolution API (${host}). Verifique se a URL esta correta (EXPO_PUBLIC_EVO_API_URL) e se o servico esta ativo.`
    );
  }

  return error as Error;
}

export interface ConnectionStateResponse {
  instance?: {
    instanceName?: string;
    state?: string;
  };
  state?: string;
  statusString?: string;
  error?: string;
}

type ReservationNotificationStatus = 'pendente' | 'confirmada' | 'cancelada';

function normalizeBrazilPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) {
    throw new Error('Telefone do cliente ausente para envio via WhatsApp.');
  }

  return digits.startsWith('55') ? digits : `55${digits}`;
}

function formatReservationDate(dateTime: string): string {
  return new Date(dateTime).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function buildReservationNotificationText(params: {
  nome: string;
  quantidadePessoas: number;
  dataHoraReserva: string;
  status: ReservationNotificationStatus;
}): string {
  const { nome, quantidadePessoas, dataHoraReserva, status } = params;
  const formattedDate = formatReservationDate(dataHoraReserva);

  switch (status) {
    case 'confirmada':
      return `Olá ${nome}! Sua mesa para ${quantidadePessoas} pessoas no dia ${formattedDate} foi confirmada. Te esperamos.`;
    case 'cancelada':
      return `Olá ${nome}, infelizmente sua reserva para ${formattedDate} precisou ser cancelada. Entre em contato para mais detalhes.`;
    case 'pendente':
    default:
      return `Olá ${nome}! Sua solicitação de mesa para ${quantidadePessoas} pessoas está em análise. Avisaremos assim que for confirmada.`;
  }
}

export const EvolutionApiService = {
  async getConnectionState(companyId: string): Promise<ConnectionStateResponse> {
    try {
      const apiKey = ensureApiKeyConfigured();
      const response = await fetch(`${EVO_API_URL}/instance/connectionState/${companyId}`, {
        method: 'GET',
        headers: {
          apikey: apiKey,
        },
      });

      if (response.status === 404) {
        return { instance: { state: 'not_created' } };
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw parseEvolutionApiError(response, data, 'Erro ao buscar estado da conexão');
      }

      return data as ConnectionStateResponse;
    } catch (error: any) {
      console.error('[EvolutionApiService] getConnectionState error:', error);
      throw getFriendlyNetworkError(error);
    }
  },

  async sendTextMessage(companyId: string, phone: string, text: string): Promise<any> {
    try {
      const apiKey = ensureApiKeyConfigured();
      const response = await fetch(`${EVO_API_URL}/message/sendText/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: normalizeBrazilPhone(phone),
          textMessage: { text },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw parseEvolutionApiError(response, data, 'Erro ao enviar mensagem na Evolution API');
      }

      return data;
    } catch (error: any) {
      console.error('[EvolutionApiService] sendTextMessage error:', error);
      throw getFriendlyNetworkError(error);
    }
  },

  async sendReservationStatusNotification(params: {
    companyId: string;
    phone: string;
    nome: string;
    quantidadePessoas: number;
    dataHoraReserva: string;
    status: ReservationNotificationStatus;
  }): Promise<any> {
    const text = buildReservationNotificationText({
      nome: params.nome,
      quantidadePessoas: params.quantidadePessoas,
      dataHoraReserva: params.dataHoraReserva,
      status: params.status,
    });

    return this.sendTextMessage(params.companyId, params.phone, text);
  },
};
