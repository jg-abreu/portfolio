import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { fetchRecommendationImage, fetchRecommendations, recommendationSource } from './recommendation-source.ts';
import { allRecommendations, isAmazon, parseRecommendationSnapshot, starFill } from '../src/lib/recommendations.ts';

const item = () => ({ recommendationId: 1, revision: '12345678-1234-1234-1234-123456789abc', draftVersion: 0,
  data: { slug: 'synthetic-book', sectionId: 3, imageKey: `${'a'.repeat(64)}.png`, url: '', rating: 4 as number,
    bookGroup: 'TECHNICAL' as string | null, readIn: null as string | null, subtitle: 'Synthetic author', googleBooksId: '',
    en: { title: 'Synthetic book', description: 'Test fixture only.', imageAlt: 'Test cover' },
    pt: { title: 'Livro sintético', description: 'Somente teste.', imageAlt: 'Capa de teste' } } });
const books = (items: unknown[]) => ({ id: 3, slug: 'books', kind: 'BOOKS', url: '',
  en: { title: 'Books', description: '' }, pt: { title: 'Livros', description: 'Os que recomendo' }, items });
const parse = (value: unknown, kind = 'BOOKS') =>
  parseRecommendationSnapshot({ schemaVersion: 3, sections: [{ ...books([value]), kind }] });

test('reads the previous schema with generated section addresses', () => {
  const legacy = parseRecommendationSnapshot({ schemaVersion: 2, sections: [{ id: 3, kind: 'BOOKS', en: { title: 'Books' },
    pt: { title: 'Livros' }, items: [item()] }] });
  assert.equal(legacy.sections[0]!.slug, 'section-3');
  assert.equal(legacy.sections[0]!.pt.description, '');
});

test('books take half stars and an optional reading language; link sections hold no items', () => {
  const half = item(); Object.assign(half.data, { rating: 4.5, readIn: 'EN' });
  assert.equal(parse(half).sections[0]!.items[0]!.data.rating, 4.5);
  assert.equal(parse(half).sections[0]!.items[0]!.data.readIn, 'EN');
  for (const change of [{ rating: 4.3 }, { readIn: 'ES' }]) {
    const value = item(); Object.assign(value.data, change);
    assert.throws(() => parse(value), JSON.stringify(change));
  }
  const link = { id: 9, slug: 'setup', kind: 'LINK', url: 'https://www.amazon.com.br/shop/x', en: { title: 'Setup' }, pt: { title: 'Setup' }, items: [] };
  assert.equal(parseRecommendationSnapshot({ schemaVersion: 3, sections: [link] }).sections[0]!.url, link.url);
  for (const invalid of [{ ...link, url: 'http://example.com' }, { ...link, url: '' }, { ...link, items: [item()] }, { ...link, slug: '../x' }])
    assert.throws(() => parseRecommendationSnapshot({ schemaVersion: 3, sections: [invalid] }));
  assert.throws(() => parseRecommendationSnapshot({ schemaVersion: 2, sections: [{ ...link, items: [] }] }));
});

test('star fill and Amazon detection', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(star => starFill(3.5, star)), ['full', 'full', 'full', 'half', 'empty']);
  assert.equal(isAmazon('https://www.amazon.com.br/shop/x'), true);
  assert.equal(isAmazon('https://amzn.to/abc'), true);
  assert.equal(isAmazon('https://notamazon.example.com'), false);
});

test('accepts the empty legacy catalogue and strips unrecognized publication data', () => {
  assert.deepEqual(parseRecommendationSnapshot({ schemaVersion: 1, recommendations: [] }), { schemaVersion: 3, sections: [] });
  assert.throws(() => parseRecommendationSnapshot({ schemaVersion: 1, recommendations: [item()] }));
  const value = { ...item(), privateEmail: 'private@example.com' };
  const parsed = parse(value);
  assert.equal('privateEmail' in parsed.sections[0]!.items[0]!, false);
  assert.equal(parsed.sections[0]!.pt.title, 'Livros');
  assert.equal(allRecommendations(parsed)[0]!.data.pt.title, 'Livro sintético');
});

test('rejects unsafe links, image paths and incomplete translations', () => {
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
  const long = item(); long.data.en.description = 'x'.repeat(301);
  assert.throws(() => parse(long));
});

test('books need a rating, a group and a cover; items need neither', () => {
  for (const change of [{ rating: 0 }, { rating: 6 }, { bookGroup: 'OTHER' }, { bookGroup: null }, { imageKey: '' }]) {
    const value = item(); Object.assign(value.data, change);
    assert.throws(() => parse(value), JSON.stringify(change));
  }
  const gear = item(); Object.assign(gear.data, { rating: 0, bookGroup: null, imageKey: '' });
  assert.equal(parse(gear, 'ITEMS').sections[0]!.items[0]!.data.rating, 0);
  const rated = item(); Object.assign(rated.data, { bookGroup: null });
  assert.throws(() => parse(rated, 'ITEMS'));
});

test('rejects duplicates, empty sections and invalid versions or kinds', () => {
  assert.throws(() => parseRecommendationSnapshot({ schemaVersion: 3, sections: [books([item(), item()])] }));
  assert.throws(() => parseRecommendationSnapshot({ schemaVersion: 3, sections: [books([])] }));
  assert.throws(() => parseRecommendationSnapshot({ schemaVersion: 3, sections: [books([item()]), books([{ ...item(), recommendationId: 2 }])] }));
  for (const draftVersion of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => parse({ ...item(), draftVersion }));
  assert.throws(() => parse(item(), 'COURSES'));
});

test('book covers retain only a valid Google reference and cannot also contain a local image', () => {
  const value = item();
  const data = { ...value.data, imageKey: '', googleBooksId: 'synthetic-edition' };
  assert.equal(parse({ ...value, data }).sections[0]!.items[0]!.data.googleBooksId, 'synthetic-edition');
  assert.throws(() => parse({ ...value, data: { ...data, googleBooksId: '../unsafe' } }));
  assert.throws(() => parse({ ...value, data: { ...data, imageKey: value.data.imageKey } }));
  assert.throws(() => parse({ ...value, data: { ...data, rating: 0, bookGroup: null } }, 'ITEMS'));
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
