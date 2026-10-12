import { formatNumber, formatQuantity, parseLeadingQuantity, parseNumber } from '@/domain';

describe('parseNumber', () => {
  it.each([
    ['2', 2], ['1.5', 1.5], ['.5', 0.5], ['1/2', 0.5], ['1 1/2', 1.5], ['½', 0.5], ['1½', 1.5], ['2 ¾', 2.75],
  ])('%s → %s', (input, expected) => expect(parseNumber(input)).toBeCloseTo(expected));
  it('rejects junk', () => {
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1/0')).toBeNull();
  });
});

describe('parseLeadingQuantity', () => {
  it('reads amount and remainder', () => {
    expect(parseLeadingQuantity('2 cups flour')).toEqual({ value: 2, rest: 'cups flour' });
    expect(parseLeadingQuantity('1 1/2 tsp salt')).toEqual({ value: 1.5, rest: 'tsp salt' });
  });
  it('reads ranges', () => {
    expect(parseLeadingQuantity('2-3 cloves garlic')).toEqual({ value: 2, max: 3, rest: 'cloves garlic' });
    expect(parseLeadingQuantity('2 to 3 apples')).toEqual({ value: 2, max: 3, rest: 'apples' });
  });
  it('treats 1-1/2 as one and a half', () => {
    expect(parseLeadingQuantity('1-1/2 cups milk')).toEqual({ value: 1.5, rest: 'cups milk' });
  });
  it('does not mistake words starting with "to" for ranges', () => {
    expect(parseLeadingQuantity('2 tomatoes')).toEqual({ value: 2, rest: 'tomatoes' });
  });
  it('returns null without a leading number', () => {
    expect(parseLeadingQuantity('salt')).toBeNull();
  });
});

describe('formatting', () => {
  it.each([
    [1, '1'], [1.5, '1 ½'], [0.333, '⅓'], [0.25, '¼'], [2.2, '2.2'], [2.99, '3'], [0.67, '⅔'],
  ])('formatNumber(%s) → %s', (n, s) => expect(formatNumber(n)).toBe(s));

  it('formats quantities', () => {
    expect(formatQuantity({ value: 1.5, unit: 'cup' })).toBe('1 ½ cup');
    expect(formatQuantity({ value: 2, max: 3, unit: 'tbsp' })).toBe('2–3 tbsp');
    expect(formatQuantity({ value: 3, unit: null })).toBe('3');
    expect(formatQuantity({ value: null, unit: null })).toBe('');
  });
});
