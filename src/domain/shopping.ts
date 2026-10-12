import { mergeIngredients, type MergeInput } from './merge';
import { scaleIngredients } from './scale';
import type { ShoppingItemDraft, ShoppingSelection } from './types';

/** Scale each selected recipe to its target servings, then merge everything into shopping items. */
export function buildShoppingItems(selections: ShoppingSelection[]): ShoppingItemDraft[] {
  const lines: MergeInput[] = [];
  for (const { recipe, targetServings } of selections) {
    const scaled = scaleIngredients(recipe.ingredients, recipe.servings, targetServings);
    for (const ing of scaled) {
      lines.push({
        name: ing.name,
        quantity: ing.quantity,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
      });
    }
  }
  return mergeIngredients(lines);
}
