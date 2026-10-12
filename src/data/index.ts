import { getDb } from './db/client';
import { expoPhotoStore } from './files/photoStore';
import { createRecipeRepository } from './repositories/recipeRepo';
import { createShoppingRepository } from './repositories/shoppingRepo';

export { runMigrations } from './db/client';
export { DraftValidationError } from './repositories/recipeRepo';
export type { RecipeRepository, ListOptions } from './repositories/recipeRepo';
export type { ShoppingRepository } from './repositories/shoppingRepo';

let repos: { recipes: ReturnType<typeof createRecipeRepository>; shopping: ReturnType<typeof createShoppingRepository> } | null = null;

/** App-wide repositories bound to the on-device database. */
export function getRepositories() {
  if (!repos) {
    const db = getDb();
    repos = { recipes: createRecipeRepository(db, expoPhotoStore), shopping: createShoppingRepository(db) };
  }
  return repos;
}
