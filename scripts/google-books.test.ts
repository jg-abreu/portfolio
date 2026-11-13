import assert from 'node:assert/strict';
import test from 'node:test';
import { bookCoverUrl, bookInfoUrl, parseBookResults } from '../src/lib/google-books.ts';
test('book references cannot introduce image hosts, credentials or paths', () => {
  for (const value of ['../private', 'https://example.com', 'a?other=1', '', 'a'.repeat(101)]) {
    assert.throws(() => bookCoverUrl(value)); assert.throws(() => bookInfoUrl(value));
  }
  assert.equal(new URL(bookCoverUrl('edition_1')).hostname, 'books.google.com');
});
test('book search keeps provider order and rejects incomplete results', () => {
  const book = { volumeId: 'edition', title: 'Synthetic', authors: ['Test'], publisher: '', publishedDate: '', hasCover: false };
  assert.deepEqual(parseBookResults([book, { ...book, volumeId: 'second' }]).map(item => item.volumeId), ['edition', 'second']);
  assert.throws(() => parseBookResults([{ ...book, authors: '<script>' }]));
  assert.throws(() => parseBookResults([{ ...book, volumeId: 'https://example.com' }]));
});
