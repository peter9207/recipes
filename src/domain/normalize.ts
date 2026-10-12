const DESCRIPTORS = new Set(['fresh', 'large', 'small', 'medium', 'ripe', 'organic']);

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(oes|ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('ss') || word.endsWith('us') || word.endsWith('is') || word.endsWith('ses')) return word;
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** Key used to decide whether two ingredient names are the same thing. "Yellow Onions" → "yellow onion". */
export function normalizeName(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[^a-z0-9'à-ÿ-]+/)
    .filter((w) => w && !DESCRIPTORS.has(w));
  if (words.length === 0) return name.trim().toLowerCase();
  words[words.length - 1] = singularize(words[words.length - 1]);
  return words.join(' ');
}
