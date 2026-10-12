import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { areCompatible, buildShoppingItems, convert, normalizeName } from '@/domain';
import type {
  Id, Quantity, ShoppingItem, ShoppingItemDraft, ShoppingItemSource, ShoppingList, ShoppingListSummary, ShoppingSelection,
} from '@/domain';
import { newId } from '@/lib/id';
import { now as clock } from '@/lib/time';
import type { AppDb } from '../db/types';
import { shoppingItems, shoppingItemSources, shoppingLists } from '../db/schema';
import { quantityFromRow, quantityToCols } from '../mappers/rows';

export interface ItemPatch {
  name?: string;
  quantity?: Quantity;
  isChecked?: boolean;
  aisle?: string | null;
}

/** Can `add` be folded into an existing line with quantity `into`? */
function canSum(into: Quantity, add: Quantity): boolean {
  return into.value !== null && add.value !== null && areCompatible(into.unit, add.unit);
}

export function createShoppingRepository(db: AppDb) {
  function insertItem(
    t: AppDb,
    listId: Id,
    draft: { name: string; nameKey: string; quantity: Quantity; sources: ShoppingItemSource[]; isManual: boolean },
    position: number,
  ): void {
    const ts = clock();
    const itemId = newId();
    t.insert(shoppingItems)
      .values({
        id: itemId, listId, name: draft.name, nameKey: draft.nameKey, ...quantityToCols(draft.quantity),
        isManual: draft.isManual, position, createdAt: ts, updatedAt: ts,
      })
      .run();
    insertSources(t, itemId, draft.sources);
  }

  function insertSources(t: AppDb, itemId: Id, sources: ShoppingItemSource[]): void {
    if (sources.length === 0) return;
    t.insert(shoppingItemSources)
      .values(sources.map((s) => ({
        id: newId(), itemId, recipeId: s.recipeId, recipeTitle: s.recipeTitle, ...quantityToCols(s.quantity),
      })))
      .run();
  }

  function nextPosition(t: AppDb, listId: Id): number {
    const row = t
      .select({ max: sql<number | null>`max(${shoppingItems.position})` })
      .from(shoppingItems)
      .where(eq(shoppingItems.listId, listId))
      .get();
    return (row?.max ?? -1) + 1;
  }

  /**
   * Add generated items to a list. An extra amount is folded into an existing *unchecked* line when the
   * units are compatible; checked lines are left alone and a fresh unchecked line is created instead.
   */
  function applyDrafts(t: AppDb, listId: Id, drafts: ShoppingItemDraft[]): void {
    let position = nextPosition(t, listId);
    for (const draft of drafts) {
      const candidates = t
        .select()
        .from(shoppingItems)
        .where(and(eq(shoppingItems.listId, listId), eq(shoppingItems.nameKey, draft.nameKey), eq(shoppingItems.isChecked, false)))
        .orderBy(asc(shoppingItems.position))
        .all();
      const target = candidates.find((c) => {
        const q = quantityFromRow(c);
        return q.value === null && draft.quantity.value === null ? true : canSum(q, draft.quantity);
      });
      if (!target) {
        insertItem(t, listId, { ...draft, isManual: false }, position++);
        continue;
      }
      const into = quantityFromRow(target);
      if (into.value !== null) {
        const add = convert(draft.quantity, into.unit)!;
        const max = into.max !== undefined || add.max !== undefined
          ? (into.max ?? into.value) + (add.max ?? add.value!)
          : undefined;
        const merged: Quantity = { value: into.value + add.value!, ...(max !== undefined ? { max } : {}), unit: into.unit };
        t.update(shoppingItems).set({ ...quantityToCols(merged), updatedAt: clock() }).where(eq(shoppingItems.id, target.id)).run();
      }
      insertSources(t, target.id, draft.sources);
    }
    t.update(shoppingLists).set({ updatedAt: clock() }).where(eq(shoppingLists.id, listId)).run();
  }

  async function get(id: Id): Promise<ShoppingList | null> {
    const list = db.select().from(shoppingLists).where(and(eq(shoppingLists.id, id), isNull(shoppingLists.deletedAt))).get();
    if (!list) return null;
    const rows = db.select().from(shoppingItems).where(eq(shoppingItems.listId, id)).orderBy(asc(shoppingItems.position)).all();
    const srcRows = rows.length
      ? db.select().from(shoppingItemSources).where(inArray(shoppingItemSources.itemId, rows.map((r) => r.id))).all()
      : [];
    const items: ShoppingItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      quantity: quantityFromRow(r),
      aisle: r.aisle,
      isChecked: r.isChecked,
      isManual: r.isManual,
      sources: srcRows
        .filter((s) => s.itemId === r.id)
        .map((s) => ({ recipeId: s.recipeId, recipeTitle: s.recipeTitle, quantity: quantityFromRow(s) })),
    }));
    return { id: list.id, name: list.name, items, createdAt: list.createdAt, updatedAt: list.updatedAt };
  }

  async function listLists(): Promise<ShoppingListSummary[]> {
    return db
      .select({
        id: shoppingLists.id,
        name: shoppingLists.name,
        updatedAt: shoppingLists.updatedAt,
        itemCount: sql<number>`count(${shoppingItems.id})`,
        checkedCount: sql<number>`coalesce(sum(${shoppingItems.isChecked}), 0)`,
      })
      .from(shoppingLists)
      .leftJoin(shoppingItems, eq(shoppingItems.listId, shoppingLists.id))
      .where(and(isNull(shoppingLists.deletedAt), isNull(shoppingLists.archivedAt)))
      .groupBy(shoppingLists.id)
      .orderBy(sql`${shoppingLists.updatedAt} DESC`)
      .all();
  }

  async function createList(name: string): Promise<ShoppingList> {
    const ts = clock();
    const id = newId();
    db.insert(shoppingLists).values({ id, name: name.trim() || 'Shopping list', createdAt: ts, updatedAt: ts }).run();
    return (await get(id))!;
  }

  async function createFromSelections(name: string, selections: ShoppingSelection[]): Promise<ShoppingList> {
    const drafts = buildShoppingItems(selections);
    const id = db.transaction((tx) => {
      const t = tx as unknown as AppDb;
      const ts = clock();
      const listId = newId();
      t.insert(shoppingLists).values({ id: listId, name: name.trim() || 'Shopping list', createdAt: ts, updatedAt: ts }).run();
      applyDrafts(t, listId, drafts);
      return listId;
    });
    return (await get(id))!;
  }

  async function addToList(listId: Id, selections: ShoppingSelection[]): Promise<ShoppingList> {
    const drafts = buildShoppingItems(selections);
    db.transaction((tx) => applyDrafts(tx as unknown as AppDb, listId, drafts));
    return (await get(listId))!;
  }

  async function addManualItem(listId: Id, item: { name: string; quantity?: Quantity }): Promise<void> {
    db.transaction((tx) => {
      const t = tx as unknown as AppDb;
      insertItem(t, listId, {
        name: item.name.trim(), nameKey: normalizeName(item.name), quantity: item.quantity ?? { value: null, unit: null },
        sources: [], isManual: true,
      }, nextPosition(t, listId));
      t.update(shoppingLists).set({ updatedAt: clock() }).where(eq(shoppingLists.id, listId)).run();
    });
  }

  async function updateItem(itemId: Id, patch: ItemPatch): Promise<void> {
    const set: Partial<typeof shoppingItems.$inferInsert> = { updatedAt: clock() };
    if (patch.name !== undefined) Object.assign(set, { name: patch.name.trim(), nameKey: normalizeName(patch.name) });
    if (patch.quantity !== undefined) Object.assign(set, quantityToCols(patch.quantity));
    if (patch.isChecked !== undefined) set.isChecked = patch.isChecked;
    if (patch.aisle !== undefined) set.aisle = patch.aisle;
    db.update(shoppingItems).set(set).where(eq(shoppingItems.id, itemId)).run();
  }

  async function deleteItem(itemId: Id): Promise<void> {
    db.delete(shoppingItems).where(eq(shoppingItems.id, itemId)).run();
  }

  async function clearChecked(listId: Id): Promise<void> {
    db.delete(shoppingItems).where(and(eq(shoppingItems.listId, listId), eq(shoppingItems.isChecked, true))).run();
  }

  async function rename(listId: Id, name: string): Promise<void> {
    db.update(shoppingLists).set({ name: name.trim(), updatedAt: clock() }).where(eq(shoppingLists.id, listId)).run();
  }

  async function softDelete(id: Id): Promise<void> {
    db.update(shoppingLists).set({ deletedAt: clock() }).where(eq(shoppingLists.id, id)).run();
  }

  return {
    get, listLists, createList, createFromSelections, addToList, addManualItem,
    updateItem, deleteItem, clearChecked, rename, softDelete,
  };
}

export type ShoppingRepository = ReturnType<typeof createShoppingRepository>;
