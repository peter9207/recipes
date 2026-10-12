import { and, asc, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { totalMinutes, validateDraft } from '@/domain';
import type { Id, Ingredient, Photo, Recipe, RecipeDraft, RecipeSummary, Step } from '@/domain';
import { newId } from '@/lib/id';
import { now as clock } from '@/lib/time';
import type { AppDb } from '../db/types';
import { ingredients, photos, recipes, recipeTags, steps, tags } from '../db/schema';
import type { PhotoStore } from '../files/photoStore';
import { quantityFromRow, quantityToCols } from '../mappers/rows';

export interface ListOptions {
  /** Free text matched against title, description, ingredients and tags (prefix match per word). */
  search?: string;
  /** Recipe must have all of these tags (case-insensitive). */
  tags?: string[];
  favoritesOnly?: boolean;
  sort?: 'title' | 'createdAt' | 'updatedAt';
}

export class DraftValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join('; '));
    this.name = 'DraftValidationError';
  }
}

const tagKey = (name: string) => name.trim().toLowerCase();

/** "choc chip" → `"choc"* "chip"*` (AND of prefixes), safe against FTS syntax in user input. */
function toFtsQuery(search: string): string | null {
  const tokens = search.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.length ? tokens.map((t) => `"${t}"*`).join(' ') : null;
}

