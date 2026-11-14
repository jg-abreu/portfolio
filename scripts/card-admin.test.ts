import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeCardSettings, isCardSettings, isCardView, moveBlock, parseStack, type CardSettings } from '../src/lib/card-admin.ts';
import { cardAdminUi } from '../src/i18n/card-admin.ts';

const settings: CardSettings = {
  theme: 'DARK', accent: 'BLUE', name: 'João Abreu', role: 'Back-end Developer', monogram: 'JA',
  headline: 'Building back-end systems with Java & Spring Boot.',
  blocks: ['CONTRIBUTIONS', 'LATEST_REPOSITORY', 'STACK', 'EDUCATION', 'FOCUS', 'OPPORTUNITY'],
  stack: ['Java', 'Spring Boot'], educationTitle: 'Computer Science · UVA', educationDetail: 'Rio de Janeiro, Brazil',
  projectTitle: 'Tutoring Management System', projectStack: 'Java · Spring Boot · PostgreSQL', projectNote: 'Personal project',
  focus: 'inHub', opportunity: 'Java back-end internship',
};
const view = { version: 2, draft: settings, published: null, defaults: settings, pending: false, publishedAt: null, updatedAt: '2026-11-14T12:00:00Z' };

test('accepts a well-formed view and settings', () => {
  assert.ok(isCardSettings(settings));
  assert.ok(isCardView(view));
  assert.ok(isCardView({ ...view, published: settings, publishedAt: '2026-11-14T12:00:00Z', pending: true }));
});

test('rejects unknown, duplicated or oversized values', () => {
  assert.equal(isCardSettings({ ...settings, theme: 'NEON' }), false);
  assert.equal(isCardSettings({ ...settings, accent: '#ff0000' }), false);
  assert.equal(isCardSettings({ ...settings, blocks: [] }), false);
  assert.equal(isCardSettings({ ...settings, blocks: ['STACK', 'STACK'] }), false);
  assert.equal(isCardSettings({ ...settings, blocks: ['SCRIPT'] }), false);
  assert.equal(isCardSettings({ ...settings, stack: ['1', '2', '3', '4', '5', '6', '7'] }), false);
  assert.equal(isCardSettings({ ...settings, name: 'x'.repeat(31) }), false);
  assert.equal(isCardSettings({ ...settings, focus: '' }), false);
  assert.equal(isCardView({ ...view, version: -1 }), false);
  assert.equal(isCardView({ ...view, updatedAt: 'yesterday' }), false);
  assert.equal(isCardView([view]), false);
});

test('encodes settings as URL-safe base64 that round-trips Unicode', () => {
  const encoded = encodeCardSettings(settings);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
  assert.deepEqual(decoded, settings);
  assert.ok(encoded.length < 8192);
});

test('moves blocks within bounds only', () => {
  const blocks = settings.blocks;
  assert.deepEqual(moveBlock(blocks, 'STACK', -1).slice(0, 3), ['CONTRIBUTIONS', 'STACK', 'LATEST_REPOSITORY']);
  assert.deepEqual(moveBlock(blocks, 'CONTRIBUTIONS', -1), blocks);
  assert.deepEqual(moveBlock(blocks, 'OPPORTUNITY', 1), blocks);
  assert.notEqual(moveBlock(blocks, 'STACK', 1), blocks);
});

test('parses comma-separated technologies', () => {
  assert.deepEqual(parseStack(' Java, Spring Boot ,, Git '), ['Java', 'Spring Boot', 'Git']);
  assert.deepEqual(parseStack(''), []);
});

test('Portuguese labels cover every English label', () => {
  const keys = (value: object): string[] => Object.entries(value).flatMap(([key, item]) =>
    typeof item === 'object' ? keys(item).map(child => `${key}.${child}`) : [key]);
  assert.deepEqual(keys(cardAdminUi.pt).sort(), keys(cardAdminUi.en).sort());
});
