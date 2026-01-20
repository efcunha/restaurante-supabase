
// Cardápio constante usado para fallback/cálculo de preços
export const CARDAPIO_STATIC = {
    caldos: [
        { name: 'Caldinho de Macaxeira', price: 15 },
        { name: 'Caldo de Fava', price: 18 },
        { name: 'Caldo de Camarão', price: 25 },
    ],
    comidas: [
        { name: 'Risoto de Camarão', price: 25 },
        { name: 'Risoto de Charque', price: 20 },
        { name: 'Risoto de Frango', price: 20 },
        { name: 'Risoto de Queijo', price: 20 },
    ],
    bebidas: [
        { name: 'Refrigerante Lata', price: 7 },
        { name: 'Refri Lata', price: 7 },
        { name: 'Refrigerante 1L', price: 10 },
        { name: 'Água Mineral', price: 4 },
        { name: 'Água com Gás', price: 4 },
        { name: 'Suco', price: 6 }
    ],
    espetinhos: []
};

export const fixDecimal = (value) => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
};

// Calcular preço de um item baseado no cardápio
export const calcularPrecoItem = (itemText) => {
    try {
        const qtdMatch = itemText.match(/^(\d+)x?\s*/);
        const qtd = qtdMatch ? parseInt(qtdMatch[1], 10) : 1;
        let nome = itemText.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim();

        // Detectar tamanho para caldos
        let precoUnit = 0;
        if (nome.includes('300ml')) {
            precoUnit = 15.00;
        } else if (nome.includes('180ml')) {
            precoUnit = 10.00;
        } else {
            // Buscar no cardápio
            const produto = [...CARDAPIO_STATIC.caldos, ...CARDAPIO_STATIC.comidas, ...CARDAPIO_STATIC.bebidas]
                .find(p => nome.toLowerCase().includes(p.name.toLowerCase()));
            precoUnit = produto?.price || 15.00;
        }

        return {
            quantidade: qtd,
            nomeCompleto: itemText.replace(/^\d+x?\s*/, '').trim(),
            precoUnitario: precoUnit,
            subtotal: fixDecimal(qtd * precoUnit)
        };
    } catch (error) {
        console.error('[CalcPrecoItem] Erro:', itemText, error);
        return {
            quantidade: 1,
            nomeCompleto: itemText,
            precoUnitario: 15.00,
            subtotal: 15.00
        };
    }
};

// Calcular total de um pedido
export const calcularTotalPedido = (pedido) => {
    if (!pedido.items || !Array.isArray(pedido.items)) {
        return Number(pedido.totalPrice) || 0;
    }

    let total = 0;
    pedido.items.forEach(itemText => {
        const itemCalc = calcularPrecoItem(itemText);
        total += itemCalc.subtotal;
    });

    return fixDecimal(total);
};
