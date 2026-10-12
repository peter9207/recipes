import { areCompatible, convert, getUnit, toDisplayUnit } from '@/domain';

describe('units', () => {
  it('resolves aliases', () => {
    expect(getUnit('Tablespoons')?.key).toBe('tbsp');
    expect(getUnit('tbsp.')?.key).toBe('tbsp');
    expect(getUnit('fl oz')?.key).toBe('floz');
    expect(getUnit('cloves')?.key).toBe('clove');
    expect(getUnit('flour')).toBeNull();
  });

  it('converts within a dimension', () => {
    expect(convert({ value: 3, unit: 'tsp' }, 'tbsp')!.value).toBeCloseTo(1, 2);
    expect(convert({ value: 1, unit: 'kg' }, 'g')!.value).toBe(1000);
    expect(convert({ value: 2, max: 3, unit: 'l' }, 'ml')).toEqual({ value: 2000, max: 3000, unit: 'ml' });
  });

  it('refuses to convert across dimensions or between count units', () => {
    expect(convert({ value: 1, unit: 'cup' }, 'g')).toBeNull();
    expect(convert({ value: 1, unit: 'clove' }, 'can')).toBeNull();
    expect(areCompatible(null, 'g')).toBe(false);
    expect(areCompatible(null, null)).toBe(true);
  });

  it('picks readable display units', () => {
    expect(toDisplayUnit({ value: 1000, unit: 'ml' }, 'metric')).toEqual({ value: 1, unit: 'l' });
    expect(toDisplayUnit({ value: 500, unit: 'ml' }, 'metric')).toEqual({ value: 500, unit: 'ml' });
    expect(toDisplayUnit({ value: 3, unit: 'tsp' }, 'imperial').unit).toBe('tbsp');
    expect(toDisplayUnit({ value: 2, unit: 'clove' }, 'metric')).toEqual({ value: 2, unit: 'clove' });
  });
});
