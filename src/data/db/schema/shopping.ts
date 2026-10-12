import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { id, softDelete, timestamps } from './common';
import { recipes } from './recipes';

export const shoppingLists = sqliteTable('shopping_lists', {
  id: id(),
  name: text('name').notNull(),
  archivedAt: integer('archived_at'),
  ...timestamps,
  ...softDelete,
});

export const shoppingItems = sqliteTable(
  'shopping_items',
  {
    id: id(),
    listId: text('list_id')
      .notNull()
      .references(() => shoppingLists.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameKey: text('name_key').notNull(),
    quantity: real('quantity'),
    quantityMax: real('quantity_max'),
    unit: text('unit'),
    aisle: text('aisle'),
    isChecked: integer('is_checked', { mode: 'boolean' }).notNull().default(false),
    isManual: integer('is_manual', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('shopping_items_list_idx').on(t.listId)],
);

/** Which recipes contributed to an item and how much. Title is a snapshot so it survives recipe deletion. */
export const shoppingItemSources = sqliteTable(
  'shopping_item_sources',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => shoppingItems.id, { onDelete: 'cascade' }),
    recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
    recipeTitle: text('recipe_title').notNull(),
    quantity: real('quantity'),
    quantityMax: real('quantity_max'),
    unit: text('unit'),
  },
  (t) => [index('shopping_item_sources_item_idx').on(t.itemId)],
);
