/**
 * utils/validation.ts
 * Funções centralizadas de validação com segurança contra XSS e injeção
 * 
 * Requirements: 22.1, 22.2
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult<T = string> {
  isValid: boolean;
  error?: string;
  value?: T;
}

export interface CompleteValidationResult<T = any> {
  isValid: boolean;
  errors: Record<string, string>;
  value?: T;
}

export interface OrderValidationInput {
  client?: string;
  items: string[];
  observations?: string;
}

export interface ProductValidationInput {
  name: string;
  category: string;
  price: number | string;
}

export interface EmployeeValidationInput {
  nome: string;
  cpf: string;
  email: string;
  funcao: string;
}

type UserRole = 'admin' | 'gerente' | 'garcom' | 'cozinheiro' | 'montagem' | 'caixa';

// ============================================================================
// SANITIZATION
// ============================================================================

/**
 * Sanitiza string removendo caracteres perigosos
 */
export const sanitizeString = (text: string | null | undefined): string => {
  if (!text || typeof text !== 'string') return '';

  return text
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove caracteres de controle
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Escapa caracteres especiais (não remove, apenas protege)
    .replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c] || c));
};

// ============================================================================
// BASIC VALIDATIONS
// ============================================================================

/**
 * Valida e sanitiza nome de cliente
 */
export const validateClientName = (name: string): ValidationResult => {
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
 */
export const validatePrice = (price: number | string): ValidationResult<number> => {
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
 */
export const validateQuantity = (quantity: number | string): ValidationResult<number> => {
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
 */
export const validateObservations = (observations?: string): ValidationResult => {
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
 */
export const validateOrderItems = (items: unknown): ValidationResult<string[]> => {
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

  return { isValid: true, value: items as string[] };
};

// ============================================================================
// DOCUMENT VALIDATIONS
// ============================================================================

/**
 * Valida CPF com algoritmo verificador
 */
export const validateCPF = (cpf: string): ValidationResult => {
  if (!cpf) return { isValid: false, error: 'CPF é obrigatório' };

  const clean = cpf.replace(/\D/g, '');

  if (clean.length !== 11) return { isValid: false, error: 'CPF deve ter 11 dígitos' };

  if (/^(\d)\1{10}$/.test(clean)) return { isValid: false, error: 'CPF inválido' };

  // Validação do algoritmo
  let soma = 0;
  let resto: number;

  for (let i = 1; i <= 9; i++) soma = soma + parseInt(clean.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;

  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(clean.substring(9, 10))) return { isValid: false, error: 'CPF inválido' };

  soma = 0;
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(clean.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;

  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(clean.substring(10, 11))) return { isValid: false, error: 'CPF inválido' };

  return { isValid: true, value: clean };
};

/**
 * Valida CNPJ com algoritmo verificador
 */
export const validateCNPJ = (cnpj: string): ValidationResult => {
  if (!cnpj) return { isValid: false, error: 'CNPJ é obrigatório' };

  const clean = cnpj.replace(/\D/g, '');

  if (clean.length !== 14) return { isValid: false, error: 'CNPJ deve ter 14 dígitos' };

  if (/^(\d)\1{13}$/.test(clean)) return { isValid: false, error: 'CNPJ inválido' };

  // Validação do algoritmo
  let tamanho = clean.length - 2;
  let numeros = clean.substring(0, tamanho);
  const digitos = clean.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return { isValid: false, error: 'CNPJ inválido' };

  tamanho = tamanho + 1;
  numeros = clean.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return { isValid: false, error: 'CNPJ inválido' };

  return { isValid: true, value: clean };
};

/**
 * Valida email
 */
export const validateEmail = (email: string): ValidationResult => {
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

// ============================================================================
// PRODUCT VALIDATIONS
// ============================================================================

/**
 * Valida nome de categoria do cardápio
 */
export const validateCategory = (category: string): ValidationResult => {
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
 */
export const validateProductName = (name: string): ValidationResult => {
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
 */
export const validateComandaNumber = (number: number | string): ValidationResult<number> => {
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

// ============================================================================
// COMPLETE VALIDATIONS
// ============================================================================

/**
 * Valida todo um pedido completo
 */
export const validateCompleteOrder = (order: OrderValidationInput): CompleteValidationResult => {
  const errors: Record<string, string> = {};
  const value: Partial<OrderValidationInput> = {};

  // Validar cliente (OPCIONAL - não é obrigatório)
  const clientName = order.client || '';
  if (clientName && clientName.trim().length > 0) {
    const clientValidation = validateClientName(clientName);
    if (!clientValidation.isValid) {
      errors.client = clientValidation.error || 'Erro ao validar cliente';
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
    errors.items = itemsValidation.error || 'Erro ao validar itens';
  } else {
    value.items = itemsValidation.value;
  }

  // Validar observações (opcional)
  if (order.observations) {
    const obsValidation = validateObservations(order.observations);
    if (!obsValidation.isValid) {
      errors.observations = obsValidation.error || 'Erro ao validar observações';
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
 */
export const validateCompleteProduct = (product: ProductValidationInput): CompleteValidationResult => {
  const errors: Record<string, string> = {};

  // Validar nome
  const nameValidation = validateProductName(product.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error || 'Erro ao validar nome';
  }

  // Validar categoria
  const categoryValidation = validateCategory(product.category);
  if (!categoryValidation.isValid) {
    errors.category = categoryValidation.error || 'Erro ao validar categoria';
  }

  // Validar preço
  const priceValidation = validatePrice(product.price);
  if (!priceValidation.isValid) {
    errors.price = priceValidation.error || 'Erro ao validar preço';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Valida dados de funcionário
 */
export const validateCompleteEmployee = (employee: EmployeeValidationInput): CompleteValidationResult => {
  const errors: Record<string, string> = {};

  // Validar nome
  const nameValidation = validateClientName(employee.nome);
  if (!nameValidation.isValid) {
    errors.nome = nameValidation.error || 'Erro ao validar nome';
  }

  // Validar CPF
  const cpfValidation = validateCPF(employee.cpf);
  if (!cpfValidation.isValid) {
    errors.cpf = cpfValidation.error || 'Erro ao validar CPF';
  }

  // Validar email
  const emailValidation = validateEmail(employee.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error || 'Erro ao validar email';
  }

  // Validar funcao (role)
  const validRoles: UserRole[] = ['admin', 'gerente', 'garcom', 'cozinheiro', 'montagem', 'caixa'];
  if (!validRoles.includes(employee.funcao as UserRole)) {
    errors.funcao = 'Função inválida';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  sanitizeString,
  validateClientName,
  validatePrice,
  validateQuantity,
  validateObservations,
  validateOrderItems,
  validateCPF,
  validateCNPJ,
  validateEmail,
  validateCategory,
  validateProductName,
  validateComandaNumber,
  validateCompleteOrder,
  validateCompleteProduct,
  validateCompleteEmployee,
};

