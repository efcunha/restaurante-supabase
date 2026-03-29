import { computeEffectiveCategoryConstraints } from './AdicionaisPickerModal';
import { ProductAdicional } from '../types/models';

function buildAdicional(overrides: Partial<ProductAdicional> = {}): ProductAdicional {
  const now = new Date();
  return {
    id: overrides.id ?? 'adicional-id',
    companyId: overrides.companyId ?? 'company-id',
    productId: overrides.productId ?? 'product-id',
    name: overrides.name ?? 'Adicional',
    description: overrides.description,
    price: overrides.price ?? 0,
    category: overrides.category ?? 'extras',
    selectionType: overrides.selectionType ?? 'multiplo',
    maxChoices: overrides.maxChoices,
    displayOrder: overrides.displayOrder ?? 0,
    active: overrides.active ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt,
  };
}

describe('computeEffectiveCategoryConstraints', () => {
  it('applies shared maxChoices when category config is consistent', () => {
    const items = [
      buildAdicional({ id: '1', maxChoices: 3 }),
      buildAdicional({ id: '2', maxChoices: 3 }),
      buildAdicional({ id: '3', maxChoices: 3 }),
    ];

    const result = computeEffectiveCategoryConstraints(items);

    expect(result.selectionType).toBe('multiplo');
    expect(result.maxChoices).toBe(3);
    expect(result.hasMixedMaxChoices).toBe(false);
  });

  it('uses fail-safe smallest positive maxChoices when category has mixed limits', () => {
    const items = [
      buildAdicional({ id: '1', maxChoices: 3 }),
      buildAdicional({ id: '2', maxChoices: 2 }),
      buildAdicional({ id: '3', maxChoices: 5 }),
    ];

    const result = computeEffectiveCategoryConstraints(items);

    expect(result.selectionType).toBe('multiplo');
    expect(result.maxChoices).toBe(2);
    expect(result.hasMixedMaxChoices).toBe(true);
  });

  it('keeps fail-safe smallest positive maxChoices when category has null and valid limits', () => {
    const items = [
      buildAdicional({ id: '1', maxChoices: undefined }),
      buildAdicional({ id: '2', maxChoices: 3 }),
      buildAdicional({ id: '3', maxChoices: 1 }),
    ];

    const result = computeEffectiveCategoryConstraints(items);

    expect(result.selectionType).toBe('multiplo');
    expect(result.maxChoices).toBe(1);
    expect(result.hasMixedMaxChoices).toBe(true);
  });

  it('forces single-choice category when all items are unico', () => {
    const items = [
      buildAdicional({ id: '1', selectionType: 'unico', maxChoices: 3 }),
      buildAdicional({ id: '2', selectionType: 'unico', maxChoices: 1 }),
    ];

    const result = computeEffectiveCategoryConstraints(items);

    expect(result.selectionType).toBe('unico');
    expect(result.maxChoices).toBeUndefined();
    expect(result.hasMixedMaxChoices).toBe(false);
  });
});
