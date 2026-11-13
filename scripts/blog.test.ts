import assert from 'node:assert/strict';
import test from 'node:test';
import { articleBody, articleSlug, ArticleRemoved, parseBlogSnapshot, syncBlog, type BlogSnapshot } from '../src/lib/blog.ts';
import { renderArticleMarkdown, renderPublicationMarkdown } from '../src/lib/publication-markdown.ts';

const article = { title: 'A public article', url: 'https://dev.to/joao_abreu/example-post-123', description: 'Description',
  image: null, publishedAt: '2026-11-13', tags: ['java'], readingMinutes: 3 };
const cached: BlogSnapshot = { schemaVersion: 1, articles: [{ ...article, slug: 'example-post-123', bodyMarkdown: '# Cached body' }] };
const detail = { url: article.url, user: { username: 'joao_abreu' }, published_at: '2026-11-13T09:00:00Z', body_markdown: '# Fresh body' };

test('blog routes accept only the configured author and bounded DEV slugs', () => {
  assert.equal(articleSlug(article.url), 'example-post-123');
  for (const url of ['https://dev.to/other/example', 'https://dev.to.evil.test/joao_abreu/example',
    'http://dev.to/joao_abreu/example', 'https://user:secret@dev.to/joao_abreu/example',
    'https://dev.to/joao_abreu/../admin', 'https://dev.to/joao_abreu/example?next=admin',
    'https://dev.to/joao_abreu/%2fadmin', 'https://dev.to:444/joao_abreu/example']) assert.equal(articleSlug(url), null);
  assert.equal(parseBlogSnapshot(cached)?.articles[0]?.bodyMarkdown, '# Cached body');
  assert.equal(parseBlogSnapshot({ ...cached, articles: [...cached.articles, ...cached.articles] }), null);
  assert.equal(parseBlogSnapshot({ ...cached, articles: [{ ...cached.articles[0], bodyMarkdown: 'x'.repeat(200_001) }] }), null);
});

test('article bodies must belong to the requested published article and author', () => {
  assert.equal(articleBody(detail, article), '# Fresh body');
  for (const invalid of [{ ...detail, user: { username: 'other' } }, { ...detail, url: 'https://dev.to/joao_abreu/other' },
    { ...detail, published_at: null }, { ...detail, body_markdown: '' }]) assert.equal(articleBody(invalid, article), null);
});

test('blog synchronization refreshes bodies and keeps complete cached copies during outages', async () => {
  const fresh = await syncBlog([article], cached, async slug => {
    assert.equal(slug, 'example-post-123');
    return detail;
  });
  assert.equal(fresh.articles[0]?.bodyMarkdown, '# Fresh body');
  const offline = await syncBlog([{ ...article, title: 'An unavailable edit' }], cached, async () => { throw new Error('offline'); });
  assert.deepEqual(offline, cached);
  assert.deepEqual(await syncBlog(null, cached, async () => { throw new Error('must not fetch'); }), cached);
  assert.deepEqual((await syncBlog([], cached, async () => detail)).articles, []);
  assert.deepEqual((await syncBlog([article], cached, async () => { throw new ArticleRemoved(); })).articles, []);
  const firstFailure = await syncBlog([article], { schemaVersion: 1, articles: [] }, async () => ({}));
  assert.equal(firstFailure.articles[0]?.bodyMarkdown, null);
});

test('article Markdown keeps safe content and images without executing embeds or raw HTML', () => {
  const html = renderArticleMarkdown('# Heading\n\n**Strong** [safe](https://example.com).\n\n![Diagram](https://dev-to-uploads.s3.amazonaws.com/uploads/example.png)\n\n![Unsafe](https://evil.test/tracker.png)\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n<img src=x onerror=alert(1)>');
  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<strong>Strong<\/strong>/);
  assert.match(html, /src="https:\/\/media2.dev.to\/dynamic\/image\//);
  assert.match(html, /referrerpolicy="no-referrer"/);
  assert.doesNotMatch(html, /src="https:\/\/evil|<script|onerror|javascript:|<iframe/);
  assert.match(renderArticleMarkdown('![Own diagram](https://raw.githubusercontent.com/jg-abreu/project/main/image.png)'), /<img src="https:\/\/media2.dev.to/);
  assert.doesNotMatch(renderArticleMarkdown('![Other diagram](https://raw.githubusercontent.com/other/project/main/image.png)'), /<img/);
  assert.doesNotMatch(renderPublicationMarkdown('![Image](https://dev-to-uploads.s3.amazonaws.com/image.png)'), /<img/);
});
