export const recommendationCategories = ['BOOKS', 'COURSES', 'VIDEOS', 'SETUP', 'TOOLS'] as const;

export type RecommendationCategory = typeof recommendationCategories[number];
export type RecommendationCopy = { title: string; description: string; imageAlt: string };
export type RecommendationData = {
  slug: string;
  category: RecommendationCategory;
  imageKey: string;
  googleBooksId?: string;
  url: string;
  displayOrder: number;
  en: RecommendationCopy;
  pt: RecommendationCopy;
};
export type PublicRecommendation = {
  recommendationId: number;
  revision: string;
  draftVersion: number;
  data: RecommendationData;
};
export type RecommendationSnapshot = { schemaVersion: 1; recommendations: PublicRecommendation[] };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, max: number, required = true): value is string {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
}

function parseCopy(value: unknown): RecommendationCopy {
  if (!record(value) || !text(value.title, 150) || !text(value.description, 3000) || !text(value.imageAlt, 200))
    throw new Error('Incomplete recommendation translation');
  return { title: value.title, description: value.description, imageAlt: value.imageAlt };
}

function optionalLink(value: unknown): value is string {
  if (!text(value, 1000, false)) return false;
  if (value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseRecommendationSnapshot(value: unknown): RecommendationSnapshot {
  if (!record(value) || value.schemaVersion !== 1 || !Array.isArray(value.recommendations)
    || value.recommendations.length > 500) throw new Error('Invalid recommendation snapshot');
  const ids = new Set<number>();
  const slugs = new Set<string>();
  const revisions = new Set<string>();
  const recommendations = value.recommendations.map((item: unknown): PublicRecommendation => {
    if (!record(item) || !Number.isSafeInteger(item.recommendationId) || Number(item.recommendationId) <= 0
      || !Number.isSafeInteger(item.draftVersion) || Number(item.draftVersion) < 0
      || !text(item.revision, 36) || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(item.revision)
      || !record(item.data)) throw new Error('Invalid recommendation publication');
    const data = item.data;
    const googleBooksId = data.googleBooksId ?? '';
    if (!text(googleBooksId, 100, false) || (googleBooksId !== '' && !/^[A-Za-z0-9_-]{1,100}$/.test(googleBooksId))
      || !text(data.slug, 100) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)
      || !recommendationCategories.includes(data.category as RecommendationCategory)
      || !text(data.imageKey, 68, false)
      || (googleBooksId ? data.imageKey !== '' || data.category !== 'BOOKS' : !/^[0-9a-f]{64}\.png$/.test(data.imageKey))
      || !optionalLink(data.url) || !Number.isSafeInteger(data.displayOrder) || Number(data.displayOrder) < 0
      || ids.has(Number(item.recommendationId)) || slugs.has(data.slug) || revisions.has(item.revision))
      throw new Error('Invalid or duplicate recommendation');
    const en = parseCopy(data.en);
    const pt = parseCopy(data.pt);
    ids.add(Number(item.recommendationId));
    slugs.add(data.slug);
    revisions.add(item.revision);
    return {
      recommendationId: Number(item.recommendationId), revision: item.revision, draftVersion: Number(item.draftVersion),
      data: { slug: data.slug, category: data.category as RecommendationCategory, imageKey: data.imageKey,
        ...(googleBooksId ? { googleBooksId } : {}), url: data.url, displayOrder: Number(data.displayOrder), en, pt },
    };
  });
  recommendations.sort((a, b) => recommendationCategories.indexOf(a.data.category) - recommendationCategories.indexOf(b.data.category)
    || a.data.displayOrder - b.data.displayOrder || a.data.slug.localeCompare(b.data.slug));
  return { schemaVersion: 1, recommendations };
}
