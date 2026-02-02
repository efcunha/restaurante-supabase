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
  [key: string]: any;
}

export interface Caixa {
  id: string;
  data: string;
  status: 'aberto' | 'fechado';
  abertoPor: string;
  abertoPorNome: string;
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
