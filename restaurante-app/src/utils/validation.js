/**
 * utils/validation.js
 * Funções centralizadas de validação com segurança contra XSS e injeção
 */

/**
 * Sanitiza string removendo caracteres perigosos
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto limpo
 */
export const sanitizeString = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove caracteres de controle
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Escapa caracteres especiais (não remove, apenas protege)
    .replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
};

/**
 * Valida e sanitiza nome de cliente
 * @param {string} name - Nome do cliente
 * @returns {Object} { isValid, error, value }
 */
export const validateClientName = (name) => {
  const sanitized = sanitizeString(name);
  
  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'Nome do cliente é obrigatório' };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Nome deve ter no mínimo 2 caracteres' };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Nome não pode ter mais de 100 caracteres' };
  }
  
  // Validar se tem pelo menos uma letra
  if (!/[a-zA-Záàâãéèêíìîóòôõöúùûüçñ]/i.test(sanitized)) {
    return { isValid: false, error: 'Nome deve conter letras' };
  }
  
  return { isValid: true, value: sanitized };
};

/**
 * Valida preço numérico
 * @param {number|string} price - Preço
 * @returns {Object} { isValid, error, value }
 */
export const validatePrice = (price) => {
  // Converter para number se for string
  const numPrice = typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price;
  
  if (isNaN(numPrice)) {
    return { isValid: false, error: 'Preço deve ser um número válido' };
  }
  
  if (numPrice < 0) {
    return { isValid: false, error: 'Preço não pode ser negativo' };
  }
  
  if (numPrice > 10000) {
    return { isValid: false, error: 'Preço muito alto (máximo R$ 10.000)' };
  }
  
  // Máximo 2 casas decimais
  const rounded = Math.round(numPrice * 100) / 100;
  
  return { isValid: true, value: rounded };
};

/**
 * Valida quantidade de itens
 * @param {number|string} quantity - Quantidade
 * @returns {Object} { isValid, error, value }
 */
export const validateQuantity = (quantity) => {
  const numQty = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
  
  if (isNaN(numQty)) {
    return { isValid: false, error: 'Quantidade deve ser um número' };
  }
  
  if (numQty <= 0) {
    return { isValid: false, error: 'Quantidade deve ser maior que zero' };
  }
  
  if (numQty > 1000) {
    return { isValid: false, error: 'Quantidade muito alta (máximo 1000)' };
  }
  
  return { isValid: true, value: numQty };
};

/**
 * Valida observações do pedido
 * @param {string} observations - Observações
 * @returns {Object} { isValid, error, value }
 */
export const validateObservations = (observations) => {
  if (!observations) {
    return { isValid: true, value: '' };
  }
  
  const sanitized = sanitizeString(observations);
  
  if (sanitized.length > 500) {
    return { isValid: false, error: 'Observações não podem ter mais de 500 caracteres' };
  }
  
  return { isValid: true, value: sanitized };
};

/**
 * Valida array de itens do pedido
 * @param {Array} items - Array de itens
 * @returns {Object} { isValid, error }
 */
export const validateOrderItems = (items) => {
  if (!Array.isArray(items)) {
    return { isValid: false, error: 'Itens deve ser um array' };
  }
  
  if (items.length === 0) {
    return { isValid: false, error: 'Pedido deve ter pelo menos um item' };
  }
  
  if (items.length > 100) {
    return { isValid: false, error: 'Pedido não pode ter mais de 100 itens' };
  }
  
  // Validar cada item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (typeof item !== 'string' || item.length === 0) {
      return { isValid: false, error: `Item ${i + 1} é inválido` };
    }
    if (item.length > 200) {
      return { isValid: false, error: `Item ${i + 1} é muito longo` };
    }
  }
  
  return { isValid: true };
};

/**
 * Valida CPF (básico, sem algoritmo de validação)
 * @param {string} cpf - CPF a validar
 * @returns {Object} { isValid, error, value }
 */
export const validateCPF = (cpf) => {
  if (!cpf) {
    return { isValid: false, error: 'CPF é obrigatório' };
  }
  
  // Remove caracteres não numéricos
  const clean = cpf.replace(/\D/g, '');
  
  if (clean.length !== 11) {
    return { isValid: false, error: 'CPF deve ter 11 dígitos' };
  }
  
  // Validação básica: não pode ser tudo igual
  if (/^(\d)\1{10}$/.test(clean)) {
    return { isValid: false, error: 'CPF inválido' };
  }
  
  return { isValid: true, value: clean };
};

/**
 * Valida email
 * @param {string} email - Email a validar
 * @returns {Object} { isValid, error, value }
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email é obrigatório' };
  }
  
  const sanitized = sanitizeString(email.toLowerCase());
  
  // Regex simples para email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: 'Email inválido' };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Email muito longo' };
  }
  
  return { isValid: true, value: sanitized };
};

/**
 * Valida nome de categoria do cardápio
 * @param {string} category - Nome da categoria
 * @returns {Object} { isValid, error, value }
 */
