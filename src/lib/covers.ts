import type { ImageMetadata } from 'astro';

const files = {
  ...import.meta.glob<ImageMetadata>('../assets/case-studies/*', { eager: true, import: 'default' }),
  ...import.meta.glob<ImageMetadata>('../assets/projects-generated/*.png', { eager: true, import: 'default' }),
};

const byName = new Map(Object.entries(files).map(([path, image]) => [path.slice(path.lastIndexOf('/') + 1), image]));

/** Cover image by file name: a case-study asset in the repository or a cover downloaded from the API. */
export function projectCover(name: string | undefined): ImageMetadata | undefined {
  return name ? byName.get(name) : undefined;
}
