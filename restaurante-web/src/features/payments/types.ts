export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';

export interface PaymentBalance {
  total: number;
  pago: number;
  aberto: number;
}

export interface PaymentStepIndicatorProps {
  activeStep: number;
  steps: string[];
}

export interface PaymentComandaSummaryProps {
  comanda: string;
  onChangeComanda: (value: string) => void;
  onSearch: () => void;
  saldo: PaymentBalance | null;
  formatCurrency: (value: any) => string;
  useUiNext?: boolean;
}

export interface PaymentOrderSummaryProps {
  orders: any[];
  formatCurrency: (value: any) => string;
}

export interface PaymentActionPanelProps {
  valor: string;
  onChangeValor: (value: string) => void;
  forma: string;
  onChangeForma: (value: string) => void;
  onConfirmPayment: () => void;
  onSplitByPeople: () => void;
  onSplitByItems: () => void;
  useUiNext?: boolean;
}