import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { id, softDelete, timestamps } from './common';
import { recipes } from './recipes';

export const tags = sqliteTable('tags', {
  id: id(),
  name: text('name').notNull(),
  /** Lowercased/trimmed name; enforces uniqueness regardless of case. */
  nameKey: text('name_key').notNull().unique(),
  ...timestamps,
});

export const recipeTags = sqliteTable(
  'recipe_tags',
  {
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.tagId] })],
);

// P1: tables exist now so adding the feature later needs no schema rework.
export const collections = sqliteTable('collections', {
  id: id(),
  name: text('name').notNull(),
  ...timestamps,
  ...softDelete,
});

export const collectionRecipes = sqliteTable(
  'collection_recipes',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.recipeId] })],
);
