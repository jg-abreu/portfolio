import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

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

test('builds bilingual static pages from the API and preserves the snapshot on fetch failure', async () => {
  const snapshotPath = 'src/data/project-publications.json';
  const previous = await readFile(snapshotPath, 'utf8');
  const copy = { title: 'Publication integration test', tagline: 'Bilingual static content', problem: 'A problem',
    decisions: 'One decision\nAnother decision', result: 'A result', body: '## Case study\n\n**Saved Markdown**' };
  const project = { projectId: 987654, revision: '12345678-1234-1234-1234-123456789abc',
    slug: 'publication-test-only', repositoryUrl: 'https://github.com/jg-abreu/portfolio-api',
    liveUrl: '', stack: 'Java, Spring Boot', displayOrder: 8, en: copy, pt: { ...copy, title: 'Teste de publicação' } };
  let fail = false;
  const server = createServer((_request, response) => {
    response.writeHead(fail ? 503 : 200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ schemaVersion: 1, projects: [project] }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const env = { ...process.env, PROJECTS_API_URL: `http://127.0.0.1:${address.port}/api/projects` };
  try {
    await run(['scripts/project-publications.ts'], env);
    const selected = await readFile(snapshotPath, 'utf8');
    fail = true;
    await assert.rejects(run(['scripts/project-publications.ts'], env), /503/);
    assert.equal(await readFile(snapshotPath, 'utf8'), selected);
    await run(['node_modules/astro/bin/astro.mjs', 'build']);
    const en = await readFile('dist/en/projects/publication-test-only/index.html', 'utf8');
    const pt = await readFile('dist/pt/projects/publication-test-only/index.html', 'utf8');
    assert.match(en, /Publication integration test/);
    assert.match(en, /<strong>Saved Markdown<\/strong>/);
    assert.match(pt, /Teste de publicação/);
    assert.match(await readFile('dist/en/projects/index.html', 'utf8'), /publication-test-only/);
    const manifest = JSON.parse(await readFile('dist/project-publications.json', 'utf8'));
    assert.deepEqual(manifest.projects, [{ projectId: project.projectId, revision: project.revision }]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await writeFile(snapshotPath, previous, 'utf8');
    await run(['node_modules/astro/bin/astro.mjs', 'build']);
  }
});
