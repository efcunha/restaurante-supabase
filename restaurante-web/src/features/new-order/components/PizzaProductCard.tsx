import React, { useMemo } from 'react';
import { ProductCard } from '../../../ui';
import { PizzaProductCardProps } from '../types';

function formatPriceRange(values: number[]) {
  if (values.length === 0) {
    return 'R$ 0,00';
  }

  const minPrice = Math.min(...values);
  const maxPrice = Math.max(...values);

  if (minPrice === maxPrice || values.length === 1) {
    return `R$ ${minPrice.toFixed(2).replace('.', ',')}`;
  }

  return `R$ ${minPrice.toFixed(2).replace('.', ',')} - R$ ${maxPrice.toFixed(2).replace('.', ',')}`;
}

export function PizzaProductCard({ item, onPress }: PizzaProductCardProps) {
  const validPrices = useMemo(
    () => item.prices
      ? Object.values(item.prices)
          .map((price) => {
            if (typeof price === 'string') {
              return Number(price.replace(',', '.'));
            }

            return Number(price);
          })
          .filter((price) => !Number.isNaN(price) && price > 0)
      : [],
    [item.prices]
  );

  const description = useMemo(
    () => [
      item.ingredients ? item.ingredients.join(', ') : item.description || '',
      item.customIngredients ? `(${item.customIngredients})` : '',
    ]
      .filter(Boolean)
      .join(' '),
    [item.customIngredients, item.description, item.ingredients]
  );

  return (
    <ProductCard
      name={item.name}
      description={description || undefined}
      priceLabel={formatPriceRange(validPrices)}
      category={item.subcategory}
      onPress={() => onPress(item)}
    />
  );
}