
import { Product, PizzaConfig } from '../../../types';

export interface StockItem {
    id: string;
    nome: string;
    qt: number;
    un: string;
    unidadeOriginal?: string;
    [key: string]: any;
}

export interface ProductFormData {
  id?: string;
  name: string;
  price: number;
  category: string;
  prices?: Record<string, number>;
  // Espetinho logic
  createVariations?: boolean;
  espetinhoPrices?: Record<string, number>;
  variationNames?: string[];
}

export interface VariacaoItemProps {
  variacao: { id?: string; name: string; price?: number; [key: string]: any };
  id?: string;
  name: string;
  price?: number;
  onSalvar: (produto: any, novoPreco: string, novoNome: string) => void;
}

export interface ProductListProps {
  products: Product[];
  categories: { label: string; value: string }[];
  isLoading: boolean;
  onEdit: (productName: string) => void;
  onDelete: (variations: Product[]) => void;
  onToggleStatus: (variations: Product[], currentStatus: boolean) => void;
  onManageStock: (product: Product) => void;
}

export interface ProductFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (productData: ProductFormData) => Promise<void>;
  initialData: Product | null;
  categories: { label: string; value: string }[];
  pizzaConfig: PizzaConfig;
  isLoading: boolean;
  onOpenStock?: (product: Product) => void;
  variationNames?: string[];
}
