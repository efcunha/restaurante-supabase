import { getLocalDateKey } from '../utils/dateUtils';
import { Order, OrderItemStatus } from '../types';
import { calcularPrecoItem } from '../utils/orderCalculator';

/**
 * OrderService - Business Logic for Order Management
 * 
 * Handles creation, validation, and status transitions for orders.
 * Recent updates:
 * - Standardized date keys using utils/dateUtils
 * - Improved kitchen category detection (Pizza support)
 */

interface CardapioItem {
  [key: string]: number;
}

interface CardapioSection {
  [key: string]: number | CardapioItem | any;
}

// Cardápio
/**
 * @deprecated Use Supabase 'products' table instead. This hardcoded map is kept only for 
 * emergency fallback for legacy offline orders.
 */
const CARDAPIO: Record<string, CardapioSection> = {
  espetinhos: {
    'Carne': 12.00,
    'Frango': 12.00,
    'Frango com Bacon': 12.00,
    'Calabresa': 12.00,
    'Coração': 12.00,
    'Medalhão': 12.00,
    'Salsichão': 12.00,
    'Pão de Alho': 12.00,
    'Asinha': 12.00
  },

  especiais: {
    'Carneiro': 15.00,
    'Cupim': 18.00,
    'Picanha': 20.00
  },

  jantinhaCompleta: {
    base: 24.00,
    especiais: {
      'Carneiro': 27.00,
      'Bife de Cupim': 30.00,
      'Picanha': 36.00
    }
  },

  jantinha1Acomp: {
    base: 20.00,
    especiais: {
      'Carneiro': 21.00,
      'Bife de Cupim': 24.00,
      'Picanha': 30.00
    }
  },

  bebidas: {
    'Refrigerante Lata': 7.00,
    'Refrigerante 1L': 10.00,
    'Água Mineral': 4.00,
    'Água com Gás': 4.00,
    'Suco': 6.00
  },

  caldos: {
    'Caldinho de Macaxeira': 15.00,
    'Caldo de Camarão': 15.00,
    'Caldo de Fava': 15.00
  },

  risotos: {
    'Risoto de Camarão': 25.00,
    'Risoto de Charque': 25.00,
    'Risoto de Frango': 25.00,
    'Risoto de Queijo': 25.00
  }
};

const fixDecimal = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

class OrderService {
  calculateOrderTotal(items: string[]): number {
    let total = 0;
    items.forEach((item) => {
      const price = this.calculateItemPrice(item);
      const quantity = this.extractQuantity(item);
      total += quantity * price;
    });
    return total;
  }

  extractQuantity(item: string): number {
    const match = item.match(/^(\d+)x?\s*/);
    return parseInt(match?.[1] || '1', 10) || 1;
  }

  calculateItemPrice(item: string): number {
    const calc = calcularPrecoItem(item);
    return calc.precoUnitario;
  }

  /* 
   * Categorias que devem aparecer na cozinha/montagem
   * Permite filtrar bebidas fora da visualização de produção
   */
  isKitchenCategory(category?: string): boolean {
    const KITCHEN_CATEGORIES = [
      'caldo',
      'espetinho-simples',
      'espetinho-especial',
      'porcao',
      'comida',
      'pizza', // ✅ Adicionado para aparecer na cozinha/montagem
      'outro' // 'outro' geralmente é algo genérico que precisa ser feito
    ];
    // Se não tiver categoria, assume que é produçã (fallback seguro)
    if (!category) return true;
    return KITCHEN_CATEGORIES.includes(category);
  }

