/**
 * Definições de Tipos TypeScript
 * Centraliza todos os tipos relacionados a pedidos
 */

/**
 * Status possíveis de um pedido
 */
export type OrderStatus = 'churrasqueira' | 'montagem' | 'pronto';

/**
 * Item do pedido (formato bruto da lista)
 */
export interface OrderItem {
  /** Texto descritivo do item, ex: "2 Cupim Completo" */
  description: string;
}

/**
 * Timestamps do ciclo de vida do pedido
 * NOTA: São armazenados como ISO strings para compatibilidade com AsyncStorage
 */
export interface OrderTimestamps {
  /** Data/hora de criação do pedido (ISO string) */
  createdAt: string;
  /** Data/hora de entrada na churrasqueira (ISO string) */
  timeInChurrasqueira: string;
  /** Data/hora de entrada na montagem (null se ainda não chegou) */
  timeInMontagem: string | null;
  /** Data/hora de entrada em prontos (null se ainda não chegou) */
  timeInProntos: string | null;
  /** Data/hora de entrega (null enquanto não for entregue) */
  deliveredAt: string | null;
}

/**
 * Estrutura completa de um pedido
 */
export interface Order extends OrderTimestamps {
  /** ID único do pedido, ex: "#001" */
  id: string;
  /** Nome do cliente/mesa */
  client: string;
  /** Número da comanda (identificação física) */
  comandaNumber?: string;
  /** Lista de itens do pedido (strings descritivas) */
  items: string[];
  /** Status atual do pedido */
  status: OrderStatus;
  /** Observações adicionais */
  observations: string;
  /** Preço total calculado */
  totalPrice: number;
  /** Indicador se o pedido já foi pago */
  isPago?: boolean;
  /** ID do funcionário que criou o pedido */
  createdBy?: string;
  /** Nome do funcionário que criou o pedido */
  createdByName?: string;
  /** Timestamp legado (mantido para compatibilidade) */
  timestamp?: string;
}

/**
 * Dados para criar um novo pedido
 */
export interface CreateOrderData {
  client: string;
  items: string[];
  observations?: string;
}

/**
 * Dados para atualizar um pedido existente
 */
export interface UpdateOrderData {
  client?: string;
  items?: string[];
  observations?: string;
}

/**
 * Contexto de pedidos (value do OrderContext)
 */
export interface OrderContextValue {
  /** Lista de todos os pedidos */
  orders: Order[];
  
  /** Adiciona novo pedido */
  addOrder: (client: string, items: string[], observations: string) => string;
  
  /** Move pedido para montagem */
  moveToMontagem: (orderId: string) => void;
  
  /** Move pedido para prontos */
  moveToProntos: (orderId: string) => void;
  
  /** Marca pedido como entregue (remove da lista) */
  markAsDelivered: (orderId: string) => void;
  
  /** Edita pedido existente */
  editOrder: (orderId: string, client: string, items: string[], observations: string) => void;
  
  /** Deleta pedido */
  deleteOrder: (orderId: string) => void;
  
  /** Busca pedido por ID */
  getOrderById: (orderId: string) => Order | undefined;
  
  /** Filtra pedidos por status */
  getOrdersByStatus: (status: OrderStatus) => Order[];
}

/**
 * Props do OrderCard
 */
export interface OrderCardProps {
  /** Pedido a ser exibido */
  order: Order;
  /** Callback ao pressionar o card */
  onPress?: () => void;
  /** Callback para ação do botão */
  onAction?: () => void;
  /** Texto do botão de ação */
  actionLabel?: string;
  /** Se deve destacar como urgente */
  isUrgent?: boolean;
}

/**
 * Props do PedidoDetalhesModal
 */
export interface PedidoDetalhesModalProps {
  /** Se o modal está visível */
  visible: boolean;
  /** Pedido a ser exibido */
  order: Order | null;
  /** Callback ao fechar */
  onClose: () => void;
  /** Callback ao editar */
  onEdit?: (order: Order) => void;
  /** Callback ao deletar */
  onDelete?: (orderId: string) => void;
}

/**
 * Resultado de validação de deleção
 */
export interface ValidationResult {
  /** Se a operação é válida */
  valid: boolean;
  /** Mensagem de erro (se inválida) */
  error?: string;
}

/**
 * Mapa de preços dos itens
 */
export interface PriceMap {
  [key: string]: number;
}

/**
 * Função do funcionário
 */
export type FuncionarioRole = 'garcom' | 'churrasqueiro' | 'montagem' | 'admin' | 'gerente' | 'cozinha';

/**
 * Dados de um funcionário
 */
export interface Funcionario {
  /** ID único do funcionário */
  id: string;
  /** Nome completo */
  nome: string;
  /** CPF ou identificador único */
  cpf: string;
  /** Função no estabelecimento */
  funcao: FuncionarioRole;
  /** Email para login */
  email: string;
  /** Se está ativo */
  ativo: boolean;
  /** Data de cadastro */
  criadoEm: string;
}

/**
 * Dados para criar funcionário
 */
export interface CreateFuncionarioData {
  nome: string;
  cpf: string;
  funcao: FuncionarioRole;
  email: string;
  senha: string;
}

/**
 * Contexto de autenticação
 */
export interface AuthContextValue {
  /** Funcionário logado (null se não autenticado) */
  user: Funcionario | null;
  /** Papel normalizado do usuário */
  role?: FuncionarioRole | null;
  /** Se está carregando dados de auth */
  loading: boolean;
  /** Faz login */
  login: (email: string, senha: string) => Promise<boolean>;
  /** Faz logout */
  logout: () => Promise<void>;
  /** Verifica permissão por chave */
  hasPermission?: (perm: string) => boolean;
}
// ============================================================================
// EXPORTS FROM SUB-MODULES
// ============================================================================
export * from './models';
export * from './order.types';
// export * from './performance'; // Se necessário

// ============================================================================
// MENU MODELS
// ============================================================================

import { Product } from './models';

export interface MenuItem {
  name: string;
  price: number;
}

export interface Cardapio {
  caldos: Product[];
  comidas: Product[];
  bebidas: Product[];
  porcoes: Product[];
  outros: Product[];
  espetinhos: Product[];
  espetinhosSimples: Product[];
  espetinhosEspeciais: Product[];
  pizzas: Product[];
}
