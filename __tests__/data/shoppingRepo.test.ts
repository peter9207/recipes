import { createShoppingRepository } from '@/data/repositories/shoppingRepo';
import type { ShoppingSelection } from '@/domain';
import { recipes } from '@/data/db/schema';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../testDb';

const ing = (name: string, value: number | null, unit: string | null = null) => ({
  quantity: { value, unit }, name,
});
const sel = (id: string, title: string, servings: number, target: number, ingredients: ReturnType<typeof ing>[]): ShoppingSelection => ({
  recipe: { id, title, servings, ingredients: ingredients.map((i, n) => ({ id: `${id}-${n}`, groupName: null, note: null, rawText: null, ...i })) },
  targetServings: target,
});

const soup = sel('r1', 'Soup', 2, 4, [ing('onion', 1), ing('stock', 500, 'ml'), ing('salt', null)]);
const stew = sel('r2', 'Stew', 4, 4, [ing('onions', 2), ing('stock', 1, 'l')]);

function setup() {
  const db = createTestDb();
  for (const id of ['r1', 'r2']) {
    db.insert(recipes).values({ id, title: id, createdAt: 1, updatedAt: 1 }).run();
  }
  return createShoppingRepository(db);
}

describe('shoppingRepo', () => {
  it('generates a merged, scaled list with sources', async () => {
    const repo = setup();
    const list = await repo.createFromSelections('Week 1', [soup, stew]);
    expect(list.name).toBe('Week 1');
    const byName = Object.fromEntries(list.items.map((i) => [i.name, i]));
    expect(byName.onion.quantity).toEqual({ value: 4, unit: null });
    expect(byName.onion.sources.map((s) => s.recipeTitle).sort()).toEqual(['Soup', 'Stew']);
    expect(byName.stock.quantity).toEqual({ value: 2000, unit: 'ml' });
    expect(byName.salt.quantity.value).toBeNull();
    expect(list.items.every((i) => !i.isChecked && !i.isManual)).toBe(true);
  });

  it('checks off, edits, deletes and clears checked items', async () => {
    const repo = setup();
    const list = await repo.createFromSelections('L', [soup]);
    const [onion, stock, salt] = list.items;
    await repo.updateItem(onion.id, { isChecked: true });
    await repo.updateItem(stock.id, { name: 'Chicken stock', quantity: { value: 1, unit: 'l' }, aisle: 'pantry' });
    await repo.deleteItem(salt.id);
    let after = (await repo.get(list.id))!;
    expect(after.items.map((i) => [i.name, i.isChecked])).toEqual([['onion', true], ['Chicken stock', false]]);
    expect(after.items[1]).toMatchObject({ quantity: { value: 1, unit: 'l' }, aisle: 'pantry' });
    await repo.clearChecked(list.id);
    after = (await repo.get(list.id))!;
    expect(after.items.map((i) => i.name)).toEqual(['Chicken stock']);
  });

  it('adds manual items at the end', async () => {
    const repo = setup();
    const list = await repo.createList('Groceries');
    await repo.addManualItem(list.id, { name: 'Milk', quantity: { value: 1, unit: 'l' } });
    await repo.addManualItem(list.id, { name: 'Bread' });
    const after = (await repo.get(list.id))!;
    expect(after.items.map((i) => [i.name, i.isManual])).toEqual([['Milk', true], ['Bread', true]]);
  });

  it('adding a recipe folds into unchecked lines but not checked ones', async () => {
    const repo = setup();
    const list = await repo.createFromSelections('L', [soup]);
    const onion = list.items.find((i) => i.name === 'onion')!;
    const stock = list.items.find((i) => i.name === 'stock')!;
    await repo.updateItem(onion.id, { isChecked: true });

    const after = await repo.addToList(list.id, [stew]);
    const onions = after.items.filter((i) => i.name.startsWith('onion'));
    expect(onions).toHaveLength(2);
    expect(onions.find((i) => i.isChecked)!.quantity).toEqual({ value: 2, unit: null });
    expect(onions.find((i) => !i.isChecked)!.quantity).toEqual({ value: 2, unit: null });
    const mergedStock = after.items.find((i) => i.id === stock.id)!;
    expect(mergedStock.quantity).toEqual({ value: 2000, unit: 'ml' });
    expect(mergedStock.sources.map((s) => s.recipeTitle).sort()).toEqual(['Soup', 'Stew']);
  });

  it('lists lists with counts, newest first, excluding deleted', async () => {
    const repo = setup();
    const a = await repo.createFromSelections('A', [soup]);
    const b = await repo.createList('B');
    await repo.updateItem(a.items[0].id, { isChecked: true });
    const lists = await repo.listLists();
    expect(lists.find((l) => l.id === a.id)).toMatchObject({ itemCount: 3, checkedCount: 1 });
    expect(lists.find((l) => l.id === b.id)).toMatchObject({ itemCount: 0, checkedCount: 0 });
    await repo.softDelete(b.id);
    expect((await repo.listLists()).map((l) => l.id)).toEqual([a.id]);
    expect(await repo.get(b.id)).toBeNull();
  });

  it('keeps source rows (with title snapshot) when a recipe is hard-deleted', async () => {
    const db = createTestDb();
    db.insert(recipes).values({ id: 'r1', title: 'Soup', createdAt: 1, updatedAt: 1 }).run();
    const repo = createShoppingRepository(db);
    const list = await repo.createFromSelections('L', [soup]);
    db.delete(recipes).where(eq(recipes.id, 'r1')).run();
    const after = (await repo.get(list.id))!;
    expect(after.items.find((i) => i.name === 'onion')!.sources).toEqual([
      { recipeId: null, recipeTitle: 'Soup', quantity: { value: 2, unit: null } },
    ]);
  });
});
