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

test('reads role, progress, cover and profiles, defaulting older snapshots to a secondary card', () => {
  const legacy = parseProjectSnapshot({ schemaVersion: 1, projects: [project] }).projects[0]!;
  assert.deepEqual([legacy.role, legacy.inProgress, legacy.coverKey, legacy.profiles, legacy.en.coverAlt], ['SECONDARY', false, '', [], '']);
  const key = `${'a'.repeat(64)}.png`;
  const full = parseProjectSnapshot({ schemaVersion: 1, projects: [{ ...project, role: 'FEATURED', inProgress: true, coverKey: key,
    profiles: [{ label: 'LeetCode', url: 'https://leetcode.com/u/example/' }], en: { ...copy, coverAlt: 'Cover' } }] }).projects[0]!;
  assert.deepEqual([full.role, full.inProgress, full.coverKey, full.profiles.length, full.en.coverAlt], ['FEATURED', true, key, 1, 'Cover']);
  const signal = { ...copy, problem: '', decisions: '', result: '' };
  assert.equal(parseProjectSnapshot({ schemaVersion: 1, projects: [{ ...project, role: 'SIGNAL', en: signal, pt: signal }] }).projects[0]!.role, 'SIGNAL');
  for (const invalid of [
    { ...project, role: 'HERO' },
    { ...project, inProgress: 'yes' },
    { ...project, coverKey: '../secret.png' },
    { ...project, profiles: [{ label: 'Site', url: 'http://insecure.example' }] },
    { ...project, profiles: Array.from({ length: 7 }, () => ({ label: 'Site', url: 'https://example.com' })) },
    { ...project, role: 'SECONDARY', en: signal },
  ]) assert.throws(() => parseProjectSnapshot({ schemaVersion: 1, projects: [invalid] }));
});

test('renders Markdown while dropping raw HTML, handlers and unsafe links', () => {
  const html = renderPublicationMarkdown('# Title\n\n**Strong** and [safe](https://example.com).\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n<img src=x onerror=alert(1)>');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>Strong<\/strong>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.doesNotMatch(html, /<script|onerror|javascript:|<img/);
});
