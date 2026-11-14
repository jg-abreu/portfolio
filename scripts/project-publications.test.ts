import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProjectSnapshot } from '../src/lib/project-publications.ts';
import { renderPublicationMarkdown } from '../src/lib/publication-markdown.ts';

const copy = { title: 'Example', tagline: 'Description', problem: 'Problem', decisions: 'Decision', result: 'Result', body: '' };
const project = { projectId: 1, revision: '12345678-1234-1234-1234-123456789abc', slug: 'example',
  repositoryUrl: 'https://github.com/jg-abreu/example', liveUrl: '', stack: 'Java', displayOrder: 0, en: copy, pt: copy };

test('validates both languages, URLs and unique identities before building', () => {
  assert.equal(parseProjectSnapshot({ schemaVersion: 1, projects: [project] }).projects.length, 1);
  for (const invalid of [
    { ...project, repositoryUrl: 'javascript:alert(1)' },
    { ...project, slug: '../admin' },
    { ...project, liveUrl: 'https://user:password@example.com' },
    { ...project, pt: { ...copy, result: '' } },
    { ...project, displayOrder: -1 },
  ]) assert.throws(() => parseProjectSnapshot({ schemaVersion: 1, projects: [invalid] }));
  assert.throws(() => parseProjectSnapshot({ schemaVersion: 1, projects: [project, project] }));
  const cleaned = parseProjectSnapshot({ schemaVersion: 1, projects: [{ ...project,
    en: { ...copy, repoUrl: 'javascript:alert(1)', role: 'signal' } }] });
  assert.equal('repoUrl' in cleaned.projects[0]!.en, false);
  assert.equal('role' in cleaned.projects[0]!.en, false);
});

test('renders Markdown while dropping raw HTML, handlers and unsafe links', () => {
  const html = renderPublicationMarkdown('# Title\n\n**Strong** and [safe](https://example.com).\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n<img src=x onerror=alert(1)>');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>Strong<\/strong>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.doesNotMatch(html, /<script|onerror|javascript:|<img/);
});
