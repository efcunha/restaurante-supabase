/**
 * Serviço para interagir com a Evolution API v1.8.2
 * Responsável por gerenciar a conexão do WhatsApp de forma multi-empresa.
 */

// NOTA DE SEGURANÇA: Em produção, idealmente estas variáveis devem vir do .env (ex: import.meta.env.VITE_EVO_API_URL)
// ou as chamadas roteadas por uma Edge Function do Supabase para não expor a API_KEY.
const EVO_API_URL = 'https://evolution-api-production-9ac1.up.railway.app';
// A chave não deve ter espaços sobrando que causam 403 Forbidden
const EVO_API_KEY = 'Lueed28@13546289b@P@ssw0rd'.trim();

export interface ConnectionStateResponse {
  instance?: {
    instanceName: string;
    state: string;
  };
  state?: string;
  statusString?: string;
  error?: string;
  base64?: string;
  qrcode?: string;
  count?: number;
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
  /**
   * Cria uma nova instância na API. 
   */
  async createInstance(companyId: string): Promise<any> {
    try {
      const response = await fetch(`${EVO_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVO_API_KEY,
          'globalApiKey': EVO_API_KEY, // Evolution v2 required for admin endpoints
          'Authorization': `Bearer ${EVO_API_KEY}`,
        },
        body: JSON.stringify({
          instanceName: companyId,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Se der 403 (falta de global key para criar) ou 400 (já existe), 
        // assumimos que a instância já está lá e tentamos apenas conectar/pegar o QR
        if (response.status === 403 || response.status === 400 || data?.message?.includes('already exists')) {
          console.log('[EvolutionApiService] Instância já existe ou criação bloqueada. Buscando QR code de conexão direta...');
          return await this.connectInstance(companyId);
        }
        throw new Error(data.message || data.error || 'Erro ao criar instância na Evolution API');
      }

      return data;
    } catch (error: any) {
      console.error('[EvolutionApiService] createInstance error:', error);
      throw error;
    }
  },

  /**
   * Busca o estado atual de conexão da instância e o QR Code (se existir).
   */
  async getConnectionState(companyId: string): Promise<ConnectionStateResponse> {
    try {
      const response = await fetch(`${EVO_API_URL}/instance/connectionState/${companyId}`, {
        method: 'GET',
        headers: {
          'apikey': EVO_API_KEY,
        },
      });

      if (response.status === 404) {
        // Um 404 é perfeitamente normal: significa que o restaurante
        // ainda não tem instância criada. Retornamos um estado customizado.
        return { instance: { state: 'not_created' } } as any;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erro ao buscar estado da conexão');
      }

      return data as ConnectionStateResponse;
    } catch (error: any) {
      console.error('[EvolutionApiService] getConnectionState error:', error);
      throw error;
    }
  },

  /**
   * Conecta a instância e retorna o QR Code em base64 se estiver pendente
   */
  async connectInstance(companyId: string): Promise<any> {
    try {
      const response = await fetch(`${EVO_API_URL}/instance/connect/${companyId}`, {
        method: 'GET',
        headers: {
          'apikey': EVO_API_KEY,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erro ao conectar instância');
      }

      return data;
    } catch (error: any) {
      console.error('[EvolutionApiService] connectInstance error:', error);
      throw error;
    }
  },

  /**
   * Realiza o logout/deleção da instância no WhatsApp.
   */
  async logoutInstance(companyId: string): Promise<any> {
    try {
      const response = await fetch(`${EVO_API_URL}/instance/logout/${companyId}`, {
        method: 'DELETE',
        headers: {
          'apikey': EVO_API_KEY,
        },
      });

      return await response.json();
    } catch (error: any) {
      console.error('[EvolutionApiService] logoutInstance error:', error);
      throw error;
    }
  },

  async sendTextMessage(companyId: string, phone: string, text: string): Promise<any> {
    try {
      const response = await fetch(`${EVO_API_URL}/message/sendText/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVO_API_KEY,
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
