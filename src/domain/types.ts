export type Id = string;
export type EpochMs = number;

export type UnitDimension = 'volume' | 'mass' | 'count';
export type UnitSystem = 'metric' | 'imperial';

export interface UnitDef {
  key: string;
  dimension: UnitDimension;
  /** Factor to the dimension's base unit (ml for volume, g for mass, 1 for count). */
  toBase: number;
  /** Lowercase aliases accepted when parsing text. */
  labels: string[];
}

/** An amount of something. `value` null means unspecified ("to taste"). */
export interface Quantity {
  value: number | null;
  /** Upper bound of a range ("2-3"). */
  max?: number;
  /** UnitDef.key, or null for plain counts ("3 eggs"). */
  unit: string | null;
}

export interface Ingredient {
  id: Id;
  groupName: string | null;
  quantity: Quantity;
  name: string;
  note: string | null;
  rawText: string | null;
}

export interface Step {
  id: Id;
  text: string;
  timerSeconds: number | null;
}

export interface Photo {
  id: Id;
  stepId: Id | null;
  uri: string;
  thumbUri: string;
  width: number;
  height: number;
}

export interface Recipe {
  id: Id;
  title: string;
  description: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  source: string | null;
  sourceUrl: string | null;
  notes: string | null;
  isFavorite: boolean;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  /** Ordered. The cover is the first photo with stepId null. */
  photos: Photo[];
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface RecipeSummary {
  id: Id;
  title: string;
  coverThumbUri: string | null;
  totalMinutes: number | null;
  isFavorite: boolean;
  tags: string[];
}

/** A photo in the editor: existing (no sourceUri) or newly picked (sourceUri to import). */
export interface PhotoDraft {
  id: Id;
  stepId: Id | null;
  sourceUri?: string;
}

/**
 * Editor input. All ids are generated client-side (newId), including for new
 * recipes, so saving is an upsert keyed on id.
 */
export type RecipeDraft = Omit<Recipe, 'createdAt' | 'updatedAt' | 'totalMinutes' | 'photos'> & {
  photos: PhotoDraft[];
};

export interface ShoppingItemSource {
  recipeId: Id | null;
  recipeTitle: string;
  quantity: Quantity;
}

export interface ShoppingItem {
  id: Id;
  name: string;
  quantity: Quantity;
  aisle: string | null;
  isChecked: boolean;
  isManual: boolean;
  sources: ShoppingItemSource[];
}

export interface ShoppingList {
  id: Id;
  name: string;
  items: ShoppingItem[];
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface ShoppingListSummary {
  id: Id;
  name: string;
  itemCount: number;
  checkedCount: number;
  updatedAt: EpochMs;
}

/** Output of list generation, before persistence. */
export interface ShoppingItemDraft {
  name: string;
  nameKey: string;
  quantity: Quantity;
  sources: ShoppingItemSource[];
}

export interface ShoppingSelection {
  recipe: Pick<Recipe, 'id' | 'title' | 'servings' | 'ingredients'>;
  targetServings: number;
}
