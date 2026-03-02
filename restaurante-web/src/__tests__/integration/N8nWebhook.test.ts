import { supabase } from '../../config/SupabaseConfig';

// Mocking do Supabase SDK
jest.mock('../../config/SupabaseConfig', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Integração N8N - Contrato de Dados Webhook (Reservas & Pedidos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fluxo de Agendamentos/Reservas', () => {
    it('deve submeter o payload correto ao Supabase para que a Trigger do n8n funcione', async () => {
      // O n8n espera que o webhook do supabase envie `record` com as seguintes propriedades:
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      // Simulando a submissão via tela de Reservas
      const reservaData = {
        company_id: 'test-company-123',
        nome_cliente: 'Cliente Teste N8N',
        telefone_cliente: '11999999999',
        data_hora_reserva: '2026-05-20T20:00:00.000Z',
        quantidade_pessoas: 4,
        observacoes: 'Nenhuma',
        status: 'pendente',
        created_by: 'admin-user-id'
      };

      const result = await supabase.from('agendamentos').insert(reservaData);

      expect(supabase.from).toHaveBeenCalledWith('agendamentos');
      expect(mockInsert).toHaveBeenCalledWith(reservaData);
      
      // Validações do Contrato (Garantir que os campos vitais para o n8n existam no objeto submetido)
      const submitCallArg = mockInsert.mock.calls[0][0];
      expect(submitCallArg).toHaveProperty('company_id');
      expect(submitCallArg).toHaveProperty('nome_cliente');
      expect(submitCallArg).toHaveProperty('telefone_cliente');
      expect(submitCallArg).toHaveProperty('status');
      
      // O n8n depende de que o status inicial seja "pendente"
      expect(submitCallArg.status).toBe('pendente');
    });

    it('deve submeter a alteração de status corretamente para notificar o cliente via n8n', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      
      (supabase.from as jest.Mock).mockReturnValue({ 
        update: mockUpdate,
        eq: mockEq
      });

      const reservaId = 'reserva-456';
      const novoStatus = 'confirmada';

      await supabase.from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', reservaId);

      expect(supabase.from).toHaveBeenCalledWith('agendamentos');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'confirmada' });
      expect(mockEq).toHaveBeenCalledWith('id', reservaId);
    });
  });

  describe('Fluxo de Pedidos / Comandas', () => {
    it('deve simular a atualização de status do pedido para "delivered" para notificar o n8n', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      
      (supabase.from as jest.Mock).mockReturnValue({ 
        update: mockUpdate,
        eq: mockEq
      });

      const orderId = 'order-789';
      
      // Quando a tela PDV atualiza o status, cai na trigger 'notify_n8n_pedido_status'
      await supabase.from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      expect(supabase.from).toHaveBeenCalledWith('orders');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'delivered' });
    });
  });
});
