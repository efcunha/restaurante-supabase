export type CardPaymentResult = 'approved' | 'declined' | 'timeout';

export type CardPaymentMethod = 'Crédito' | 'Débito' | 'PIX';

export interface CardTransaction {
  id: string;
  timestamp: Date;
  method: CardPaymentMethod;
  amount: string;
  result: CardPaymentResult;
  nsu?: string;
  reason?: string;
}

export type ScaleStatus = 'stable' | 'unstable' | 'tared' | 'zero';

export interface ScaleReading {
  timestamp: Date;
  rawGrams: number;
  netGrams: number;
  tare: number;
  status: ScaleStatus;
  toledoString: string;
}