export const validateCategory = (category) => {
  const sanitized = sanitizeString(category);
  
  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'Categoria é obrigatória' };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Categoria deve ter no mínimo 2 caracteres' };
  }
  
  if (sanitized.length > 50) {
    return { isValid: false, error: 'Categoria não pode ter mais de 50 caracteres' };
  }
  
  return { isValid: true, value: sanitized };
};

/**
 * Valida nome de produto do cardápio
 * @param {string} name - Nome do produto
 * @returns {Object} { isValid, error, value }
 */
export const validateProductName = (name) => {
  const sanitized = sanitizeString(name);
  
  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'Nome do produto é obrigatório' };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Nome deve ter no mínimo 2 caracteres' };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Nome não pode ter mais de 100 caracteres' };
  }
  
  return { isValid: true, value: sanitized };
};

/**
 * Valida número de comanda
 * @param {number} number - Número da comanda
 * @returns {Object} { isValid, error, value }
 */
export const validateComandaNumber = (number) => {
  const numCmd = typeof number === 'string' ? parseInt(number, 10) : number;
  
  if (isNaN(numCmd)) {
    return { isValid: false, error: 'Número de comanda deve ser um número' };
  }
  
  if (numCmd <= 0) {
    return { isValid: false, error: 'Número de comanda deve ser maior que zero' };
  }
  
  if (numCmd > 9999) {
    return { isValid: false, error: 'Número de comanda muito alto' };
  }
  
  return { isValid: true, value: numCmd };
};

/**
 * Valida todo um pedido completo
 * @param {Object} order - Objeto do pedido
 * @returns {Object} { isValid, errors, value }
 */
export const validateCompleteOrder = (order) => {
  const errors = {};
  const value = {};
  
  // Validar cliente (OPCIONAL - não é obrigatório)
  const clientName = order.client || '';
  if (clientName && clientName.trim().length > 0) {
    const clientValidation = validateClientName(clientName);
    if (!clientValidation.isValid) {
      errors.client = clientValidation.error;
    } else {
      value.client = clientValidation.value;
    }
  } else {
    // Cliente não informado - usar valor padrão
    value.client = 'Cliente';
  }
  
  // Validar itens
  const itemsValidation = validateOrderItems(order.items);
  if (!itemsValidation.isValid) {
    errors.items = itemsValidation.error;
  } else {
    value.items = order.items; // Itens validados
  }
  
  // Validar observações (opcional)
  if (order.observations) {
    const obsValidation = validateObservations(order.observations);
    if (!obsValidation.isValid) {
      errors.observations = obsValidation.error;
    } else {
      value.observations = obsValidation.value;
    }
  } else {
    value.observations = '';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value
  };
};

/**
 * Valida todo um produto completo
 * @param {Object} product - Objeto do produto
 * @returns {Object} { isValid, errors }
 */
export const validateCompleteProduct = (product) => {
  const errors = {};
  
  // Validar nome
  const nameValidation = validateProductName(product.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error;
  }
  
  // Validar categoria
  const categoryValidation = validateCategory(product.category);
  if (!categoryValidation.isValid) {
    errors.category = categoryValidation.error;
  }
  
  // Validar preço
  const priceValidation = validatePrice(product.price);
  if (!priceValidation.isValid) {
    errors.price = priceValidation.error;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Valida dados de funcionário
 * @param {Object} employee - Objeto do funcionário
 * @returns {Object} { isValid, errors }
 */
export const validateCompleteEmployee = (employee) => {
  const errors = {};
  
  // Validar nome
  const nameValidation = validateClientName(employee.nome);
  if (!nameValidation.isValid) {
    errors.nome = nameValidation.error;
  }
  
  // Validar CPF
  const cpfValidation = validateCPF(employee.cpf);
  if (!cpfValidation.isValid) {
    errors.cpf = cpfValidation.error;
  }
  
  // Validar email
  const emailValidation = validateEmail(employee.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }
  
  // Validar funcao (role)
  const validRoles = ['admin', 'gerente', 'garcom', 'cozinheiro', 'montagem', 'caixa'];
  if (!validRoles.includes(employee.funcao)) {
    errors.funcao = 'Função inválida';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  sanitizeString,
  validateClientName,
  validatePrice,
  validateQuantity,
  validateObservations,
  validateOrderItems,
  validateCPF,
  validateEmail,
  validateCategory,
  validateProductName,
  validateComandaNumber,
  validateCompleteOrder,
  validateCompleteProduct,
  validateCompleteEmployee,
};
