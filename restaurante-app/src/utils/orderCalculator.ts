/**
 * utils/orderCalculator.ts
 * Funções para cálculo de preços de pedidos
 * 
 * Requirements: 22.1, 22.2
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MenuItem {
  name: string;
  price: number;
}

export interface MenuCategory {
  caldos: MenuItem[];
  comidas: MenuItem[];
  bebidas: MenuItem[];
  espetinhos: MenuItem[];
}

export interface ItemCalculation {
  quantidade: number;
  nomeCompleto: string;
  precoUnitario: number;
  subtotal: number;
}

export interface Order {
  items?: string[];
  totalPrice?: number;
  priceMap?: Record<string, number>;
  [key: string]: any;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Cardápio constante usado para fallback/cálculo de preços
export const CARDAPIO_STATIC: MenuCategory = {
  caldos: [
    { name: 'Caldinho de Macaxeira', price: 15 },
    { name: 'Caldo de Fava', price: 18 },
    { name: 'Caldo de Camarão', price: 25 },
    { name: 'Caldo de Peixe', price: 20 },
    { name: 'Caldo de Sururu', price: 20 },
  ],
  comidas: [
    { name: 'Risoto de Camarão', price: 25 },
    { name: 'Risoto de Charque', price: 20 },
    { name: 'Risoto de Frango', price: 20 },
    { name: 'Risoto de Queijo', price: 20 },
    { name: 'Batata Frita', price: 20 },
    { name: 'Macaxeira Frita', price: 12 },
    { name: 'Charque Acebolado', price: 25 },
  ],
  bebidas: [
    { name: 'Refrigerante Lata', price: 7 },
    { name: 'Refri Lata', price: 7 },
    { name: 'Refrigerante 1L', price: 10 },
    { name: 'Água Mineral', price: 4 },
    { name: 'Água com Gás', price: 4 },
    { name: 'Suco', price: 6 },
    { name: 'Chopp', price: 8 }, // Inclui Chopp 400 ML se matching for parcial
    { name: 'Cerveja', price: 9 },
  ],
  espetinhos: [
    { name: 'Carne', price: 12.00 },
    { name: 'Frango', price: 12.00 },
    { name: 'Frango com Bacon', price: 12.00 },
    { name: 'Calabresa', price: 12.00 },
    { name: 'Coração', price: 12.00 },
    { name: 'Medalhão', price: 12.00 },
    { name: 'Salsichão', price: 12.00 },
    { name: 'Pão de Alho', price: 12.00 },
    { name: 'Asinha', price: 12.00 }
  ]
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Arredonda valor para 2 casas decimais
 */
export const fixDecimal = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Calcular preço de um item baseado no cardápio ou mapa de preços
 */
export const calcularPrecoItem = (itemText: string, cardapioDin?: MenuItem[], priceMap?: Record<string, number>): ItemCalculation => {
  try {
    const qtyMatch = itemText.match(/^(\d+)x?\s*/);
    const qtd = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
    const itemFull = itemText.replace(/^\d+x?\s*/, '').trim();
    const nomeBase = itemFull.replace(/\s*\(.*\)$/, '').trim();
    
    // Normalização para comparação mais robusta
    const itemFullLower = itemFull.toLowerCase();
    const nomeBaseLower = nomeBase.toLowerCase();

    let precoUnit = 0;
    let found = false;

    // 1. Tentar no priceMap (Prioridade Máxima - Cache/UI)
    if (priceMap) {
        if (priceMap[itemText] !== undefined) {
             precoUnit = fixDecimal(priceMap[itemText] / (qtd || 1));
             found = true;
        } else if (priceMap[itemFull] !== undefined) {
             precoUnit = priceMap[itemFull];
             found = true;
        } else if (priceMap[itemFullLower] !== undefined) {
             precoUnit = priceMap[itemFullLower];
             found = true;
        } else if (priceMap[nomeBaseLower] !== undefined) {
             precoUnit = priceMap[nomeBaseLower];
             found = true;
        }
    }

    // 2. Regras de negócio específicas (Tamanhos de Caldos)
    if (!found) {
        if (itemFullLower.includes('caldo') || itemFullLower.includes('caldinho') || itemFullLower.includes('calde')) {
            if (itemFullLower.includes('300ml')) {
                precoUnit = 15.00;
                found = true;
            } else if (itemFullLower.includes('180ml')) {
                precoUnit = 10.00;
                found = true;
            }
        }
    }

    // 3. Busca no cardápio dinâmico
    if (!found && cardapioDin && cardapioDin.length > 0) {
        const produto = cardapioDin.find(p => {
            const pNameLower = p.name.toLowerCase();
            return itemFullLower === pNameLower || nomeBaseLower === pNameLower || itemFullLower.includes(pNameLower);
        });
        if (produto) {
            precoUnit = produto.price;
            found = true;
        }
    }

    // 4. Fallback no cardápio estático
    if (!found) {
        const staticItems = [
            ...CARDAPIO_STATIC.caldos,
            ...CARDAPIO_STATIC.comidas,
            ...CARDAPIO_STATIC.bebidas,
            ...CARDAPIO_STATIC.espetinhos
        ];
        // Prioritize exact match
        let staticProd = staticItems.find(p => p.name.toLowerCase() === nomeBaseLower);
        
        // Then try startsWith (e.g. "Caldinho de Camarão" matches "Caldinho de Camarão 300ml")
        if (!staticProd) {
             staticProd = staticItems.find(p => itemFullLower.startsWith(p.name.toLowerCase()));
        }

        // Then try reverse inclusion (item includes product name) - e.g. "Sanduiche de Frango" includes "Frango"
        if (!staticProd) {
             staticProd = staticItems.find(p => itemFullLower.includes(p.name.toLowerCase()));
        }
        
        // Removed loose pName.includes(nomeBase) to prevent "Risoto de Frango" matching "Frango"

        if (staticProd) precoUnit = staticProd.price;
    }

    return {
      quantidade: qtd,
      nomeCompleto: itemFull,
      precoUnitario: precoUnit,
      subtotal: fixDecimal(qtd * precoUnit)
    };
  } catch (error) {
    console.error('[CalcPrecoItem] Erro:', itemText, error);
    return {
      quantidade: 1,
      nomeCompleto: itemText,
      precoUnitario: 0,
      subtotal: 0
    };
  }
};

