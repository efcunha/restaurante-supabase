export interface ComandaManagementPedido {
  id?: string;
  status?: string;
  isPago?: boolean;
  order_type?: string;
  orderType?: string;
  items?: string[];
  itens?: string[];
  itemsWithStatus?: Array<{ delivered?: boolean }>;
  [key: string]: unknown;
}

export interface ComandaManagementItem {
  id?: string;
  comandaNumber: string | number;
  cliente?: string;
  mesa?: string;
  status?: string;
  totalConsumido?: number;
  totalPago?: number;
  saldoAberto?: number;
  pedidos?: ComandaManagementPedido[];
  [key: string]: unknown;
}

export interface ComandaManagementState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  comandasAbertas: ComandaManagementItem[];
  comandasPagas: ComandaManagementItem[];
  comandasCanceladas: ComandaManagementItem[];
  selectedComanda: ComandaManagementItem | null;
  setSelectedComanda: (comanda: ComandaManagementItem | null) => void;
  isRefreshing: boolean;
  carregarComandas: (forcarBusca?: boolean, loadMore?: boolean) => Promise<void>;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  cardapioDin: Array<{ name: string; price: number }>;
}

export function useComandaManagement(): ComandaManagementState;