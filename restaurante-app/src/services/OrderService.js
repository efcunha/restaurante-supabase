/**
 * OrderService - Lógica de negócio para gerenciamento de pedidos
 */

// Cardápio
const CARDAPIO = {
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

class OrderService {
  calculateOrderTotal(items) {
    let total = 0;
    items.forEach((item) => {
      const price = this.calculateItemPrice(item);
      const quantity = this.extractQuantity(item);
      total += quantity * price;
    });
    return total;
  }

  extractQuantity(item) {
    const match = item.match(/^(\d+)x?\s*/);
    return parseInt(match?.[1], 10) || 1;
  }

  calculateItemPrice(item) {
    // Remover quantidade e tempero
    let itemName = item.replace(/^\d+x?\s*/, "").replace(/\s*\(.*\)$/, "").trim();
    const itemLower = itemName.toLowerCase();

    // NOTA: Este método usa preços hardcoded para compatibilidade com código legado
    // Para preços dinâmicos do Firestore, use calculateOrderTotalFromFirestore()

    // Caldos
    if (itemLower.includes('caldinho') || itemLower.includes('caldo')) {
      for (const [nome, preco] of Object.entries(CARDAPIO.caldos)) {
        if (itemLower.includes(nome.toLowerCase())) return preco;
      }
    }

    // Risotos
    if (itemLower.includes('risoto')) {
      for (const [nome, preco] of Object.entries(CARDAPIO.risotos)) {
        if (itemLower.includes(nome.toLowerCase())) return preco;
      }
    }

    // Bebidas
    if (itemLower.includes('refrigerante') && itemLower.includes('lata')) return CARDAPIO.bebidas['Refrigerante Lata'];
    if (itemLower.includes('refrigerante') && (itemLower.includes('1l') || itemLower.includes('litro'))) return CARDAPIO.bebidas['Refrigerante 1L'];
    if (itemLower.includes('água') && itemLower.includes('gás')) return CARDAPIO.bebidas['Água com Gás'];
    if (itemLower.includes('água')) return CARDAPIO.bebidas['Água Mineral'];
    if (itemLower.includes('suco')) return CARDAPIO.bebidas.Suco;

    // Jantinha Completa
    if (itemLower.includes('jantinha completa')) {
      if (itemLower.includes('carneiro')) return CARDAPIO.jantinhaCompleta.especiais.Carneiro;
      if (itemLower.includes('cupim')) return CARDAPIO.jantinhaCompleta.especiais['Bife de Cupim'];
      if (itemLower.includes('picanha')) return CARDAPIO.jantinhaCompleta.especiais.Picanha;
      return CARDAPIO.jantinhaCompleta.base;
    }

    // Jantinha 1 Acompanhamento
    if (itemLower.includes('jantinha') && (itemLower.includes('arroz') || itemLower.includes('macaxeira'))) {
      if (itemLower.includes('carneiro')) return CARDAPIO.jantinha1Acomp.especiais.Carneiro;
      if (itemLower.includes('cupim')) return CARDAPIO.jantinha1Acomp.especiais['Bife de Cupim'];
      if (itemLower.includes('picanha')) return CARDAPIO.jantinha1Acomp.especiais.Picanha;
      return CARDAPIO.jantinha1Acomp.base;
    }

    // Espetinhos Especiais
    if (itemLower.includes('carneiro')) return CARDAPIO.especiais.Carneiro;
    if (itemLower.includes('cupim')) return CARDAPIO.especiais.Cupim;
    if (itemLower.includes('picanha')) return CARDAPIO.especiais.Picanha;

    // Espetinhos Normais
    for (const [nome, preco] of Object.entries(CARDAPIO.espetinhos)) {
      if (itemLower.includes(nome.toLowerCase())) {
        return preco;
      }
    }
    return 0;
  }

  /* 
   * Categorias que devem aparecer na cozinha/montagem
   * Permite filtrar bebidas fora da visualização de produção
   */
  isKitchenCategory(category) {
    const KITCHEN_CATEGORIES = [
      'caldo',
      'espetinho-simples',
      'espetinho-especial',
      'porcao',
      'comida',
      'outro' // 'outro' geralmente é algo genérico que precisa ser feito
    ];
    // Se não tiver categoria, assume que é produçã (fallback seguro)
    if (!category) return true;
    return KITCHEN_CATEGORIES.includes(category);
  }

  /**
   * Cria um novo pedido
   * - Agora aceita categoryMap para enriquecer itens com categoria
   */
  createOrder(orderId, clientName, items, observations, comandaNumber = '', createdBy = '', createdByName = '', totalPrice = 0, isPago = false, mesa = '', categoryMap = null) {
    const now = new Date();
    const nowISO = now.toISOString();

    // CORREÇÃO: Usar data LOCAL para dateKey (consistente com getTodayKey)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const comanda = comandaNumber?.trim() || '';
    const calculatedTotal = totalPrice > 0 ? totalPrice : this.calculateOrderTotal(items);
    // Nasce em 'montagem' para aparecer em ambos painéis (churrasqueira e montagem)
    const status = 'montagem';

    // Formatar horário de criação (HH:MM)
    const horarioCriacao = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });

    // Criar estrutura de itens com status individual
    const itemsWithStatus = items.map((itemName, index) => {
      // Tentar encontrar a categoria
      let category = 'outro'; // Default

      if (categoryMap) {
        // Limpar nome para busca (remover '2x ', trim, lowercase)
        const cleanName = itemName.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();

        // Tentar encontrar no mapa
        // O mapa pode ser direto (nome -> category) ou objeto (nome -> { category })
        if (categoryMap[cleanName]) {
          if (typeof categoryMap[cleanName] === 'string') {
            category = categoryMap[cleanName];
          } else if (categoryMap[cleanName].category) {
            category = categoryMap[cleanName].category;
          }
        }
      }

      return {
        id: `${orderId}-comanda-${comanda || 'temp'}-item-${index}`,
        name: itemName,
        status: 'churrasqueira', // churrasqueira | pronto
        checked: false,
        timestamp: nowISO,
        category: category // ✅ Nova propriedade para filtragem
      };
    });

    const order = {
      id: orderId,
      client: clientName,
      mesa: mesa?.trim() || '', // Mesa opcional
      comandaNumber: comanda,
      items,
      itemsWithStatus, // Array de objetos com status individual
      observations,
      status,
      timestamp: nowISO,
      createdAt: nowISO,
      horarioCriacao, // Horário formatado HH:MM
      dateKey, // Campo para filtrar estatísticas por data
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
    };
    return order;
  }

  /**
   * Atualiza status (somente montagem interage)
   * Registra quem moveu o pedido para rastreabilidade
   */
  updateOrderStatus(order, newStatus, movidoPor = null, movidoPorNome = null) {
    const now = new Date().toISOString();
    const updates = { status: newStatus };

    switch (newStatus) {
      case 'churrasqueira':
        updates.timeInChurrasqueira = order.timeInChurrasqueira || now;
        break;
      case 'montagem':
        updates.timeInMontagem = now;
        updates.movidoParaMontagemPor = movidoPor;
        updates.movidoParaMontagemPorNome = movidoPorNome;
        break;
      case 'pronto':
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
  updateItemStatus(order, itemId, newStatus) {
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
  allItemsReady(order) {
    if (!order.itemsWithStatus || order.itemsWithStatus.length === 0) {
      return true; // Fallback: se não tem itemsWithStatus, considera pronto
    }
    return order.itemsWithStatus.every(item => item.checked === true);
  }

  /**
   * Atualiza dados do pedido (cliente, observações, itens)
   * Bloqueia edição se já estiver em montagem ou pronto (EXCETO para isPago)
   */
  updateOrder(order, updatedData) {
    // Permitir atualizar isPago mesmo em pedidos prontos/montagem (para pagamento)
    const apenasIsPago = Object.keys(updatedData).length === 1 && 'isPago' in updatedData;

    // Pode editar enquanto preparação não iniciou (timeInMontagem null) e não está pronto
    // OU se estiver apenas atualizando isPago
    if (!apenasIsPago && ((order.status === 'montagem' && order.timeInMontagem) || order.status === 'pronto')) {
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
  validateDelete(order) {
    if ((order.status === 'montagem' && order.timeInMontagem) || order.status === 'pronto') {
      throw new Error('Não é possível excluir pedidos após início da montagem ou prontos');
    }
    return true;
  }

  /**
   * Filtra pedidos por status
   * - Churrasqueira também visualiza os de montagem
   */
  filterOrdersByStatus(orders, status) {
    if (status === 'churrasqueira') {
      // Churrasqueira enxerga pedidos em montagem (visualização, sem interação)
      return orders.filter(order => order.status === 'montagem');
    }
    if (status === 'montagem') {
      // Montagem também mostra status 'montagem'
      return orders.filter(order => order.status === 'montagem');
    }
    return orders.filter(order => order.status === status);
  }

  /**
   * Resumo de espetos para churrasqueira (quantidades por tipo)
   */
  summarizeEspetos(items) {
    const counts = {};
    items.forEach(item => {
      const base = item.split(/\s+/)[0]; // simplificação
      if (/Refri|Água|Agua|Suco|Cerveja|Refrigerante/i.test(item)) return; // ignorar bebidas
      counts[base] = (counts[base] || 0) + (this.extractQuantity(item));
    });
    return counts;
  }

  extractBebidas(items) {
    return items.filter(i => /Refri|Refrigerante|Água|Agua|Suco|Cerveja/i.test(i));
  }

  classifyAcompanhamento(items) {
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
  findOrderById(orders, orderId) {
    return orders.find(order => order.id === orderId);
  }

  /**
   * Gera ID sequencial (#001, #002, etc.)
   */
  generateOrderId(counter) {
    return `#${String(counter).padStart(3, '0')}`;
  }

  /**
   * Verifica se pedido é urgente (mais de 15min)
   */
  isOrderUrgent(timestamp) {
    const orderTime = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now - orderTime) / 1000 / 60;
    return diffMinutes > 15;
  }
}

// Exportar instância única (singleton)
export default new OrderService();
