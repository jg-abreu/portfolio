import { DEVTO_USER, isCount, isDate, validArticle, type Article } from './github-data.ts';

export type BlogArticle = Article & { slug: string; bodyMarkdown: string | null };
export type BlogSnapshot = { schemaVersion: 1; articles: BlogArticle[] };

export function articleSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'dev.to' || url.port || url.username || url.password
      || url.search || url.hash) return null;
    const match = url.pathname.match(new RegExp(`^/${DEVTO_USER}/([a-z0-9]+(?:-[a-z0-9]+)*)/?$`));
    return match && match[1]!.length <= 200 ? match[1]! : null;
  } catch {
    return null;
  }
}

export function parseBlogSnapshot(value: unknown): BlogSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== 1 || !Array.isArray(source.articles) || source.articles.length > 100) return null;
  const articles: BlogArticle[] = [];
  const slugs = new Set<string>();
  for (const item of source.articles) {
    const article = validArticle(item);
    const slug = articleSlug(article?.url);
    if (!article || !slug || !item || typeof item !== 'object' || slugs.has(slug)) return null;
    const body = (item as Record<string, unknown>).bodyMarkdown;
    if (body !== null && (typeof body !== 'string' || !body.trim() || body.length > 200_000)) return null;
    slugs.add(slug);
    articles.push({ ...article, slug, bodyMarkdown: body as string | null });
  }
  return { schemaVersion: 1, articles: articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) };
}

export function articleBody(value: unknown, expected: Article): string | null {
  if (!value || typeof value !== 'object') return null;
  const detail = value as Record<string, unknown>;
  const user = detail.user as Record<string, unknown> | undefined;
  const slug = articleSlug(expected.url);
  if (!slug || articleSlug(detail.url) !== slug || user?.username !== DEVTO_USER
    || typeof detail.published_at !== 'string' || Number.isNaN(Date.parse(detail.published_at))
    || typeof detail.body_markdown !== 'string' || !detail.body_markdown.trim()
    || detail.body_markdown.length > 200_000) return null;
  return detail.body_markdown;
}

export async function syncBlog(articles: Article[] | null, previous: BlogSnapshot,
  fetchDetail: (slug: string) => Promise<unknown>): Promise<BlogSnapshot> {
  if (articles === null) return previous;
  const result: BlogArticle[] = [];
  for (let offset = 0; offset < Math.min(articles.length, 100); offset += 4) {
    const batch = await Promise.all(articles.slice(offset, offset + 4).map(async article => {
      const slug = articleSlug(article.url);
      if (!slug || !isDate(article.publishedAt) || !isCount(article.readingMinutes)) return null;
      try {
        const bodyMarkdown = articleBody(await fetchDetail(slug), article);
        if (bodyMarkdown === null) throw new Error('Invalid article body');
        return { ...article, slug, bodyMarkdown };
      } catch (error) {
        if (error instanceof ArticleRemoved) return null;
        return previous.articles.find(item => item.slug === slug) ?? { ...article, slug, bodyMarkdown: null };
      }
    }));
    for (const article of batch) if (article && !result.some(item => item.slug === article.slug)) result.push(article);
  }
  return { schemaVersion: 1, articles: result };
}

export class ArticleRemoved extends Error {}
