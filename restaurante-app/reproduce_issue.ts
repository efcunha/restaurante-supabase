
// Mock helpers
// @ts-nocheck

const extrairNome = (itemText) => {
    return itemText.replace(/^\d+\s*x?\s*/, '').trim();
};

const extractQuantity = (item) => {
    const match = item.match(/^(\d+)x?\s*/);
    return parseInt(match?.[1] || '1', 10) || 1;
};

// Simulation of OrderService.generateItemsWithStatus
const generateItemsWithStatus = (items) => {
    const result = [];
    let absoluteIndex = 0;

    items.forEach(item => {
        const qty = extractQuantity(item);
        const itemNameWithoutQty = item.replace(/^\d+x?\s*/, '').trim();

        for (let i = 0; i < qty; i++) {
            result.push({
                id: `item-${absoluteIndex}`,
                name: itemNameWithoutQty, 
                category: 'pizza',
                quantity: 1,
            });
            absoluteIndex++;
        }
    });
    return result;
};

// Simulation of CozinhaScreen grouping
const simulateCozinhaGrouping = (itemsWithStatus) => {
    const caldosPendentes = itemsWithStatus.map(item => ({
        id: item.id,
        nome: extrairNome(item.name),
        quantidade: 1,
        comanda: '123'
    }));

    const grupos = {};
    caldosPendentes.forEach(caldo => {
        if (!grupos[caldo.nome]) {
            grupos[caldo.nome] = {
                nome: caldo.nome,
                total: 0,
                comandas: []
            };
        }
        grupos[caldo.nome].total += caldo.quantidade;
        grupos[caldo.nome].comandas.push({
            numero: caldo.comanda,
            quantidade: caldo.quantidade
        });
    });
    return Object.values(grupos);
};

// Simulation of addPizzaToOrder logic
const simulatePizzaCreation = () => {
    const sizeName = 'Grande';
    const flavorsString = 'Calabresa';
    const extrasNames = ['Borda: Catupiry', 'Bacon Extra'];

    let itemName = `Pizza ${sizeName} (${flavorsString})`;
    if (extrasNames.length > 0) {
        itemName += ` + ${extrasNames.join(', ')}`;
    }
    
    // Simulate what happens in handleSubmit
    const qty = 1;
    const itemText = `${qty}x ${itemName}`;
    
    return [itemText];
};

// Run simulation
const items = simulatePizzaCreation();
console.log('Items string:', items);

const itemsWithStatus = generateItemsWithStatus(items);
console.log('Items with Status:', JSON.stringify(itemsWithStatus, null, 2));

const cozinhaGroups = simulateCozinhaGrouping(itemsWithStatus);
console.log('Cozinha Groups:', JSON.stringify(cozinhaGroups, null, 2));

// Assertion
if (cozinhaGroups.length > 0 && cozinhaGroups[0].nome.includes('Borda: Catupiry')) {
    console.log('SUCCESS: Extras are present in Cozinha Group Name');
} else {
    console.log('FAILURE: Extras are MISSING from Cozinha Group Name');
}
