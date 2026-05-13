import type { ComponentType } from 'react';
import type { Product, PizzaSize } from '../types';

export type PizzaBuilderFlavor = Pick<Product, 'id' | 'name'> & {
  category?: string;
  active?: boolean;
  createdAt?: number;
  prices?: Record<string, string | number>;
  [key: string]: unknown;
};

export interface PizzaBuilderExtra {
  id: string;
  name: string;
  type: 'borda' | 'adicional' | string;
  price?: number;
}

export interface PizzaBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (
    size: string,
    flavors: Product[],
    borda: PizzaBuilderExtra | null,
    adicionais: PizzaBuilderExtra[]
  ) => void;
  sizes?: PizzaSize[];
  pizzas?: PizzaBuilderFlavor[];
  initialFlavor?: PizzaBuilderFlavor | Product | null;
  extras?: PizzaBuilderExtra[];
}

declare const PizzaBuilderModal: ComponentType<PizzaBuilderModalProps>;

export default PizzaBuilderModal;