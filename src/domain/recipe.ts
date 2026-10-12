import type { RecipeDraft } from './types';

export function totalMinutes(prep: number | null, cook: number | null): number | null {
  if (prep === null && cook === null) return null;
  return (prep ?? 0) + (cook ?? 0);
}

/** Returns human-readable problems; an empty array means the draft can be saved. */
export function validateDraft(draft: RecipeDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push('Title is required');
  if (!(draft.servings > 0)) errors.push('Servings must be greater than 0');
  for (const m of [draft.prepMinutes, draft.cookMinutes]) {
    if (m !== null && (!Number.isFinite(m) || m < 0)) errors.push('Times cannot be negative');
  }
  if (draft.ingredients.some((i) => !i.name.trim())) errors.push('Every ingredient needs a name');
  if (draft.steps.some((s) => !s.text.trim())) errors.push('Steps cannot be empty');
  return [...new Set(errors)];
}
