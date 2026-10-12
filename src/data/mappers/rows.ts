import type { Quantity } from '@/domain';

interface QuantityCols {
  quantity: number | null;
  quantityMax: number | null;
  unit: string | null;
}

export function quantityFromRow(r: QuantityCols): Quantity {
  return {
    value: r.quantity,
    ...(r.quantityMax !== null ? { max: r.quantityMax } : {}),
    unit: r.unit,
  };
}

export function quantityToCols(q: Quantity): QuantityCols {
  return { quantity: q.value, quantityMax: q.value === null ? null : (q.max ?? null), unit: q.unit };
}
