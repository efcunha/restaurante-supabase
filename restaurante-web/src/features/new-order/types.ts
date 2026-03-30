import { Product } from '../../types';

export interface NewOrderSelectedItemData {
  text: string;
  price: number;
  name: string;
  accompanimentsText?: string;
}

export interface NewOrderSelectedItemProps {
  item: string;
  price: number;
  subtitle?: string;
  onRemove: () => void;
}

export interface NewOrderListFooterProps {
  selectedItems: NewOrderSelectedItemData[];
  onRemoveItem: (item: string) => void;
}

export interface NewOrderCartFooterProps {
  total: number;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export interface NewOrderHeaderFormProps {
  clientName: string;
  onClientNameChange: (value: string) => void;
  mesa: string;
  onMesaChange: (value: string) => void;
}

export interface PizzaProductCardProps {
  item: Product;
  onPress: (item: Product) => void;
  testID?: string;
}