export function createRecipeRepository(db: AppDb, photoStore: PhotoStore) {
  function indexRecipe(tx: AppDb, id: Id): void {
    tx.run(sql`DELETE FROM recipes_fts WHERE recipe_id = ${id}`);
    const r = tx.select().from(recipes).where(eq(recipes.id, id)).get();
    if (!r || r.deletedAt !== null) return;
    const ing = tx.select({ name: ingredients.name }).from(ingredients).where(eq(ingredients.recipeId, id)).all();
    const tg = tx
      .select({ name: tags.name })
      .from(recipeTags)
      .innerJoin(tags, eq(tags.id, recipeTags.tagId))
      .where(eq(recipeTags.recipeId, id))
      .all();
    tx.run(sql`INSERT INTO recipes_fts (recipe_id, title, description, ingredients, tags)
      VALUES (${id}, ${r.title}, ${r.description ?? ''}, ${ing.map((i) => i.name).join(' ')}, ${tg.map((t) => t.name).join(' ')})`);
  }

  function tagsFor(recipeIds: Id[]): Map<Id, string[]> {
    const map = new Map<Id, string[]>();
    if (recipeIds.length === 0) return map;
    const rows = db
      .select({ recipeId: recipeTags.recipeId, name: tags.name })
      .from(recipeTags)
      .innerJoin(tags, eq(tags.id, recipeTags.tagId))
      .where(inArray(recipeTags.recipeId, recipeIds))
      .orderBy(asc(tags.nameKey))
      .all();
    for (const r of rows) map.set(r.recipeId, [...(map.get(r.recipeId) ?? []), r.name]);
    return map;
  }

  async function get(id: Id): Promise<Recipe | null> {
    const r = db.select().from(recipes).where(and(eq(recipes.id, id), isNull(recipes.deletedAt))).get();
    if (!r) return null;

    const ing: Ingredient[] = db
      .select()
      .from(ingredients)
      .where(eq(ingredients.recipeId, id))
      .orderBy(asc(ingredients.position))
      .all()
      .map((row) => ({
        id: row.id,
        groupName: row.groupName,
        quantity: quantityFromRow(row),
        name: row.name,
        note: row.note,
        rawText: row.rawText,
      }));
    const stp: Step[] = db
      .select()
      .from(steps)
      .where(eq(steps.recipeId, id))
      .orderBy(asc(steps.position))
      .all()
      .map((row) => ({ id: row.id, text: row.text, timerSeconds: row.timerSeconds }));
    const pics: Photo[] = db
      .select()
      .from(photos)
      .where(eq(photos.recipeId, id))
      .orderBy(asc(photos.position))
      .all()
      .map((row) => ({
        id: row.id,
        stepId: row.stepId,
        uri: photoStore.resolve(row.path),
        thumbUri: photoStore.resolve(row.thumbPath),
        width: row.width,
        height: row.height,
      }));

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      servings: r.servings,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      totalMinutes: totalMinutes(r.prepMinutes, r.cookMinutes),
      source: r.source,
      sourceUrl: r.sourceUrl,
      notes: r.notes,
      isFavorite: r.isFavorite,
      tags: tagsFor([id]).get(id) ?? [],
      ingredients: ing,
      steps: stp,
      photos: pics,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async function list(opts: ListOptions = {}): Promise<RecipeSummary[]> {
    const conds = [isNull(recipes.deletedAt)];
    if (opts.favoritesOnly) conds.push(eq(recipes.isFavorite, true));

    if (opts.search) {
      const q = toFtsQuery(opts.search);
      if (q) {
        const hits = db.all<{ recipe_id: string }>(sql`SELECT recipe_id FROM recipes_fts WHERE recipes_fts MATCH ${q}`);
        if (hits.length === 0) return [];
        conds.push(inArray(recipes.id, hits.map((h) => h.recipe_id)));
      }
    }
    const wanted = [...new Set((opts.tags ?? []).map(tagKey))];
    if (wanted.length) {
      const matching = db
        .select({ recipeId: recipeTags.recipeId })
        .from(recipeTags)
        .innerJoin(tags, eq(tags.id, recipeTags.tagId))
        .where(inArray(tags.nameKey, wanted))
        .groupBy(recipeTags.recipeId)
        .having(sql`count(distinct ${tags.id}) = ${wanted.length}`)
        .all();
      if (matching.length === 0) return [];
      conds.push(inArray(recipes.id, matching.map((m) => m.recipeId)));
    }

    const order =
      opts.sort === 'createdAt' ? desc(recipes.createdAt)
      : opts.sort === 'updatedAt' ? desc(recipes.updatedAt)
      : sql`${recipes.title} COLLATE NOCASE ASC`;
    const rows = db.select().from(recipes).where(and(...conds)).orderBy(order).all();
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const covers = new Map<Id, string>();
    const cover = db
      .select({ recipeId: photos.recipeId, thumbPath: photos.thumbPath })
      .from(photos)
      .where(and(inArray(photos.recipeId, ids), isNull(photos.stepId)))
      .orderBy(asc(photos.position))
      .all();
    for (const c of cover) if (!covers.has(c.recipeId)) covers.set(c.recipeId, c.thumbPath);
    const tagMap = tagsFor(ids);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      coverThumbUri: covers.has(r.id) ? photoStore.resolve(covers.get(r.id)!) : null,
      totalMinutes: totalMinutes(r.prepMinutes, r.cookMinutes),
      isFavorite: r.isFavorite,
      tags: tagMap.get(r.id) ?? [],
    }));
  }

  async function save(draft: RecipeDraft): Promise<Recipe> {
    const problems = validateDraft(draft);
    if (problems.length) throw new DraftValidationError(problems);

    // Files first (async); DB changes next (one sync transaction); stale files last.
    const imported = new Map<Id, Awaited<ReturnType<PhotoStore['importFromUri']>>>();
    try {
      for (const p of draft.photos) {
        if (p.sourceUri) imported.set(p.id, await photoStore.importFromUri(p.sourceUri, p.id));
      }
    } catch (e) {
      await photoStore.delete([...imported.values()].flatMap((i) => [i.path, i.thumbPath]));
      throw e;
    }

    let stalePaths: string[] = [];
    try {
      stalePaths = db.transaction((tx) => {
        const t = tx as unknown as AppDb;
        const ts = clock();
        const base = {
          title: draft.title.trim(),
          description: draft.description,
          servings: draft.servings,
          prepMinutes: draft.prepMinutes,
          cookMinutes: draft.cookMinutes,
          source: draft.source,
          sourceUrl: draft.sourceUrl,
          notes: draft.notes,
          isFavorite: draft.isFavorite,
          updatedAt: ts,
        };
        t.insert(recipes)
          .values({ id: draft.id, createdAt: ts, ...base })
          .onConflictDoUpdate({ target: recipes.id, set: { ...base, deletedAt: null } })
          .run();

        // Ingredients: replaced wholesale (nothing references them).
        t.delete(ingredients).where(eq(ingredients.recipeId, draft.id)).run();
        if (draft.ingredients.length) {
          t.insert(ingredients)
            .values(
              draft.ingredients.map((i, position) => ({
                id: i.id,
                recipeId: draft.id,
                position,
                groupName: i.groupName,
                name: i.name.trim(),
                note: i.note,
                rawText: i.rawText,
                ...quantityToCols(i.quantity),
              })),
            )
            .run();
        }

        // Steps: upsert by id (photos reference them); removed steps are deleted after photos settle.
        for (const [position, s] of draft.steps.entries()) {
          t.insert(steps)
            .values({ id: s.id, recipeId: draft.id, position, text: s.text, timerSeconds: s.timerSeconds })
            .onConflictDoUpdate({ target: steps.id, set: { position, text: s.text, timerSeconds: s.timerSeconds } })
            .run();
        }

        // Photos: the draft is authoritative. Rows not in it are removed along with their files.
        const keepIds = new Set(draft.photos.map((p) => p.id));
        const stepIds = new Set(draft.steps.map((s) => s.id));
        const existing = t.select().from(photos).where(eq(photos.recipeId, draft.id)).all();
        const stale: string[] = [];
        for (const row of existing) {
          if (!keepIds.has(row.id)) {
            stale.push(row.path, row.thumbPath);
            t.delete(photos).where(eq(photos.id, row.id)).run();
          }
        }
        const existingIds = new Set(existing.map((r) => r.id));
        for (const [position, p] of draft.photos.entries()) {
          const stepId = p.stepId && stepIds.has(p.stepId) ? p.stepId : null;
          const imp = imported.get(p.id);
          if (existingIds.has(p.id)) {
            t.update(photos).set({ position, stepId }).where(eq(photos.id, p.id)).run();
          } else if (imp) {
            t.insert(photos)
              .values({ id: p.id, recipeId: draft.id, stepId, position, ...imp, createdAt: ts })
              .run();
          }
        }
        const existingSteps = t.select({ id: steps.id }).from(steps).where(eq(steps.recipeId, draft.id)).all();
        const gone = existingSteps.map((s) => s.id).filter((sid) => !stepIds.has(sid));
        if (gone.length) t.delete(steps).where(inArray(steps.id, gone)).run();

        // Tags
        t.delete(recipeTags).where(eq(recipeTags.recipeId, draft.id)).run();
        const seen = new Set<string>();
        for (const name of draft.tags) {
          const key = tagKey(name);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          let tag = t.select().from(tags).where(eq(tags.nameKey, key)).get();
          if (!tag) {
            tag = { id: newId(), name: name.trim(), nameKey: key, createdAt: ts, updatedAt: ts };
            t.insert(tags).values(tag).run();
          }
          t.insert(recipeTags).values({ recipeId: draft.id, tagId: tag.id }).run();
        }

        indexRecipe(t, draft.id);
        return stale;
      });
    } catch (e) {
      await photoStore.delete([...imported.values()].flatMap((i) => [i.path, i.thumbPath]));
      throw e;
    }

    await photoStore.delete(stalePaths);
    return (await get(draft.id))!;
  }

  async function setFavorite(id: Id, value: boolean): Promise<void> {
    db.update(recipes).set({ isFavorite: value, updatedAt: clock() }).where(eq(recipes.id, id)).run();
  }

  async function softDelete(id: Id): Promise<void> {
    db.transaction((tx) => {
      const t = tx as unknown as AppDb;
      t.update(recipes).set({ deletedAt: clock() }).where(eq(recipes.id, id)).run();
      indexRecipe(t, id);
    });
  }

  async function restore(id: Id): Promise<void> {
    db.transaction((tx) => {
      const t = tx as unknown as AppDb;
      t.update(recipes).set({ deletedAt: null, updatedAt: clock() }).where(eq(recipes.id, id)).run();
      indexRecipe(t, id);
    });
  }

  /** Permanently remove recipes deleted before `olderThanMs`, along with their photo files. */
  async function purgeDeleted(olderThanMs: number): Promise<void> {
    const doomed = db
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(sql`${recipes.deletedAt} IS NOT NULL`, lt(recipes.deletedAt, olderThanMs)))
      .all()
      .map((r) => r.id);
    if (doomed.length === 0) return;
    const files = db.select().from(photos).where(inArray(photos.recipeId, doomed)).all();
    db.delete(recipes).where(inArray(recipes.id, doomed)).run();
    await photoStore.delete(files.flatMap((f) => [f.path, f.thumbPath]));
  }

  async function listTags(): Promise<{ name: string; count: number }[]> {
    return db
      .select({ name: tags.name, count: sql<number>`count(${recipes.id})` })
      .from(tags)
      .innerJoin(recipeTags, eq(recipeTags.tagId, tags.id))
      .innerJoin(recipes, and(eq(recipes.id, recipeTags.recipeId), isNull(recipes.deletedAt)))
      .groupBy(tags.id)
      .orderBy(asc(tags.nameKey))
      .all();
  }

  return { get, list, save, setFavorite, softDelete, restore, purgeDeleted, listTags };
}

export type RecipeRepository = ReturnType<typeof createRecipeRepository>;
