import { createRecipeRepository, DraftValidationError } from '@/data/repositories/recipeRepo';
import type { RecipeDraft } from '@/domain';
import { createFakePhotoStore } from '../fakePhotoStore';
import { createTestDb } from '../testDb';

function draft(over: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    id: 'r1', title: 'Tomato Soup', description: 'Warm and simple', servings: 4, prepMinutes: 10, cookMinutes: 20,
    source: 'Grandma', sourceUrl: null, notes: null, isFavorite: false, tags: ['Soup', 'Vegetarian'],
    ingredients: [
      { id: 'i1', groupName: null, quantity: { value: 2, unit: 'cup' }, name: 'tomatoes', note: 'chopped', rawText: null },
      { id: 'i2', groupName: null, quantity: { value: null, unit: null }, name: 'salt', note: null, rawText: null },
    ],
    steps: [{ id: 's1', text: 'Chop', timerSeconds: null }, { id: 's2', text: 'Simmer', timerSeconds: 600 }],
    photos: [],
    ...over,
  };
}

function setup() {
  const db = createTestDb();
  const fake = createFakePhotoStore();
  return { db, fake, repo: createRecipeRepository(db, fake.store) };
}

describe('recipeRepo.save / get', () => {
  it('round-trips the whole aggregate', async () => {
    const { repo } = setup();
    const saved = await repo.save(draft());
    expect(saved).toMatchObject({
      id: 'r1', title: 'Tomato Soup', servings: 4, totalMinutes: 30, source: 'Grandma', isFavorite: false,
    });
    expect(saved.ingredients.map((i) => [i.name, i.quantity])).toEqual([
      ['tomatoes', { value: 2, unit: 'cup' }], ['salt', { value: null, unit: null }],
    ]);
    expect(saved.steps.map((s) => s.text)).toEqual(['Chop', 'Simmer']);
    expect(saved.tags).toEqual(['Soup', 'Vegetarian']);
    expect(await repo.get('missing')).toBeNull();
  });

  it('rejects invalid drafts without writing', async () => {
    const { repo } = setup();
    await expect(repo.save(draft({ title: ' ' }))).rejects.toBeInstanceOf(DraftValidationError);
    expect(await repo.list()).toEqual([]);
  });

  it('updates in place, preserving createdAt and reordering children', async () => {
    const { repo } = setup();
    const first = await repo.save(draft());
    const second = await repo.save(draft({
      title: 'Better Soup', tags: ['soup'],
      ingredients: [draft().ingredients[1], draft().ingredients[0]],
      steps: [{ id: 's2', text: 'Simmer', timerSeconds: 600 }],
    }));
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.title).toBe('Better Soup');
    expect(second.ingredients.map((i) => i.id)).toEqual(['i2', 'i1']);
    expect(second.steps.map((s) => s.id)).toEqual(['s2']);
    expect(second.tags).toEqual(['Soup']); // tag identity is case-insensitive; first spelling wins
  });

  it('stores ranges', async () => {
    const { repo } = setup();
    const saved = await repo.save(draft({
      ingredients: [{ id: 'i1', groupName: 'Sauce', quantity: { value: 2, max: 3, unit: 'clove' }, name: 'garlic', note: null, rawText: '2-3 cloves garlic' }],
    }));
    expect(saved.ingredients[0]).toMatchObject({ groupName: 'Sauce', quantity: { value: 2, max: 3, unit: 'clove' } });
  });
});

describe('photos', () => {
  it('imports new photos and the first recipe-level photo is the cover', async () => {
    const { repo, fake } = setup();
    const saved = await repo.save(draft({
      photos: [
        { id: 'p1', stepId: 's1', sourceUri: 'file:///step.jpg' },
        { id: 'p2', stepId: null, sourceUri: 'file:///cover.jpg' },
      ],
    }));
    expect(saved.photos.map((p) => [p.id, p.stepId])).toEqual([['p1', 's1'], ['p2', null]]);
    expect(fake.files.has('photos/p2.jpg')).toBe(true);
    const [summary] = await repo.list();
    expect(summary.coverThumbUri).toBe('file:///docs/photos/p2.thumb.jpg');
  });

  it('removes files for photos dropped from the draft, and keeps existing ones', async () => {
    const { repo, fake } = setup();
    await repo.save(draft({ photos: [{ id: 'p1', stepId: null, sourceUri: 'a' }, { id: 'p2', stepId: null, sourceUri: 'b' }] }));
    const saved = await repo.save(draft({ photos: [{ id: 'p2', stepId: null }] }));
    expect(saved.photos.map((p) => p.id)).toEqual(['p2']);
    expect([...fake.files].sort()).toEqual(['photos/p2.jpg', 'photos/p2.thumb.jpg']);
  });

  it('detaches photos from removed steps instead of deleting them', async () => {
    const { repo } = setup();
    await repo.save(draft({ photos: [{ id: 'p1', stepId: 's1', sourceUri: 'a' }] }));
    const saved = await repo.save(draft({ steps: [{ id: 's2', text: 'Simmer', timerSeconds: null }], photos: [{ id: 'p1', stepId: 's1' }] }));
    expect(saved.photos).toHaveLength(1);
    expect(saved.photos[0].stepId).toBeNull();
  });

  it('cleans up imported files and writes nothing if an import fails', async () => {
    const { repo, fake } = setup();
    await expect(repo.save(draft({
      photos: [{ id: 'p1', stepId: null, sourceUri: 'good' }, { id: 'p2', stepId: null, sourceUri: 'broken' }],
    }))).rejects.toThrow('cannot read image');
    expect(fake.files.size).toBe(0);
    expect(await repo.get('r1')).toBeNull();
  });
});

