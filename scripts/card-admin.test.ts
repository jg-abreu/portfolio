import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveSpans, encodeCardSettings, isCardSettings, isCardView, moveItem, nearestWidth, newBlock, parseStack,
  spanFraction, stepWidth, type CardBlock, type CardSettings } from '../src/lib/card-admin.ts';
import { cardAdminUi } from '../src/i18n/card-admin.ts';

const text = (id: string, width: CardBlock['width'], ...lines: string[]): CardBlock => ({ id, kind: 'TEXT', title: id, width,
  lines: lines.map((line, index) => ({ text: line, emphasis: index === 0 ? 'STRONG' : 'NORMAL' })), stack: [] });
const settings: CardSettings = {
  theme: 'DARK', accent: 'BLUE', name: 'João Abreu', role: 'Back-end Developer', monogram: 'JA',
  headline: 'Building back-end systems with Java & Spring Boot.',
  blocks: [
    { id: 'contributions', kind: 'CONTRIBUTIONS', title: 'Contributions · last year', width: 'HALF', lines: [], stack: [] },
    { id: 'stack', kind: 'STACK', title: 'Tech stack', width: 'FULL', lines: [], stack: ['Java', 'Spring Boot'] },
    text('focus', 'HALF', 'inHub'),
  ],
};
const view = { version: 2, draft: settings, published: null, defaults: settings, pending: false, publishedAt: null, updatedAt: '2026-11-14T12:00:00Z' };

test('accepts a well-formed view and settings', () => {
  assert.ok(isCardSettings(settings));
  assert.ok(isCardView(view));
  assert.ok(isCardView({ ...view, published: settings, publishedAt: '2026-11-14T12:00:00Z', pending: true }));
});

test('rejects unknown, duplicated or oversized values', () => {
  const block = settings.blocks[2]!;
  assert.equal(isCardSettings({ ...settings, theme: 'NEON' }), false);
  assert.equal(isCardSettings({ ...settings, accent: '#ff0000' }), false);
  assert.equal(isCardSettings({ ...settings, blocks: [] }), false);
  assert.equal(isCardSettings({ ...settings, blocks: [block, block] }), false);
  assert.equal(isCardSettings({ ...settings, blocks: Array.from({ length: 10 }, (_, i) => text(`b${i}`, 'FULL', 'x')) }), false);
  assert.equal(isCardSettings({ ...settings, blocks: [{ ...block, kind: 'SCRIPT' }] }), false);
  assert.equal(isCardSettings({ ...settings, blocks: [{ ...block, width: 'QUARTER' }] }), false);
  assert.equal(isCardSettings({ ...settings, blocks: [{ ...block, id: 'Bad Id' }] }), false);
  assert.equal(isCardSettings({ ...settings, blocks: [text('a', 'HALF', '1', '2', '3', '4', '5')] }), false);
  assert.equal(isCardSettings({ ...settings, blocks: [{ ...block, lines: [] }] }), false);
  assert.equal(isCardSettings({ ...settings, name: 'x'.repeat(31) }), false);
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
  const largest = { ...settings, blocks: Array.from({ length: 9 }, (_, i) => text(`block-${i}`, 'FULL', ...Array(4).fill('é'.repeat(60)))) };
  assert.ok(encodeCardSettings(largest).length < 16384);
});

test('rows match the API: the last block of an incomplete row stretches', () => {
  assert.deepEqual(effectiveSpans([text('a', 'HALF', 'x'), text('b', 'HALF', 'x')]), [3, 3]);
  assert.deepEqual(effectiveSpans([text('a', 'THIRD', 'x'), text('b', 'THIRD', 'x'), text('c', 'HALF', 'x'), text('d', 'FULL', 'x')]), [2, 4, 6, 6]);
  assert.deepEqual(effectiveSpans([text('a', 'THIRD', 'x'), text('b', 'THIRD', 'x'), text('c', 'THIRD', 'x')]), [2, 2, 2]);
  assert.deepEqual(effectiveSpans([text('a', 'HALF', 'x')]), [6]);
  assert.equal(spanFraction(4), '2/3');
});

test('moves, resizes and snaps within bounds', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 9), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b'], 5, 0), ['a', 'b']);
  assert.equal(stepWidth('FULL', 1), 'FULL');
  assert.equal(stepWidth('HALF', -1), 'THIRD');
  assert.equal(nearestWidth(1.2), 'THIRD');
  assert.equal(nearestWidth(3.4), 'HALF');
  assert.equal(nearestWidth(5.1), 'FULL');
});

test('new blocks get unique ids and kind defaults', () => {
  const added = newBlock('STACK', settings.blocks, 'Tech stack');
  assert.ok(!settings.blocks.some(block => block.id === added.id));
  assert.deepEqual([added.width, added.stack.length > 0, added.lines.length], ['FULL', true, 0]);
  assert.equal(newBlock('TEXT', settings.blocks, 'New block').lines.length, 1);
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