  /**
   * Helper gera itemsWithStatus a partir de lista de strings
   * Útil para criação e migração de pedidos legados
   * ATUALIZAÇÃO: Agora expande itens com quantidade > 1 (ex: "4x Item" -> 4 entradas de "1x Item")
   * ATUALIZAÇÃO: Agora aceita priceMap para incluir preço unitário
   */
  generateItemsWithStatus(
    items: string[],
    orderId: string,
    comanda: string,
    categoryMap: any = null,
    priceMap: Record<string, number> | undefined = undefined
  ): OrderItemStatus[] {
    const nowISO = new Date().toISOString();

    // 1. Expandir itens (ex: "4x Caldo" -> ["1x Caldo", "1x Caldo", "1x Caldo", "1x Caldo"])
    const expandedItems: { originalItem: string; itemNameWithoutQty: string; qty: number }[] = [];
    items.forEach(item => {
      const qty = this.extractQuantity(item);
      const itemNameWithoutQty = item.replace(/^\d+x?\s*/, '').trim();

      expandedItems.push({ originalItem: item, itemNameWithoutQty, qty });
    });

    console.log(`[OrderService] Generating ItemsWithStatus for ${items.length} original items`);

    const result: OrderItemStatus[] = [];
    let absoluteIndex = 0;

    expandedItems.forEach((info, index) => {
      const lowerName = info.itemNameWithoutQty.toLowerCase();
      let category = 'outro';

      if (categoryMap) {
        const cleanName = info.itemNameWithoutQty.replace(/\s*\(.*\)$/, '').trim().toLowerCase();
        if (categoryMap[cleanName]) {
          category = typeof categoryMap[cleanName] === 'string' ? categoryMap[cleanName] : categoryMap[cleanName].category;
        }
      }

      if (category === 'outro') {
        if (lowerName.includes('espetinho')) category = 'espetinho';
        else if (lowerName.includes('caldo') || lowerName.includes('caldinho')) category = 'caldo';
        else if (lowerName.includes('cerveja') || lowerName.includes('refrigerante') || lowerName.includes('suco')) category = 'bebida';
        else if (lowerName.includes('pizza')) category = 'pizza';
      }

      // Determine unit price from orderCalculator (using priceMap)
      const itemPriceCalc = calcularPrecoItem(info.originalItem, undefined, priceMap);
      const unitPrice = itemPriceCalc.precoUnitario;

      for (let i = 0; i < info.qty; i++) {
        result.push({
          id: `${orderId}-comanda-${comanda || 'temp'}-item-${absoluteIndex}`,
          name: info.itemNameWithoutQty, // REMOVIDO "1x " prefixo para evitar duplicidade visual
          status: 'preparing',
          checked: false,
          timestamp: nowISO,
          category: category,
          quantity: 1,
          unitPrice: unitPrice > 0 ? unitPrice : undefined
        });
        absoluteIndex++;
      }
    });

    return result;
  }

