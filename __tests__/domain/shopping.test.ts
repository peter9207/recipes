import { buildShoppingItems, mergeIngredients, normalizeName, scaleIngredients, validateDraft, type RecipeDraft } from '@/domain';

const ing = (name: string, value: number | null, unit: string | null = null) => ({
  id: name, groupName: null, name, note: null, rawText: null, quantity: { value, unit },
});

describe('normalizeName', () => {
  it.each([
    ['Yellow Onions', 'yellow onion'], ['tomatoes', 'tomato'], ['berries', 'berry'], ['peaches', 'peach'],
    ['Fresh basil', 'basil'], ['hummus', 'hummus'], ['asparagus', 'asparagus'], ['eggs', 'egg'], ['molasses', 'molasses'],
  ])('%s → %s', (input, expected) => expect(normalizeName(input)).toBe(expected));
});

describe('scaleIngredients', () => {
  it('scales amounts and ranges, leaving unspecified alone', () => {
    const out = scaleIngredients(
      [{ quantity: { value: 2, max: 3, unit: 'cup' } }, { quantity: { value: null, unit: null } }], 4, 8);
    expect(out[0].quantity).toEqual({ value: 4, max: 6, unit: 'cup' });
    expect(out[1].quantity.value).toBeNull();
  });
  it('is a no-op for invalid servings', () => {
    const input = [{ quantity: { value: 1, unit: null } }];
    expect(scaleIngredients(input, 0, 4)).toBe(input);
  });
});

describe('mergeIngredients', () => {
  const line = (name: string, value: number | null, unit: string | null, recipeTitle = 'R') => ({
    name, quantity: { value, unit }, recipeId: recipeTitle, recipeTitle,
  });

  it('sums identical units and singular/plural names', () => {
    const [item] = mergeIngredients([line('onion', 1, null, 'A'), line('Onions', 2, null, 'B')]);
    expect(item.quantity).toEqual({ value: 3, unit: null });
    expect(item.sources.map((s) => s.recipeTitle)).toEqual(['A', 'B']);
  });
  it('converts compatible units into the first unit', () => {
    const [item] = mergeIngredients([line('flour', 1, 'kg'), line('flour', 500, 'g')]);
    expect(item.quantity).toEqual({ value: 1.5, unit: 'kg' });
  });
  it('keeps different dimensions on separate lines', () => {
    const items = mergeIngredients([line('onion', 1, null), line('onion', 100, 'g')]);
    expect(items).toHaveLength(2);
  });
  it('keeps different count units separate', () => {
    expect(mergeIngredients([line('tomato', 1, 'can'), line('tomato', 2, 'piece')])).toHaveLength(2);
  });
  it('folds unspecified amounts into a quantified line', () => {
    const items = mergeIngredients([line('salt', null, null, 'A'), line('salt', 1, 'tsp', 'B')]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toEqual({ value: 1, unit: 'tsp' });
    expect(items[0].sources).toHaveLength(2);
  });
  it('keeps an unspecified-only item', () => {
    const items = mergeIngredients([line('salt', null, null, 'A'), line('salt', null, null, 'B')]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity.value).toBeNull();
  });
  it('sums ranges', () => {
    const [item] = mergeIngredients([
      { name: 'garlic', quantity: { value: 2, max: 3, unit: 'clove' }, recipeId: 'a', recipeTitle: 'A' },
      line('garlic', 1, 'clove'),
    ]);
    expect(item.quantity).toEqual({ value: 3, max: 4, unit: 'clove' });
  });
  it('preserves first-seen order', () => {
    expect(mergeIngredients([line('b', 1, null), line('a', 1, null), line('b', 1, null)]).map((i) => i.name)).toEqual(['b', 'a']);
  });
});

describe('buildShoppingItems', () => {
  it('scales per recipe then merges', () => {
    const items = buildShoppingItems([
      { recipe: { id: 'r1', title: 'Soup', servings: 2, ingredients: [ing('onion', 1), ing('stock', 500, 'ml')] }, targetServings: 4 },
      { recipe: { id: 'r2', title: 'Stew', servings: 4, ingredients: [ing('onions', 2), ing('stock', 1, 'l')] }, targetServings: 4 },
    ]);
    const onion = items.find((i) => i.nameKey === 'onion')!;
    const stock = items.find((i) => i.nameKey === 'stock')!;
    expect(onion.quantity).toEqual({ value: 4, unit: null });
    expect(stock.quantity).toEqual({ value: 2000, unit: 'ml' });
    expect(stock.sources.map((s) => s.recipeId)).toEqual(['r1', 'r2']);
  });
});

describe('validateDraft', () => {
  const base: RecipeDraft = {
    id: '1', title: 'Soup', description: null, servings: 4, prepMinutes: 5, cookMinutes: null, source: null,
    sourceUrl: null, notes: null, isFavorite: false, tags: [], ingredients: [], steps: [], photos: [],
  };
  it('accepts a valid draft', () => expect(validateDraft(base)).toEqual([]));
  it('reports problems', () => {
    const errors = validateDraft({ ...base, title: ' ', servings: 0, prepMinutes: -1,
      ingredients: [ing('', 1)], steps: [{ id: 's', text: '', timerSeconds: null }] });
    expect(errors).toEqual(expect.arrayContaining([
      'Title is required', 'Servings must be greater than 0', 'Times cannot be negative',
      'Every ingredient needs a name', 'Steps cannot be empty',
    ]));
  });
});
