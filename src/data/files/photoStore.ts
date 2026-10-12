import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface ImportedPhoto {
  /** Relative to the document directory, e.g. "photos/<id>.jpg". Safe to store in the database. */
  path: string;
  thumbPath: string;
  width: number;
  height: number;
}

export interface PhotoStore {
  /** Resize + compress a picked image into app storage and make a thumbnail. */
  importFromUri(sourceUri: string, photoId: string): Promise<ImportedPhoto>;
  /** Delete files by relative path. Missing files are ignored. */
  delete(paths: string[]): Promise<void>;
  /** Relative path → absolute file URI for display. */
  resolve(relativePath: string): string;
}

const DIR = 'photos';
const MAX_EDGE = 2048;
const THUMB_EDGE = 400;

function photosDir(): Directory {
  const dir = new Directory(Paths.document, DIR);
  dir.create({ idempotent: true, intermediates: true });
  return dir;
}

async function render(sourceUri: string, longEdge: number, quality: number, dest: File) {
  const probe = await ImageManipulator.manipulate(sourceUri).renderAsync();
  const landscape = probe.width >= probe.height;
  const longest = Math.max(probe.width, probe.height);
  const ctx = ImageManipulator.manipulate(sourceUri);
  if (longest > longEdge) ctx.resize(landscape ? { width: longEdge } : { height: longEdge });
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  new File(saved.uri).copy(dest);
  new File(saved.uri).delete();
  return { width: saved.width, height: saved.height };
}

export const expoPhotoStore: PhotoStore = {
  async importFromUri(sourceUri, photoId) {
    const dir = photosDir();
    const full = new File(dir, `${photoId}.jpg`);
    const thumb = new File(dir, `${photoId}.thumb.jpg`);
    try {
      const size = await render(sourceUri, MAX_EDGE, 0.8, full);
      await render(sourceUri, THUMB_EDGE, 0.7, thumb);
      return { path: `${DIR}/${photoId}.jpg`, thumbPath: `${DIR}/${photoId}.thumb.jpg`, ...size };
    } catch (e) {
      for (const f of [full, thumb]) if (f.exists) f.delete();
      throw e;
    }
  },

  async delete(paths) {
    for (const p of paths) {
      const file = new File(Paths.document, p);
      if (file.exists) file.delete();
    }
  },

  resolve(relativePath) {
    return new File(Paths.document, relativePath).uri;
  },
};