  /**
   * Cria um novo pedido
   * - Agora aceita categoryMap para enriquecer itens com categoria
   */
  createOrder(
    orderId: string,
    clientName: string,
    items: string[],
    observations: string,
    comandaNumber: string = '',
    createdBy: string = '',
    createdByName: string = '',
    totalPrice: number = 0,
    isPago: boolean = false,
    mesa: string = '',
    categoryMap: any = null,
    priceMap: Record<string, number> | undefined = undefined,
    tableId: string = '',
    waiterId: string = '',
    orderType: string = 'local',
    customerPhone: string = '',
    deliveryAddress: string = '',
    deliveryFee: number = 0
  ): Order {
    const now = new Date();
    const nowISO = now.toISOString();

    // CORREÇÃO: Usar data LOCAL consistente com o restante do app
    const dateKeyStr = getLocalDateKey();

    const comanda = comandaNumber?.trim() || '';
    const calculatedTotal = totalPrice > 0 ? totalPrice : this.calculateOrderTotal(items);
    // Mapear status do Firebase para Supabase
    // Firebase: 'montagem', 'churrasqueira', 'pronto'
    // Supabase: 'pending', 'preparing', 'ready', 'delivered', 'cancelled'
    const status = 'preparing'; // Era 'montagem', agora 'preparing'

    // Formatar horário de criação (HH:MM)
    const horarioCriacao = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      // @ts-ignore
      timeZone: 'America/Sao_Paulo'
    });

    const itemsWithStatus = this.generateItemsWithStatus(items, orderId, comanda, categoryMap, priceMap);
    
    // ATUALIZAÇÃO: Sincronizar order.items com a lista expandida para consistência visual/persistência
    const itemsFinal = itemsWithStatus.map(i => i.name);

    const order: Order = {
      id: orderId,
      client: clientName,
      mesa: mesa?.trim() || '', // Mesa opcional
      comandaNumber: comanda,
      items: itemsFinal,
      itemsWithStatus, // Array de objetos com status individual
      observations,
      status,
      timestamp: nowISO,
      createdAt: nowISO,
      horarioCriacao, // Horário formatado HH:MM
      dateKey: dateKeyStr, // Campo para filtrar estatísticas por data
      timeInChurrasqueira: nowISO,
      timeInMontagem: null,
      timeInProntos: null,
      deliveredAt: null,
      totalPrice: calculatedTotal,
      isPago,
      createdBy,
      createdByName,
      criadoPor: createdBy, // Alias para estatísticas
      criadoPorNome: createdByName, // Alias para compatibilidade com telas
      priceMap: priceMap || undefined,
      tableId,
      waiterId,
      orderType,
      customerPhone,
      deliveryAddress,
      deliveryFee,
    };
    return order;
  }

  /**
   * Atualiza status (somente montagem interage)
   * Registra quem moveu o pedido para rastreabilidade
   */
  updateOrderStatus(order: Order, newStatus: string, movidoPor: string | null = null, movidoPorNome: string | null = null): Order {
    const now = new Date().toISOString();
    const updates: Partial<Order> = { status: newStatus };

    switch (newStatus) {
      case 'preparing':
        updates.timeInMontagem = now;
        updates.movidoParaMontagemPor = movidoPor;
        updates.movidoParaMontagemPorNome = movidoPorNome;
        // Also update churrasqueira time if it wasn't set (fallback)
        if (!order.timeInChurrasqueira) {
          updates.timeInChurrasqueira = now;
        }
        break;
      case 'ready':
        updates.timeInProntos = now;
        updates.movidoParaProntoPor = movidoPor;
        updates.movidoParaProntoPorNome = movidoPorNome;
        break;
      case 'delivered':
        updates.deliveredAt = now;
        updates.entreguePor = movidoPor;
        updates.entreguePorNome = movidoPorNome;
        break;
    }

    return { ...order, ...updates };
  }

  /**
   * Atualiza status de um item individual dentro do pedido
   */
  updateItemStatus(order: Order, itemId: string, newStatus: string): Order {
    if (!order.itemsWithStatus) {
      throw new Error('Pedido não possui itemsWithStatus');
    }

    const updatedItems = order.itemsWithStatus.map(item =>
      item.id === itemId
        ? {
          ...item,
          status: newStatus,
          checked: newStatus === 'pronto',
          timestamp: new Date().toISOString()
        }
        : item
    );

    return {
      ...order,
      itemsWithStatus: updatedItems
    };
  }

  /**
   * Verifica se todos os itens do pedido estão prontos
   */
  allItemsReady(order: Order): boolean {
    if (!order.itemsWithStatus || order.itemsWithStatus.length === 0) {
      return true; // Fallback: se não tem itemsWithStatus, considera pronto
    }
    return order.itemsWithStatus.every(item => item.checked === true);
  }

  /**
   * Atualiza dados do pedido (cliente, observações, itens)
   * Bloqueia edição se já estiver em montagem ou pronto (EXCETO para isPago)
   */
  updateOrder(order: Order, updatedData: Partial<Order>): Order {
    // Permitir atualizar isPago mesmo em pedidos prontos/montagem (para pagamento)
    const apenasIsPago = Object.keys(updatedData).length === 1 && 'isPago' in updatedData;

    // Pode editar enquanto preparação não iniciou (timeInMontagem null) e não está pronto
    // OU se estiver apenas atualizando isPago
    if (!apenasIsPago && ((order.status === 'preparing' && order.timeInMontagem) || order.status === 'ready')) {
      throw new Error('Não é possível editar pedidos após início da montagem ou prontos');
    }

    const newItems = updatedData.items || order.items;
    const newTotal = this.calculateOrderTotal(newItems);

    return {
      ...order,
      ...updatedData,
      totalPrice: newTotal,
    };
  }

  /**
   * Valida se pedido pode ser excluído
   */
  validateDelete(order: Order): boolean {
    if ((order.status === 'preparing' && order.timeInMontagem) || order.status === 'ready') {
      throw new Error('Não é possível excluir pedidos após início da montagem ou prontos');
    }
    return true;
  }

  /**
   * Filtra pedidos por status
   * - Churrasqueira também visualiza os de montagem
   */
  filterOrdersByStatus(orders: Order[], status: string): Order[] {
    if (status === 'churrasqueira') {
      // Churrasqueira enxerga pedidos em montagem (visualização, sem interação)
      return orders.filter(order => order.status === 'preparing');
    }
    if (status === 'montagem') {
      // Montagem também mostra status 'preparing'
      return orders.filter(order => order.status === 'preparing');
    }
    return orders.filter(order => order.status === status);
  }

  /**
   * Resumo de espetos para churrasqueira (quantidades por tipo)
   */
  summarizeEspetos(items: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const base = item.split(/\s+/)[0]; // simplificação
      if (/Refri|Água|Agua|Suco|Cerveja|Refrigerante/i.test(item)) return; // ignorar bebidas
      counts[base] = (counts[base] || 0) + (this.extractQuantity(item));
    });
    return counts;
  }

  extractBebidas(items: string[]): string[] {
    return items.filter(i => /Refri|Refrigerante|Água|Agua|Suco|Cerveja/i.test(i));
  }

  classifyAcompanhamento(items: string[]): string {
    // procura palavras-chave
    const text = items.join(' ').toLowerCase();
    if (text.includes('completo')) return 'Completo';
    if (text.includes('macaxeira') && text.includes('arroz')) return 'Arroz + Macaxeira';
    if (text.includes('macaxeira')) return 'Só Macaxeira';
    if (text.includes('arroz')) return 'Só Arroz';
    if (text.includes('simples')) return 'Simples';
    return 'Indefinido';
  }

  /**
   * Busca pedido por ID
   */
  findOrderById(orders: Order[], orderId: string): Order | undefined {
    return orders.find(order => order.id === orderId);
  }

  /**
   * Gera ID sequencial (#001, #002, etc.)
   */
  generateOrderId(counter: number): string {
    return `#${String(counter).padStart(3, '0')}`;
  }

  /**
   * Verifica se pedido é urgente (mais de 15min)
   */
  isOrderUrgent(timestamp: string): boolean {
    const orderTime = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - orderTime.getTime()) / 1000 / 60;
    return diffMinutes > 15;
  }
}

// Exportar instância única (singleton)
export default new OrderService();
