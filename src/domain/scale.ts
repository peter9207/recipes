import type { Ingredient, Quantity } from './types';

export function scaleQuantity(q: Quantity, factor: number): Quantity {
  if (q.value === null) return q;
  return {
    value: q.value * factor,
    ...(q.max !== undefined ? { max: q.max * factor } : {}),
    unit: q.unit,
  };
}

/** Scale ingredient amounts from one serving size to another. Unspecified amounts are untouched. */
export function scaleIngredients<T extends Pick<Ingredient, 'quantity'>>(
  ingredients: T[],
  fromServings: number,
  toServings: number,
): T[] {
  if (!(fromServings > 0) || !(toServings > 0) || fromServings === toServings) return ingredients;
  const factor = toServings / fromServings;
  return ingredients.map((i) => ({ ...i, quantity: scaleQuantity(i.quantity, factor) }));
}
