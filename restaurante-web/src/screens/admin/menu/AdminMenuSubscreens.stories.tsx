import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import AdicionaisConfigModal from './AdicionaisConfigModal';
import ProductForm from './ProductForm';
import ProductList from './ProductList';
import StockManager from './StockManager';
import VariationManager from './VariationManager';
import { AdicionaisService } from '../../../services/AdicionaisService';
import type { Product } from '../../../types';
import type { ProductAdicional } from '../../../types/models';

const nowTs = Date.now();
const nowDate = new Date();

const categories = [
  { label: 'Comidas', value: 'comidas' },
  { label: 'Pizzas', value: 'pizza' },
  { label: 'Espetinhos', value: 'espetinhos' },
];

const sampleProducts: Product[] = [
  {
    id: 'p1',
    name: 'X-Bacon',
    category: 'comidas',
    price: 27.9,
    active: true,
    createdAt: nowTs,
    inventoryItems: [{ id: 'inv-1', nome: 'Pao brioche', qt: 1, un: 'un' }],
  },
  {
    id: 'p2',
    name: 'X-Bacon (Grande)',
    category: 'comidas',
    price: 31.9,
    active: true,
    createdAt: nowTs,
    inventoryItems: [],
  },
  {
    id: 'p3',
    name: 'X-Salada',
    category: 'comidas',
    price: 23.5,
    active: false,
    createdAt: nowTs,
    inventoryItems: [],
  },
];

const sampleAdicionais: ProductAdicional[] = [
  {
    id: 'a1',
    companyId: 'company-1',
    productId: 'p1',
    name: 'Bacon extra',
    description: 'Porcao adicional de bacon',
    price: 6,
    category: 'extras',
    selectionType: 'multiplo',
    maxChoices: 3,
    displayOrder: 10,
    active: true,
    createdAt: nowDate,
  },
  {
    id: 'a2',
    companyId: 'company-1',
    productId: 'p1',
    name: 'Molho da casa',
    description: 'Molho especial',
    price: 0,
    category: 'molhos',
    selectionType: 'unico',
    maxChoices: undefined,
    displayOrder: 20,
    active: true,
    createdAt: nowDate,
  },
];

const meta: Meta = {
  title: 'Screens/Admin/MenuSubscreens',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

export const ProductListReady: Story = {
  render: () => (
    <View style={{ padding: 16, maxWidth: 980 }}>
      <ProductList
        products={sampleProducts as Product[]}
        categories={categories}
        isLoading={false}
        onEdit={() => undefined}
        onDelete={() => undefined}
        onToggleStatus={() => undefined}
        onManageStock={() => undefined}
      />
    </View>
  ),
};

export const ProductListLoading: Story = {
  render: () => (
    <View style={{ padding: 16, maxWidth: 980 }}>
      <ProductList
        products={[]}
        categories={categories}
        isLoading
        onEdit={() => undefined}
        onDelete={() => undefined}
        onToggleStatus={() => undefined}
        onManageStock={() => undefined}
      />
    </View>
  ),
};

export const ProductFormNew: Story = {
  render: () => (
    <ProductForm
      visible
      onClose={() => undefined}
      onSave={async () => undefined}
      initialData={null}
      categories={categories}
      pizzaConfig={{ sizes: [{ name: 'Media', maxFlavors: 2 }, { name: 'Grande', maxFlavors: 3 }] }}
      isLoading={false}
      variationNames={['Tradicional', 'Especial']}
    />
  ),
};

export const StockManagerReady: Story = {
  render: () => (
    <StockManager
      visible
      onClose={() => undefined}
      product={sampleProducts[0] as Product}
      stockItems={[
        { id: 's1', nome: 'Pao brioche', qt: 20, un: 'un', unidadeOriginal: 'un' },
        { id: 's2', nome: 'Hamburger 180g', qt: 50, un: 'un', unidadeOriginal: 'un' },
      ]}
      onAddIngredient={async () => undefined}
      onRemoveIngredient={async () => undefined}
    />
  ),
};

export const VariationManagerReady: Story = {
  render: () => {
    const variations = useMemo(
      () => [
        {
          ...sampleProducts[0],
          id: 'v1',
          name: 'Espetinho Tradicional',
          price: 12,
          inventoryItems: [{ id: 'i1', nome: 'Carne', qt: 0.12, un: 'kg' }],
        },
        {
          ...sampleProducts[0],
          id: 'v2',
          name: 'Espetinho Especial',
          price: 14,
          inventoryItems: [{ id: 'i2', nome: 'Queijo', qt: 0.03, un: 'kg' }],
        },
      ],
      []
    );

    return (
      <VariationManager
        visible
        onClose={() => undefined}
        variations={variations as Product[]}
        onSaveVariation={() => undefined}
        onOpenStock={() => undefined}
      />
    );
  },
};

function MockedAdicionaisModal() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const original = {
      fetchAllByProduct: AdicionaisService.fetchAllByProduct,
      update: AdicionaisService.update,
      create: AdicionaisService.create,
      delete: AdicionaisService.delete,
    };

    AdicionaisService.fetchAllByProduct = async () => sampleAdicionais;
    AdicionaisService.update = async () => undefined;
    AdicionaisService.create = async () => sampleAdicionais[0];
    AdicionaisService.delete = async () => undefined;

    return () => {
      AdicionaisService.fetchAllByProduct = original.fetchAllByProduct;
      AdicionaisService.update = original.update;
      AdicionaisService.create = original.create;
      AdicionaisService.delete = original.delete;
    };
  }, []);

  return (
    <AdicionaisConfigModal
      visible={visible}
      onClose={() => setVisible(false)}
      product={{ id: 'p1', name: 'X-Bacon' }}
      companyId="company-1"
    />
  );
}

export const AdicionaisConfigReady: Story = {
  render: () => <MockedAdicionaisModal />,
};
