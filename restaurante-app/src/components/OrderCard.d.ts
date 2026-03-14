import type { ComponentType } from 'react';

export interface OrderCardData {
  id: string;
  client: string;
  items: string[];
  observations?: string;
  orderType?: string;
  deliveryAddress?: string;
  deliveryFee?: number;
}

export interface OrderCardProps {
  order: OrderCardData;
  onPress: (orderId: string) => void;
  onAction?: (orderId: string) => void;
  actionLabel?: string;
  isUrgent?: boolean;
}

declare const OrderCard: ComponentType<OrderCardProps>;

export default OrderCard;