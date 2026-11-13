import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

function run(args: string[], env = process.env) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', value => { output += value; });
    child.stderr.on('data', value => { output += value; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(output)));
  });
}

test('builds bilingual project and blog pages and preserves selected copies on fetch failure', async () => {
  const snapshotPath = 'src/data/project-publications.json';
  const previous = await readFile(snapshotPath, 'utf8');
  const blogPath = 'src/data/blog-snapshot.json';
  const previousBlog = await readFile(blogPath, 'utf8').catch(() => '{"schemaVersion":1,"articles":[]}');
  const recommendationPath = 'src/data/recommendations.json';
  const previousRecommendations = await readFile(recommendationPath, 'utf8').catch(() => '{"schemaVersion":1,"recommendations":[]}');
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=', 'base64');
  const imageKey = `${createHash('sha256').update(image).digest('hex')}.png`;
  const recommendation = { recommendationId: 987654, revision: '12345678-1234-1234-1234-123456789abc', draftVersion: 2,
    data: { slug: 'synthetic-book', category: 'BOOKS', imageKey, url: 'https://example.com/book', displayOrder: 0,
      en: { title: 'Synthetic recommendation', description: '<script>unsafe()</script>', imageAlt: 'Synthetic cover' },
      pt: { title: 'Recomendação de teste', description: 'Somente teste.', imageAlt: 'Capa de teste' } } };
  const article = { title: 'Local article integration test', url: 'https://dev.to/joao_abreu/local-article-test',
    description: 'An article without a runtime DEV request', image: null, publishedAt: '2026-11-13',
    tags: ['java'], readingMinutes: 2, slug: 'local-article-test', bodyMarkdown: '## Full article\n\n**Local Markdown body**' };
  const copy = { title: 'Publication integration test', tagline: 'Bilingual static content', problem: 'A problem',
    decisions: 'One decision\nAnother decision', result: 'A result', body: '## Case study\n\n**Saved Markdown**' };
  const project = { projectId: 987654, revision: '12345678-1234-1234-1234-123456789abc',
    slug: 'publication-test-only', repositoryUrl: 'https://github.com/jg-abreu/portfolio-api',
    liveUrl: '', stack: 'Java, Spring Boot', displayOrder: 8, en: copy, pt: { ...copy, title: 'Teste de publicação' } };
  let fail = false;
  const server = createServer((request, response) => {
    if (request.url?.startsWith('/api/recommendation-images/')) {
      response.writeHead(fail ? 503 : 200, { 'Content-Type': 'image/png' });
      response.end(image);
      return;
    }
    response.writeHead(fail ? 503 : 200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(request.url === '/api/recommendations'
      ? { schemaVersion: 1, recommendations: [recommendation] } : { schemaVersion: 1, projects: [project] }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const env = { ...process.env, PROJECTS_API_URL: `http://127.0.0.1:${address.port}/api/projects`,
    RECOMMENDATIONS_API_URL: `http://127.0.0.1:${address.port}/api/recommendations` };
  try {
    await writeFile(blogPath, JSON.stringify({ schemaVersion: 1, articles: [article] }), 'utf8');
    await run(['scripts/project-publications.ts'], env);
    await run(['scripts/recommendations-snapshot.ts'], env);
    const selectedRecommendations = await readFile(recommendationPath, 'utf8');
    const selected = await readFile(snapshotPath, 'utf8');
    fail = true;
    await assert.rejects(run(['scripts/project-publications.ts'], env), /503/);
    assert.equal(await readFile(snapshotPath, 'utf8'), selected);
    await assert.rejects(run(['scripts/recommendations-snapshot.ts'], env), /503/);
    assert.equal(await readFile(recommendationPath, 'utf8'), selectedRecommendations);
    await run(['node_modules/astro/bin/astro.mjs', 'build'], { ...process.env, PUBLIC_VISITS_ENABLED: 'true' });
    const en = await readFile('dist/en/projects/publication-test-only/index.html', 'utf8');
    const pt = await readFile('dist/pt/projects/publication-test-only/index.html', 'utf8');
    assert.match(en, /Publication integration test/);
    assert.match(en, /<strong>Saved Markdown<\/strong>/);
    assert.match(pt, /Teste de publicação/);
    for (const locale of ['en', 'pt']) {
      const picks = await readFile(`dist/${locale}/recommendations/index.html`, 'utf8');
      assert.match(picks, new RegExp(recommendation.data[locale as 'en' | 'pt'].title));
      assert.match(picks, /\/_astro\/[^" ]+\.webp/);
      assert.doesNotMatch(picks, /<script>unsafe\(\)<\/script>/);
      assert.doesNotMatch(picks, /<iframe/);
      const blog = await readFile(`dist/${locale}/blog/local-article-test/index.html`, 'utf8');
      assert.match(blog, /<strong>Local Markdown body<\/strong>/);
      assert.match(blog, /data-visits(?:\s|=|>)/);
      assert.match(blog, new RegExp(`/${locale}/blog/`));
      assert.match(await readFile(`dist/${locale}/blog/index.html`, 'utf8'), new RegExp(`/${locale}/blog/local-article-test/`));
    }
    assert.doesNotMatch(await readFile('dist/404.html', 'utf8'), /data-visits(?:\s|=|>)/);
    assert.doesNotMatch(await readFile('dist/en/admin/index.html', 'utf8'), /data-visits(?:\s|=|>)/);
    assert.match(await readFile('dist/en/projects/index.html', 'utf8'), /publication-test-only/);
    const manifest = JSON.parse(await readFile('dist/project-publications.json', 'utf8'));
    assert.deepEqual(manifest.projects, [{ projectId: project.projectId, revision: project.revision }]);
    const recommendationsManifest = JSON.parse(await readFile('dist/recommendation-publications.json', 'utf8'));
    assert.deepEqual(recommendationsManifest.recommendations, [{ recommendationId: recommendation.recommendationId,
      revision: recommendation.revision, draftVersion: recommendation.draftVersion }]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await writeFile(snapshotPath, previous, 'utf8');
    await writeFile(blogPath, previousBlog, 'utf8');
    await writeFile(recommendationPath, previousRecommendations, 'utf8');
    await run(['node_modules/astro/bin/astro.mjs', 'build']);
  }
});
