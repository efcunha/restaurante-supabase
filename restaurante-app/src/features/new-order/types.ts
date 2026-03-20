import { Product } from '../../types';

export interface NewOrderSelectedItemData {
  text: string;
  price: number;
  name: string;
}

export interface NewOrderSelectedItemProps {
  item: string;
  price: number;
  onRemove: () => void;
}

export interface NewOrderListFooterProps {
  selectedItems: NewOrderSelectedItemData[];
  onRemoveItem: (item: string) => void;
}

export interface NewOrderCartFooterProps {
  selectedItems: NewOrderSelectedItemData[];
  total: number;
  cartExpanded: boolean;
  onToggleCart: () => void;
  onRemoveItem: (item: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export interface NewOrderHeaderFormProps {
  clientName: string;
  onClientNameChange: (value: string) => void;
  mesa: string;
  onMesaChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export interface PizzaProductCardProps {
  item: Product;
  onPress: (item: Product) => void;
}