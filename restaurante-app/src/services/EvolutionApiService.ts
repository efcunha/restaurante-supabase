/**
 * Service for reservation WhatsApp notifications via Evolution API.
 * Kept intentionally focused on sendText to avoid coupling with web-only flows.
 */

const EVO_API_URL = 'https://evolution-api-production-9ac1.up.railway.app';
const EVO_API_KEY = 'Lueed28@13546289b@P@ssw0rd'.trim();

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
  async sendTextMessage(companyId: string, phone: string, text: string): Promise<any> {
    try {
      const response = await fetch(`${EVO_API_URL}/message/sendText/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVO_API_KEY,
        },
        body: JSON.stringify({
          number: normalizeBrazilPhone(phone),
          textMessage: { text },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erro ao enviar mensagem na Evolution API');
      }

      return data;
    } catch (error: any) {
      console.error('[EvolutionApiService] sendTextMessage error:', error);
      throw error;
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
