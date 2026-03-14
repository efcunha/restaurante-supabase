import type { ComponentType } from 'react';
import type { OrderCardData } from './OrderCard';

export interface MontagemOrderCardProps {
  order: OrderCardData;
  isUrgent?: boolean;
  onMarkReady: () => void;
  onOpenDetails: () => void;
}

export interface ProntoOrderCardProps {
  order: OrderCardData;
  onDeliver: () => void;
  onOpenDetails: () => void;
}

export interface EspetoCardData {
  icon: string;
  tipo: string;
  quantidade: number;
}

export interface EspetoCardProps {
  espeto: EspetoCardData;
}

export const MontagemOrderCard: ComponentType<MontagemOrderCardProps>;
export const ProntoOrderCard: ComponentType<ProntoOrderCardProps>;
export const EspetoCard: ComponentType<EspetoCardProps>;