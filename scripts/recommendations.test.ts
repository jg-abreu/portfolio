import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { fetchRecommendationImage, fetchRecommendations, recommendationSource } from './recommendation-source.ts';
import { parseRecommendationSnapshot } from '../src/lib/recommendations.ts';

const item = () => ({ recommendationId: 1, revision: '12345678-1234-1234-1234-123456789abc', draftVersion: 0,
  data: { slug: 'synthetic-book', category: 'BOOKS', imageKey: `${'a'.repeat(64)}.png`, url: '', displayOrder: 0,
    en: { title: 'Synthetic book', description: 'Test fixture only.', imageAlt: 'Test cover' },
    pt: { title: 'Livro sintético', description: 'Somente teste.', imageAlt: 'Capa de teste' } } });
const parse = (value: unknown) => parseRecommendationSnapshot({ schemaVersion: 1, recommendations: [value] });

test('recommendations accept an empty catalogue and strip unrecognized publication data', () => {
  assert.deepEqual(parseRecommendationSnapshot({ schemaVersion: 1, recommendations: [] }).recommendations, []);
  const value = { ...item(), privateEmail: 'private@example.com' };
  assert.equal('privateEmail' in parse(value).recommendations[0], false);
  assert.equal(parse(value).recommendations[0].data.pt.title, 'Livro sintético');
});

test('recommendations reject unsafe links, image paths and incomplete translations', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com']) {
    const value = item(); value.data.url = url;
    assert.throws(() => parse(value));
  }
  for (const imageKey of ['../../private.png', 'https://example.com/image.png', `${'a'.repeat(64)}.svg`]) {
    const value = item(); value.data.imageKey = imageKey;
    assert.throws(() => parse(value));
  }
  const value = item(); value.data.pt.description = ' ';
  assert.throws(() => parse(value));
});

test('recommendations reject duplicates and invalid versions or categories', () => {
  assert.throws(() => parseRecommendationSnapshot({ schemaVersion: 1, recommendations: [item(), item()] }));
  for (const draftVersion of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => parse({ ...item(), draftVersion }));
  const value = item(); value.data.category = 'OTHER'; assert.throws(() => parse(value));
});

test('book covers retain only a valid Google reference and cannot also contain a local image', () => {
  const value = item();
  const data = { ...value.data, imageKey: '', googleBooksId: 'synthetic-edition' };
  assert.equal(parse({ ...value, data }).recommendations[0].data.googleBooksId, 'synthetic-edition');
  assert.throws(() => parse({ ...value, data: { ...data, googleBooksId: '../unsafe' } }));
  assert.throws(() => parse({ ...value, data: { ...data, imageKey: value.data.imageKey } }));
  assert.throws(() => parse({ ...value, data: { ...data, category: 'TOOLS' } }));
});

test('recommendations accept only HTTPS or explicit local sources', () => {
  for (const source of ['http://example.com/api/recommendations', 'https://user:password@example.com/api', 'file:///private', 'https://example.com/#fragment'])
    assert.throws(() => recommendationSource(source));
  assert.equal(recommendationSource('http://127.0.0.1:8080/api/recommendations').origin, 'http://127.0.0.1:8080');
});

test('recommendation images use the API origin and verify bytes against the content hash', async () => {
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  const key = `${createHash('sha256').update(bytes).digest('hex')}.png`;
  const transport = (async (url, options) => {
    assert.equal(String(url), `https://example.com/api/recommendation-images/${key}`);
    assert.equal(options?.redirect, 'error');
    return new Response(bytes);
  }) as typeof fetch;
  assert.deepEqual(await fetchRecommendationImage(new URL('https://example.com/api/recommendations'), key, transport), bytes);
  await assert.rejects(fetchRecommendationImage(new URL('https://example.com'), `${'a'.repeat(64)}.png`,
    (async () => new Response(bytes)) as typeof fetch), /integrity/);
  await assert.rejects(fetchRecommendationImage(new URL('https://example.com'), key,
    (async () => new Response('<html>error</html>')) as typeof fetch), /integrity/);
});

test('recommendation fetch fails on unavailable, malformed or oversized responses', async () => {
  const source = new URL('https://example.com/api/recommendations');
  for (const response of [new Response('', { status: 503 }), new Response('invalid json'), new Response('a'.repeat(8 * 1024 * 1024 + 1))])
    await assert.rejects(fetchRecommendations(source, (async () => response) as typeof fetch));
});
