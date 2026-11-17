import { bookGroups, readLanguages, sectionKinds, type BookGroup, type ReadLanguage, type RecommendationData, type SectionKind,
  type SectionTitle } from './recommendations.ts';

export type RecommendationDraft = { id: number; version: number; status: 'DRAFT' | 'ARCHIVED'; displayOrder: number;
  data: RecommendationData; updatedAt: string };
export type RecommendationSummary = { recommendationId: number; revision: string; draftVersion: number };
export type RecommendationSection = { id: number; version: number; displayOrder: number; items: number;
  data: { kind: SectionKind; en: SectionTitle; pt: SectionTitle; slug: string; url: string } };

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.length <= max; }
function integer(value: unknown, minimum = 0): value is number { return Number.isSafeInteger(value) && Number(value) >= minimum; }

export function isRecommendationDraft(value: unknown): value is RecommendationDraft {
  if (!record(value) || !integer(value.id, 1) || !integer(value.version) || !integer(value.displayOrder)
    || !['DRAFT', 'ARCHIVED'].includes(String(value.status))
    || !text(value.updatedAt, 50) || !Number.isFinite(Date.parse(value.updatedAt)) || !record(value.data)) return false;
  const data = value.data;
  return text(data.slug, 100) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug) && integer(data.sectionId, 1)
    && text(data.imageKey, 68) && /^(?:|[0-9a-f]{64}\.png)$/.test(data.imageKey)
    && (data.googleBooksId == null || (text(data.googleBooksId, 100) && /^(?:|[A-Za-z0-9_-]{1,100})$/.test(data.googleBooksId)))
    && text(data.url, 1000) && typeof data.rating === 'number' && data.rating >= 0 && data.rating <= 5
    && data.rating * 2 === Math.round(data.rating * 2) && text(data.subtitle, 150)
    && (data.bookGroup === null || bookGroups.includes(data.bookGroup as BookGroup))
    && (data.readIn == null || readLanguages.includes(data.readIn as ReadLanguage))
    && ['en', 'pt'].every(locale => {
      const copy = data[locale];
      return record(copy) && text(copy.title, 150) && text(copy.description, 300) && text(copy.imageAlt, 200);
    });
}

export function isRecommendationSection(value: unknown): value is RecommendationSection {
  if (!record(value) || !integer(value.id, 1) || !integer(value.version) || !integer(value.displayOrder) || !integer(value.items)
    || !record(value.data)) return false;
  const data = value.data;
  return sectionKinds.includes(data.kind as SectionKind) && text(data.slug, 60) && text(data.url, 1000)
    && ['en', 'pt'].every(locale => {
      const copy = data[locale];
      return record(copy) && text(copy.title, 80) && text(copy.description ?? '', 200);
    });
}

export function isRecommendationSummary(value: unknown): value is RecommendationSummary {
  return record(value) && integer(value.recommendationId, 1) && integer(value.draftVersion)
    && typeof value.revision === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value.revision);
}

export function reorder(ids: readonly number[], id: number, to: number): number[] {
  const next = ids.filter(value => value !== id);
  if (next.length === ids.length) return [...ids];
  next.splice(Math.max(0, Math.min(next.length, to)), 0, id);
  return next;
}
