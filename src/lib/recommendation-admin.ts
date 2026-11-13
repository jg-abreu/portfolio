import { recommendationCategories, type RecommendationData } from './recommendations.ts';

export type RecommendationDraft = { id: number; version: number; status: 'DRAFT' | 'ARCHIVED'; data: RecommendationData; updatedAt: string };
export type RecommendationSummary = { recommendationId: number; revision: string; draftVersion: number };
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.length <= max; }
function integer(value: unknown, minimum = 0): value is number { return Number.isSafeInteger(value) && Number(value) >= minimum; }
export function isRecommendationDraft(value: unknown): value is RecommendationDraft {
  if (!record(value) || !integer(value.id, 1) || !integer(value.version) || !['DRAFT', 'ARCHIVED'].includes(String(value.status))
    || !text(value.updatedAt, 50) || !Number.isFinite(Date.parse(value.updatedAt)) || !record(value.data)) return false;
  const data = value.data;
  return text(data.slug, 100) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)
    && recommendationCategories.includes(data.category as typeof recommendationCategories[number])
    && text(data.imageKey, 68) && /^(?:|[0-9a-f]{64}\.png)$/.test(data.imageKey)
    && text(data.url, 1000) && integer(data.displayOrder)
    && ['en', 'pt'].every(locale => {
      const copy = data[locale];
      return record(copy) && text(copy.title, 150) && text(copy.description, 3000) && text(copy.imageAlt, 200);
    });
}
export function isRecommendationSummary(value: unknown): value is RecommendationSummary {
  return record(value) && integer(value.recommendationId, 1) && integer(value.draftVersion)
    && typeof value.revision === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value.revision);
}
