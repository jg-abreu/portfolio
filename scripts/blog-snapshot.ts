import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { ArticleRemoved, parseBlogSnapshot, syncBlog } from '../src/lib/blog.ts';
import { DEVTO_USER, validSnapshot } from '../src/lib/github-data.ts';

const destination = new URL('../src/data/blog-snapshot.json', import.meta.url);
const temporary = new URL('../src/data/blog-snapshot.json.tmp', import.meta.url);
const source = new URL('../src/data/github-snapshot.json', import.meta.url);
let previous = { schemaVersion: 1 as const, articles: [] as import('../src/lib/blog.ts').BlogArticle[] };
if (existsSync(destination)) {
  try { previous = parseBlogSnapshot(JSON.parse(readFileSync(destination, 'utf8'))) ?? previous; }
  catch { console.warn('[blog-snapshot] Invalid previous snapshot; starting without cached articles'); }
}
const metadata = existsSync(source) ? validSnapshot(JSON.parse(readFileSync(source, 'utf8')))?.articles ?? null : null;
if (metadata === null && previous.articles.length === 0)
  throw new Error('No verified article list or cached blog; keep the current release');
const budget = AbortSignal.timeout(45_000);
const snapshot = await syncBlog(metadata, previous, async slug => {
  budget.throwIfAborted();
  const response = await fetch(`https://dev.to/api/articles/${DEVTO_USER}/${slug}`, {
    headers: { Accept: 'application/vnd.forem.api-v1+json', 'User-Agent': 'jg-abreu-portfolio-build' },
    signal: AbortSignal.any([budget, AbortSignal.timeout(10_000)]), redirect: 'error',
  });
  if (response.status === 404 || response.status === 410) throw new ArticleRemoved();
  if (!response.ok) throw new Error(`DEV answered ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty DEV response');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2_000_000) throw new Error('DEV response too large');
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
});
if (snapshot.articles.some(article => article.bodyMarkdown === null))
  throw new Error('An article has no readable body or cached copy; keep the current release');
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
await rename(temporary, destination);
console.log(`[blog-snapshot] ${snapshot.articles.length} articles; ${snapshot.articles.filter(item => item.bodyMarkdown !== null).length} readable locally`);
