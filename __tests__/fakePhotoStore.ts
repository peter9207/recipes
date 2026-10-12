import type { PhotoStore } from '@/data/files/photoStore';

/** In-memory PhotoStore recording what was imported/deleted. */
export function createFakePhotoStore() {
  const files = new Set<string>();
  const store: PhotoStore = {
    async importFromUri(sourceUri, photoId) {
      if (sourceUri.includes('broken')) throw new Error('cannot read image');
      const path = `photos/${photoId}.jpg`;
      const thumbPath = `photos/${photoId}.thumb.jpg`;
      files.add(path);
      files.add(thumbPath);
      return { path, thumbPath, width: 800, height: 600 };
    },
    async delete(paths) {
      for (const p of paths) files.delete(p);
    },
    resolve: (p) => `file:///docs/${p}`,
  };
  return { store, files };
}
