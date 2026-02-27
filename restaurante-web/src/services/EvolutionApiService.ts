/**
 * Serviço para interagir com a Evolution API v1.8.2
 * Responsável por gerenciar a conexão do WhatsApp de forma multi-empresa.
 */

// NOTA DE SEGURANÇA: Em produção, idealmente estas variáveis devem vir do .env (ex: import.meta.env.VITE_EVO_API_URL)
// ou as chamadas roteadas por uma Edge Function do Supabase para não expor a API_KEY.
const EVO_API_URL = 'https://evolution-api-production-9ac1.up.railway.app';
const EVO_API_KEY = 'Lueed28@13546289b@P@ssw0rd';

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

export const EvolutionApiService = {
  /**
   * Cria uma nova instância na API para a empresa informada.
   * Na V1.8.2, enviamos integration: 'WHATSAPP-BAILEYS' e qrcode: true
   */
  async createInstance(companyId: string): Promise<any> {
    try {
      const response = await fetch(`${EVO_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVO_API_KEY,
        },
        body: JSON.stringify({
          instanceName: companyId,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar instância na Evolution API');
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
      // O parâmetro ?b64=true garante que se houver QRCode, a API retorna a string base64
      const response = await fetch(`${EVO_API_URL}/instance/connectionState/${companyId}?b64=true`, {
        method: 'GET',
        headers: {
          'apikey': EVO_API_KEY,
        },
      });

      const data = await response.json();
      return data as ConnectionStateResponse;
    } catch (error: any) {
      console.error('[EvolutionApiService] getConnectionState error:', error);
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
};
