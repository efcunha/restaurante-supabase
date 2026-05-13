/**
 * Utilitário para conversão de unidades (Inventory Management).
 * 
 * Suporta três contextos isolados:
 * 1. Volume (Base: ml)
 * 2. Massa/Peso (Base: mg)
 * 3. Quantidade (Base: un)
 * 
 * Não realiza conversão entre contextos (ex: Kg -> Litro) sem densidade.
 */

// Fatores de conversão para BASE (ml)
const VOLUME_RATES = {
    // Métrico
    ml: 1,
    l: 1000,
    dl: 100,
    cl: 10,

    // Imperial / US (aproximado para uso culinário ou comercial)
    gal: 3785.41, // US Gallon
    oz_fl: 29.5735, // US Fluid Ounce

    // Culinário (Padrão Brasileiro)
    xic: 240, // Xícara de chá
    cs: 15,   // Colher de sopa
    ds: 10,   // Colher de sobremesa
    cc: 5,    // Colher de chá
    cafe: 2.5 // Colher de café
};

// Fatores de conversão para BASE (mg)
const MASS_RATES = {
    // Métrico
    mg: 1,
    g: 1000,
    kg: 1000000,
    ton: 1000000000,

    // Imperial
    lb: 453592, // Pound
    oz: 28349.5 // Ounce
};

// Fatores de conversão para BASE (un)
const QUANTITY_RATES = {
    un: 1,
    dz: 12,     // Dúzia
    cen: 100,   // Cento
    mil: 1000,  // Milheiro
    cx: 1,      // Caixa (Ambíguo, tratado como 1 UN se não especificado, mas útil para normalizar)
    pct: 1      // Pacote (Ambíguo)
};

/**
 * Determina o tipo de unidade (volume, mass, quantity, or unknown).
 */
export const getUnitType = (unit) => {
    const u = unit?.toLowerCase()?.trim();
    if (VOLUME_RATES[u]) return 'volume';
    if (MASS_RATES[u]) return 'mass';
    if (QUANTITY_RATES[u]) return 'quantity';
    return 'unknown';
};

/**
 * Converte um valor de uma unidade para outra.
 * Retorna null se a conversão for impossível (tipos incompatíveis).
 * 
 * @param {number} value - Valor numérico
 * @param {string} fromUnit - Unidade de origem
 * @param {string} toUnit - Unidade de destino
 * @returns {number|null} Valor convertido ou null se erro
 */
export const convertUnit = (value, fromUnit, toUnit) => {
    if (value === null || value === undefined || isNaN(value)) return 0;

    const from = fromUnit?.toLowerCase()?.trim();
    const to = toUnit?.toLowerCase()?.trim();

    if (from === to) return value;

    const typeFrom = getUnitType(from);
    const typeTo = getUnitType(to);

    if (typeFrom === 'unknown' || typeTo === 'unknown') {
        console.warn(`[UnitConversion] Unidade desconhecida: ${from} ou ${to}`);
        return null;
    }

    if (typeFrom !== typeTo) {
        console.warn(`[UnitConversion] Incompatibilidade: Tentando converter ${typeFrom} (${from}) para ${typeTo} (${to})`);
        return null;
    }

    let baseValue;
    let finalValue;

    switch (typeFrom) {
        case 'volume':
            baseValue = value * VOLUME_RATES[from];
            finalValue = baseValue / VOLUME_RATES[to];
            break;
        case 'mass':
            baseValue = value * MASS_RATES[from];
            finalValue = baseValue / MASS_RATES[to];
            break;
        case 'quantity':
            baseValue = value * QUANTITY_RATES[from];
            finalValue = baseValue / QUANTITY_RATES[to];
            break;
    }

    return finalValue;
};

/**
 * Lista de unidades suportadas para UI (Dropdowns)
 */
export const SUPPORTED_UNITS = {
    VOLUME: Object.keys(VOLUME_RATES).sort(),
    MASS: Object.keys(MASS_RATES).sort(),
    QUANTITY: Object.keys(QUANTITY_RATES).sort()
};

export const ALL_UNITS = [
    ...SUPPORTED_UNITS.VOLUME,
    ...SUPPORTED_UNITS.MASS,
    ...SUPPORTED_UNITS.QUANTITY
];