describe('list / search / filters', () => {
  async function seed() {
    const s = setup();
    await s.repo.save(draft());
    await s.repo.save(draft({
      id: 'r2', title: 'Chocolate Chip Cookies', description: null, tags: ['Dessert', 'Baking'], isFavorite: true,
      ingredients: [{ id: 'j1', groupName: null, quantity: { value: 1, unit: 'cup' }, name: 'chocolate chips', note: null, rawText: null }],
      steps: [],
    }));
    await s.repo.save(draft({
      id: 'r3', title: 'apple pie', description: null, tags: ['Dessert'], prepMinutes: null, cookMinutes: null,
      ingredients: [{ id: 'k1', groupName: null, quantity: { value: 3, unit: null }, name: 'apples', note: null, rawText: null }],
    }));
    return s;
  }

  it('sorts by title case-insensitively by default', async () => {
    const { repo } = await seed();
    expect((await repo.list()).map((r) => r.title)).toEqual(['apple pie', 'Chocolate Chip Cookies', 'Tomato Soup']);
  });

  it('searches titles, ingredients, descriptions and tags with prefixes', async () => {
    const { repo } = await seed();
    const titles = async (q: string) => (await repo.list({ search: q })).map((r) => r.title);
    expect(await titles('choc')).toEqual(['Chocolate Chip Cookies']);
    expect(await titles('tomatoes')).toEqual(['Tomato Soup']);
    expect(await titles('warm')).toEqual(['Tomato Soup']);
    expect(await titles('baking')).toEqual(['Chocolate Chip Cookies']);
    expect(await titles('chip cook')).toEqual(['Chocolate Chip Cookies']);
    expect(await titles('zzz')).toEqual([]);
  });

  it('is safe against FTS syntax in the query', async () => {
    const { repo } = await seed();
    await expect(repo.list({ search: '"choc* OR (' })).resolves.toBeDefined();
    expect(await repo.list({ search: '   ' })).toHaveLength(3);
  });

  it('filters by tags (all must match) and favorites', async () => {
    const { repo } = await seed();
    expect((await repo.list({ tags: ['dessert'] })).map((r) => r.id).sort()).toEqual(['r2', 'r3']);
    expect((await repo.list({ tags: ['Dessert', 'baking'] })).map((r) => r.id)).toEqual(['r2']);
    expect(await repo.list({ tags: ['nope'] })).toEqual([]);
    expect((await repo.list({ favoritesOnly: true })).map((r) => r.id)).toEqual(['r2']);
  });

  it('lists tags with counts', async () => {
    const { repo } = await seed();
    expect(await repo.listTags()).toEqual([
      { name: 'Baking', count: 1 }, { name: 'Dessert', count: 2 }, { name: 'Soup', count: 1 }, { name: 'Vegetarian', count: 1 },
    ]);
  });

  it('reports totalMinutes null when no times are set', async () => {
    const { repo } = await seed();
    expect((await repo.list({ search: 'apple' }))[0].totalMinutes).toBeNull();
  });
});

describe('delete / restore / purge', () => {
  it('soft delete hides from get, list and search; restore brings it back', async () => {
    const { repo } = setup();
    await repo.save(draft());
    await repo.softDelete('r1');
    expect(await repo.get('r1')).toBeNull();
    expect(await repo.list()).toEqual([]);
    expect(await repo.list({ search: 'tomato' })).toEqual([]);
    expect(await repo.listTags()).toEqual([]);
    await repo.restore('r1');
    expect((await repo.list({ search: 'tomato' })).map((r) => r.id)).toEqual(['r1']);
  });

  it('purge removes old deleted recipes and their photo files', async () => {
    const { repo, fake } = setup();
    await repo.save(draft({ photos: [{ id: 'p1', stepId: null, sourceUri: 'a' }] }));
    await repo.softDelete('r1');
    await repo.purgeDeleted(0);
    expect(fake.files.size).toBe(1 * 2);
    await repo.purgeDeleted(Date.now() + 1000);
    expect(fake.files.size).toBe(0);
  });

  it('saving a soft-deleted id revives it', async () => {
    const { repo } = setup();
    await repo.save(draft());
    await repo.softDelete('r1');
    await repo.save(draft());
    expect(await repo.get('r1')).not.toBeNull();
  });

  it('toggles favorite', async () => {
    const { repo } = setup();
    await repo.save(draft());
    await repo.setFavorite('r1', true);
    expect((await repo.get('r1'))!.isFavorite).toBe(true);
  });
});
