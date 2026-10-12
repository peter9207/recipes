import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { id, softDelete, timestamps } from './common';

export const recipes = sqliteTable(
  'recipes',
  {
    id: id(),
    title: text('title').notNull(),
    description: text('description'),
    servings: real('servings').notNull().default(4),
    prepMinutes: integer('prep_minutes'),
    cookMinutes: integer('cook_minutes'),
    source: text('source'),
    sourceUrl: text('source_url'),
    notes: text('notes'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('recipes_deleted_idx').on(t.deletedAt), index('recipes_title_idx').on(t.title)],
);

export const ingredients = sqliteTable(
  'ingredients',
  {
    id: id(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    groupName: text('group_name'),
    quantity: real('quantity'),
    quantityMax: real('quantity_max'),
    unit: text('unit'),
    name: text('name').notNull(),
    note: text('note'),
    rawText: text('raw_text'),
  },
  (t) => [index('ingredients_recipe_idx').on(t.recipeId, t.position)],
);

export const steps = sqliteTable(
  'steps',
  {
    id: id(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    timerSeconds: integer('timer_seconds'),
  },
  (t) => [index('steps_recipe_idx').on(t.recipeId, t.position)],
);

export const photos = sqliteTable(
  'photos',
  {
    id: id(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    stepId: text('step_id').references(() => steps.id, { onDelete: 'set null' }),
    position: integer('position').notNull(),
    path: text('path').notNull(),
    thumbPath: text('thumb_path').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('photos_recipe_idx').on(t.recipeId, t.position)],
);
