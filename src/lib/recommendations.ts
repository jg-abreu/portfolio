export const sectionKinds = ['BOOKS', 'ITEMS', 'LINK'] as const;
export const bookGroups = ['TECHNICAL', 'NON_TECHNICAL'] as const;
export const readLanguages = ['PT', 'EN'] as const;

export type SectionKind = typeof sectionKinds[number];
export type BookGroup = typeof bookGroups[number];
export type ReadLanguage = typeof readLanguages[number];
export type RecommendationCopy = { title: string; description: string; imageAlt: string };
export type RecommendationData = {
  slug: string;
  sectionId: number;
  imageKey: string;
  googleBooksId?: string;
  url: string;
  rating: number;
  bookGroup: BookGroup | null;
  readIn: ReadLanguage | null;
  subtitle: string;
  en: RecommendationCopy;
  pt: RecommendationCopy;
};
export type PublicRecommendation = { recommendationId: number; revision: string; draftVersion: number; data: RecommendationData };
export type SectionTitle = { title: string; description: string };
export type PublicSection = { id: number; slug: string; kind: SectionKind; url: string; en: SectionTitle; pt: SectionTitle;
  items: PublicRecommendation[] };
export type RecommendationSnapshot = { schemaVersion: 3; sections: PublicSection[] };

export const emptyRecommendations = (): RecommendationSnapshot => ({ schemaVersion: 3, sections: [] });

export function allRecommendations(snapshot: RecommendationSnapshot): PublicRecommendation[] {
  return snapshot.sections.flatMap(section => section.items);
}

export function starFill(rating: number, star: number): 'full' | 'half' | 'empty' {
  return rating >= star ? 'full' : rating >= star - 0.5 ? 'half' : 'empty';
}

export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isAmazon(url: string): boolean {
  return /(^|\.)amazon\.[a-z.]+$|(^|\.)amzn\.(to|eu)$|^a\.co$/.test(linkHost(url));
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, max: number, required = true): value is string {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
}

function positive(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) > 0; }

function parseCopy(value: unknown): RecommendationCopy {
  if (!record(value) || !text(value.title, 150) || !text(value.description, 300) || !text(value.imageAlt, 200, false))
    throw new Error('Incomplete recommendation translation');
  return { title: value.title, description: value.description, imageAlt: value.imageAlt };
}

function parseTitle(value: unknown): SectionTitle {
  const description = record(value) ? value.description ?? '' : '';
  if (!record(value) || !text(value.title, 80) || !text(description, 200, false)) throw new Error('Invalid section title');
  return { title: value.title, description };
}

export function safeLink(value: unknown): value is string {
  if (!text(value, 1000, false)) return false;
  if (value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function parseItem(item: unknown, kind: SectionKind, seen: { ids: Set<number>; slugs: Set<string>; revisions: Set<string> }): PublicRecommendation {
  if (!record(item) || !positive(item.recommendationId) || !Number.isSafeInteger(item.draftVersion) || Number(item.draftVersion) < 0
    || !text(item.revision, 36) || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(item.revision)
    || !record(item.data)) throw new Error('Invalid recommendation publication');
  const data = item.data;
  const googleBooksId = data.googleBooksId ?? '';
  const book = kind === 'BOOKS';
  const rating = Number(data.rating);
  const readIn = data.readIn ?? null;
  const image = text(data.imageKey, 68, false) && /^(?:|[0-9a-f]{64}\.png)$/.test(data.imageKey);
  if (!text(googleBooksId, 100, false) || (googleBooksId !== '' && !/^[A-Za-z0-9_-]{1,100}$/.test(googleBooksId))
    || !text(data.slug, 100) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)
    || !image || (googleBooksId !== '' && (data.imageKey !== '' || !book)) || (book && googleBooksId === '' && data.imageKey === '')
    || !safeLink(data.url) || typeof data.rating !== 'number' || !Number.isFinite(rating) || !text(data.subtitle ?? '', 150, false)
    || (book ? rating < 0.5 || rating > 5 || rating * 2 !== Math.round(rating * 2) || !bookGroups.includes(data.bookGroup as BookGroup)
      || (readIn !== null && !readLanguages.includes(readIn as ReadLanguage))
      : rating !== 0 || (data.bookGroup ?? null) !== null || readIn !== null)
    || seen.ids.has(Number(item.recommendationId)) || seen.slugs.has(data.slug) || seen.revisions.has(item.revision))
    throw new Error('Invalid or duplicate recommendation');
  seen.ids.add(Number(item.recommendationId));
  seen.slugs.add(data.slug);
  seen.revisions.add(item.revision);
  return {
    recommendationId: Number(item.recommendationId), revision: item.revision, draftVersion: Number(item.draftVersion),
    data: { slug: data.slug, sectionId: Number(data.sectionId) || 0, imageKey: data.imageKey as string,
      ...(googleBooksId ? { googleBooksId } : {}), url: data.url, rating,
      bookGroup: book ? data.bookGroup as BookGroup : null, readIn: book ? readIn as ReadLanguage | null : null,
      subtitle: (data.subtitle ?? '') as string, en: parseCopy(data.en), pt: parseCopy(data.pt) },
  };
}

export function parseRecommendationSnapshot(value: unknown): RecommendationSnapshot {
  if (record(value) && value.schemaVersion === 1 && Array.isArray(value.recommendations) && value.recommendations.length === 0)
    return emptyRecommendations();
  if (!record(value) || (value.schemaVersion !== 2 && value.schemaVersion !== 3) || !Array.isArray(value.sections) || value.sections.length > 50)
    throw new Error('Invalid recommendation snapshot');
  const legacy = value.schemaVersion === 2;
  const seen = { ids: new Set<number>(), slugs: new Set<string>(), revisions: new Set<string>() };
  const sectionIds = new Set<number>();
  const sectionSlugs = new Set<string>();
  let total = 0;
  const sections = value.sections.map((section: unknown): PublicSection => {
    if (!record(section) || !positive(section.id) || sectionIds.has(Number(section.id))
      || !sectionKinds.includes(section.kind as SectionKind) || (legacy && section.kind === 'LINK') || !Array.isArray(section.items))
      throw new Error('Invalid recommendation section');
    const kind = section.kind as SectionKind;
    const slug = legacy ? `section-${Number(section.id)}` : section.slug;
    const url = legacy ? '' : section.url ?? '';
    if (!text(slug, 60) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || sectionSlugs.has(slug) || !safeLink(url)
      || (kind === 'LINK' ? url === '' || section.items.length > 0 : url !== '' || section.items.length === 0)
      || (total += section.items.length) > 500) throw new Error('Invalid recommendation section');
    sectionIds.add(Number(section.id));
    sectionSlugs.add(slug);
    return { id: Number(section.id), slug, kind, url, en: parseTitle(section.en), pt: parseTitle(section.pt),
      items: section.items.map(item => parseItem(item, kind, seen)) };
  });
  return { schemaVersion: 3, sections };
}
