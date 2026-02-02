export interface OrderItemStatus {
  id: string;
  name: string;
  status: string;
  checked: boolean;
  timestamp: string;
  category: string;
}

export interface Order {
  id: string;
  client: string;
  mesa?: string;
  comandaNumber: string;
  items: string[];
  itemsWithStatus: OrderItemStatus[];
  observations?: string;
  status: string; // 'montagem' | 'churrasqueira' | 'pronto' | 'delivered' | 'cancelada';
  timestamp: string;
  createdAt: string;
  horarioCriacao: string;
  dateKey: string;
  timeInChurrasqueira?: string | null;
  timeInMontagem?: string | null;
  timeInProntos?: string | null;
  deliveredAt?: string | null;
  totalPrice: number;
  isPago: boolean;
  createdBy: string;
  createdByName: string;
  priceMap?: Record<string, number>;
  [key: string]: any;
}

export interface Caixa {
  id: string;
  data: string;
  status: 'aberto' | 'fechado';
  abertoPor: string;
  abertoPorNome: string;
  abertoAt?: any; // Timestamp
  valorInicial: number;
  vendasTotal: number;
  reforcosTotal: number;
  sangriasTotal: number;
  saldoEsperado: number;
  saldoReal?: number;
  diferenca?: number;
  movimentosCount: number;
  fechadoAt?: any; // Firestore Timestamp
  fechadoPor?: string;
  fechadoPorNome?: string;
  ticketMedio?: number;
  atualizado?: any;
  porForma?: {
    dinheiro: number;
    pix: number;
    debito: number;
    credito: number;
    [key: string]: number;
  };
}

export interface Ingredient {
  id: string;
  nome: string;
  qt: number;
  un: string;
}

export interface PizzaSize {
  name: string;
  maxFlavors: number;
  active?: boolean;
}

export interface PizzaConfig {
  sizes: PizzaSize[];
  pricingMode?: 'HIGHER' | 'AVERAGE';
}

export interface Product {
  id: string;
  name: string;
  price?: number;
  category: string;
  active: boolean;
  createdAt: number;
  description?: string;
  image?: string;
  prices?: Record<string, number>;
  ingredients?: string[]; // Para pizza
  customIngredients?: string; // Para pizza
  inventoryItems?: Ingredient[];
  [key: string]: any;
}

export interface Cardapio {
  caldos: Product[];
  comidas: Product[];
  bebidas: Product[];
  espetinhos: Product[];
  espetinhosSimples?: Product[];
  espetinhosEspeciais?: Product[];
  outros?: Product[];
  porcoes?: Product[];
  pizzas?: Product[];
  [key: string]: Product[] | undefined;
}

export interface Funcionario {
  id: string;
  uid?: string;
  nome: string;
  email: string;
  cpf: string;
  funcao: 'admin' | 'churrasqueiro' | 'montagem' | 'garcom' | string;
  companyId?: string;
  ativo: boolean;
  criadoEm?: string;
  desativadoEm?: string;
  atualizadoEm?: string;
  [key: string]: any;
}

export interface Comanda {
  id: string;
  dateKey: string;
  comandaNumber: string;
  status: 'aberta' | 'fechada' | 'cancelada' | 'paga';
  mesa?: string;
  cliente?: string;
  totalConsumido: number;
  totalPago: number;
  saldoAberto: number;
  recebidoPor?: string[];
  abertaAt: any; // Timestamp
  criadaEm: string;
  horarioCriacao: string;
  abertaPor: string;
  abertaPorNome: string;
  fechadaAt?: any; // Timestamp
  fechadaPor?: string;
  fechadaPorNome?: string;
  canceladaEm?: string; // ISO String
  canceladaPor?: string;
  canceladaPorNome?: string;
  motivoCancelamento?: string;
  atualizado?: any; // Timestamp
  [key: string]: any;
}