/**
 * Calcular total de um pedido
 */
export const calcularTotalPedido = (pedido: Order, cardapioDin?: MenuItem[]): number => {
  if (!pedido.items || !Array.isArray(pedido.items)) {
    return Number(pedido.totalPrice) || 0;
  }

  let total = 0;

  // 1. Tentar usar items_with_status se existir (contém unitPrice e quantity exatos)
  const itemsWithStatus = pedido.items_with_status || pedido.itemsWithStatus;
  if (itemsWithStatus && Array.isArray(itemsWithStatus) && itemsWithStatus.length > 0 && itemsWithStatus.every((i: any) => typeof i.unitPrice === 'number')) {
    total = itemsWithStatus.reduce((acc: number, item: any) => acc + (item.unitPrice * (item.quantity || 1)), 0);
    return fixDecimal(total);
  }

  // Fallback para o cálculo antigo
  pedido.items.forEach((itemText: string) => {
    let itemPrice = 0;
    let found = false;

    if (pedido.priceMap) {
      const cleanName = itemText.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();
      const qtyMatch = itemText.match(/^(\d+)x?\s*/);
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      if (pedido.priceMap[itemText] !== undefined) {
        itemPrice = pedido.priceMap[itemText];
        found = true;
      } else if (pedido.priceMap[cleanName] !== undefined) {
        itemPrice = pedido.priceMap[cleanName] * quantity;
        found = true;
      }
    }

    if (!found) {
      const itemCalc = calcularPrecoItem(itemText, cardapioDin);
      itemPrice = itemCalc.subtotal;
    }

    total += itemPrice;
  });

  return fixDecimal(total);
};

/**
 * Calcular o valor total JÁ PAGO de um pedido
 * (Baseado no itemsWithStatus e pagamentos parciais)
 */
export const calcularPagoPedido = (pedido: any, cardapioDin?: MenuItem[]): number => {
    // 1. Se o pedido está marcado como pago no cabeçalho, retorna o total dele
    if (pedido.is_paid === true || pedido.is_paid === 'true' || pedido.is_paid === 1 || pedido.isPago === true) {
        return Number(pedido.totalPrice || pedido.total_amount) || 0;
    }

    // 2. Se tem items_with_status, soma os itens pagos individualmente
    const items = pedido.items_with_status || pedido.itemsWithStatus || [];
    if (items.length > 0) {
        let totalPago = 0;
        items.forEach((item: any) => {
            const qty = item.quantity || 1;
            const paidQty = item.paid_quantity || (item.paid ? qty : 0);
            
            if (paidQty > 0) {
                // Tenta obter unitPrice salvo diretamente do item_with_status
                let unitPrice = 0;
                let found = false;

                if (typeof item.unitPrice === 'number') {
                    unitPrice = item.unitPrice;
                    found = true;
                }

                // Fallback legado para priceMap
                if (!found && pedido.priceMap) {
                    const cleanName = item.name.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();
                    if (pedido.priceMap[item.name] !== undefined) {
                      unitPrice = pedido.priceMap[item.name] / qty;
                      found = true;
                    } else if (pedido.priceMap[cleanName] !== undefined) {
                      unitPrice = pedido.priceMap[cleanName];
                      found = true;
                    }
                }

                // Fallback para cálculo base
                if (!found) {
                    const calc = calcularPrecoItem(item.name, cardapioDin);
                    unitPrice = calc.precoUnitario;
                }

                totalPago += (paidQty * unitPrice);
            }
        });
        return fixDecimal(totalPago);
    }

    return 0;
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  CARDAPIO_STATIC,
  fixDecimal,
  calcularPrecoItem,
  calcularTotalPedido,
  calcularPagoPedido
};
