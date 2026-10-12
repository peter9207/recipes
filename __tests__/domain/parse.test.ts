import { parseIngredientLine } from '@/domain';

describe('parseIngredientLine', () => {
  it('parses amount, unit, name and note', () => {
    expect(parseIngredientLine('2 cups flour, sifted')).toEqual({
      quantity: { value: 2, unit: 'cup' }, name: 'flour', note: 'sifted',
    });
  });
  it('handles mixed fractions and "of"', () => {
    expect(parseIngredientLine('1 1/2 tsp of salt')).toEqual({
      quantity: { value: 1.5, unit: 'tsp' }, name: 'salt', note: null,
    });
  });
  it('handles unitless counts', () => {
    expect(parseIngredientLine('3 large eggs')).toEqual({
      quantity: { value: 3, unit: null }, name: 'large eggs', note: null,
    });
  });
  it('handles ranges and count units', () => {
    expect(parseIngredientLine('2-3 cloves garlic')).toEqual({
      quantity: { value: 2, max: 3, unit: 'clove' }, name: 'garlic', note: null,
    });
  });
  it('handles parentheticals', () => {
    expect(parseIngredientLine('1 can (14 oz) tomatoes')).toEqual({
      quantity: { value: 1, unit: 'can' }, name: 'tomatoes', note: '14 oz',
    });
  });
  it('handles "a pinch of"', () => {
    expect(parseIngredientLine('a pinch of nutmeg')).toEqual({
      quantity: { value: 1, unit: 'pinch' }, name: 'nutmeg', note: null,
    });
  });
  it('handles two-word units', () => {
    expect(parseIngredientLine('8 fl oz milk').quantity).toEqual({ value: 8, unit: 'floz' });
  });
  it('degrades to name-only', () => {
    expect(parseIngredientLine('salt to taste')).toEqual({
      quantity: { value: null, unit: null }, name: 'salt', note: 'to taste',
    });
    expect(parseIngredientLine('fresh basil')).toEqual({
      quantity: { value: null, unit: null }, name: 'fresh basil', note: null,
    });
  });
  it('does not treat a lone "c" word as a unit without an amount', () => {
    expect(parseIngredientLine('cumin').name).toBe('cumin');
  });
});
