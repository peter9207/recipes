import { integer, text } from 'drizzle-orm/sqlite-core';

/** UUID v7 string primary key, generated client-side. */
export const id = () => text('id').primaryKey();

/** Epoch milliseconds (UTC). */
export const timestamps = {
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
};

/** Null while active; set when soft-deleted. */
export const softDelete = {
  deletedAt: integer('deleted_at'),
};
