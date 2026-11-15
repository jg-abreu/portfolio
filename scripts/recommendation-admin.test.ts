import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { clearBuildStatus, updateBuildStatus } from '../src/lib/publication-status.ts';
import test from 'node:test';
import ts from 'typescript';
import { AdminClient, AdminRequestError } from '../src/lib/admin-client.ts';
import { isRecommendationDraft, isRecommendationSection, isRecommendationSummary, reorder } from '../src/lib/recommendation-admin.ts';
import { bookCoverUrl, bookInfoUrl, parseBookResults } from '../src/lib/google-books.ts';
import { bookGroups } from '../src/lib/recommendations.ts';

const source = ts.transpileModule(readFileSync('src/scripts/recommendation-admin.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const copy = { title: '<img src=x onerror=unsafe()>', description: 'Private recommendation', imageAlt: '' };
const section = { id: 7, version: 0, displayOrder: 0, items: 1, data: { kind: 'ITEMS', en: { title: 'Setup' }, pt: { title: 'Setup' } } };
const draft = { id: 1, version: 0, status: 'DRAFT', displayOrder: 0, updatedAt: '2026-11-13T12:00:00Z',
  data: { slug: 'synthetic-item', sectionId: 7, rating: 0, bookGroup: null, subtitle: 'Synthetic brand', imageKey: '', url: '', googleBooksId: '', en: copy, pt: copy } };
const book = { volumeId: 'edition', title: '<img src=x onerror=unsafe()>', authors: ['Synthetic author'], publisher: 'Test publisher', publishedDate: '2026', hasCover: true };

function harness() {
  const elements = new Map<string, any>();
  let created = 0;
  const make = (key: string): any => ({
    key, hidden: ['[data-workspace]', '[data-login]'].includes(key), value: '', textContent: '', disabled: false, open: false,
    dataset: {}, style: {}, children: [], files: [], attributes: new Map<string, string>(), events: new Map<string, Function>(),
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(name: string, callback: Function) { this.events.set(name, callback); },
    removeEventListener(name: string) { this.events.delete(name); },
    append(...children: unknown[]) { this.children.push(...children); },
    replaceChildren(...children: unknown[]) { this.children = children; },
    setAttribute(name: string, value: string) { this.attributes.set(name, value); },
    removeAttribute(name: string) { this.attributes.delete(name); if (name === 'src' || name === 'href') this[name] = undefined; },
    toggleAttribute(name: string, force: boolean) { if (force) this.attributes.set(name, ''); else this.attributes.delete(name); },
    querySelector(selector: string) { return element(selector); },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {}, hidePopover() {}, reset() {
      for (const [name, field] of elements) if (name.startsWith('[name=')) field.value = '';
      element('[data-file]').files = [];
    },
    close() { this.open = false; this.events.get('close')?.(); }, showModal() { this.open = true; },
  });
  const element = (selector: string): any => {
    if (!elements.has(selector)) elements.set(selector, make(selector));
    return elements.get(selector);
  };
  let expired = false;
  let poll: Function = () => {};
  let pausedPath = '';
  let release: (response: Response) => void = () => {};
  const transport = (async (path: string) => {
    if (pausedPath && path.startsWith(pausedPath)) return new Promise<Response>(resolve => { release = resolve; });
    if (path === '/api/auth/csrf') return Response.json({ headerName: 'X-CSRF-TOKEN', token: 'test' });
    if (path === '/api/auth/logout') return new Response(null, { status: 204 });
    if (expired && path.startsWith('/api/admin/')) return new Response(null, { status: 401 });
    if (path === '/api/admin/session') return Response.json({ username: 'synthetic-admin' });
    if (path === '/api/admin/recommendation-sections') return Response.json([section]);
    if (path === '/api/admin/recommendations') return Response.json([draft]);
    if (path === '/api/admin/recommendations/1') return Response.json(draft);
    if (path === '/api/admin/recommendation-publications') return Response.json([]);
    if (path.startsWith('/api/admin/books?')) return Response.json([book]);
    if (path === '/api/admin/books/edition/selection') return Response.json(book);
    return Response.json({ schemaVersion: 1, recommendations: [] });
  }) as typeof fetch;
  class BoundClient extends AdminClient { constructor(clear: () => void) { super(clear, transport); } }
  const root = { dataset: { locale: 'en', labels: JSON.stringify({ expired: 'Expired', statusDraft: 'Draft', ratingValue: '{n}' }) }, querySelector: element };
  runInNewContext(source, { exports: {}, require: (path: string) => path.includes('publication-status') ? { clearBuildStatus, updateBuildStatus }
    : path.includes('admin-client') ? { AdminClient: BoundClient, AdminRequestError }
    : path.includes('google-books') ? { bookCoverUrl, bookInfoUrl, parseBookResults }
    : path.includes('sortable') ? { sortable() {} }
    : path.includes('lib/recommendations') ? { bookGroups }
    : { isRecommendationDraft, isRecommendationSection, isRecommendationSummary, reorder },
    document: { querySelector: () => root, createElement: () => make(`created-${created++}`), visibilityState: 'visible' },
    window: { addEventListener() {}, setInterval(callback: Function) { poll = callback; }, setTimeout }, fetch: transport, FormData, AbortSignal, console });
  const card = () => element('[data-sections]').children[0]?.children[1]?.children[0]?.children[0];
  const addButton = () => element('[data-sections]').children[0].children.at(-1);
  return { element, card, addButton, expire() { expired = true; }, poll: () => poll(),
    pause(path: string) { pausedPath = path; }, release(value: unknown) { release(Response.json(value)); } };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 25));

test('sections and items render plain text and logout clears the open item', async () => {
  const view = harness(); await settle();
  const section = view.element('[data-sections]').children[0];
  assert.equal(section.children[0].children[1].textContent, 'Setup');
  const item = view.card();
  assert.equal(item.children[2].textContent, copy.title);
  item.events.get('click')(); await settle();
  assert.equal(view.element('[name="enDescription"]').value, copy.description);
  assert.equal(view.element('[name="subtitle"]').value, 'Synthetic brand');
  assert.equal(view.element('[data-item-dialog]').open, true);
  view.element('[data-logout]').events.get('click')();
  assert.equal(view.element('[name="enDescription"]').value, '');
  assert.equal(view.element('[data-item-dialog]').open, false);
  assert.equal(view.element('[data-workspace]').hidden, true);
  assert.equal(view.element('[data-sections]').children.length, 0);
  await settle();
});

test('expired sessions clear the open item and the sections', async () => {
  const view = harness(); await settle();
  view.card().events.get('click')(); await settle();
  view.expire(); view.poll(); await settle();
  assert.equal(view.element('[data-item-dialog]').open, false);
  assert.equal(view.element('[name="title"]').value, '');
  assert.equal(view.element('[data-username]').textContent, '');
});

test('choosing a book fills title and author and keeps only the Google reference', async () => {
  const view = harness(); await settle();
  view.addButton().events.get('click')();
  view.element('[data-book-query]').value = 'Synthetic title';
  view.element('[data-search-books]').events.get('click')(); await settle();
  const result = view.element('[data-book-results]').children[0];
  assert.equal(result.children[1].textContent, book.title);
  result.children.at(-1).events.get('click')(); await settle();
  assert.equal(view.element('[name="googleBooksId"]').value, 'edition');
  assert.equal(view.element('[name="imageKey"]').value, '');
  assert.equal(view.element('[data-preview]').src, bookCoverUrl('edition'));
  assert.equal(view.element('[name="title"]').value, book.title);
  assert.equal(view.element('[name="subtitle"]').value, 'Synthetic author');
});

test('a book search arriving after logout cannot restore covers or provider metadata', async () => {
  const view = harness(); await settle();
  view.addButton().events.get('click')();
  view.pause('/api/admin/books?'); view.element('[data-book-query]').value = 'Synthetic title';
  view.element('[data-search-books]').events.get('click')(); await settle();
  view.element('[data-logout]').events.get('click')(); await settle(); view.release([book]); await settle();
  assert.equal(view.element('[data-book-results]').children.length, 0);
  assert.equal(view.element('[name="googleBooksId"]').value, '');
});

test('validators accept the section and draft shapes and reject unsafe ones', () => {
  assert.ok(isRecommendationSection(section));
  assert.ok(isRecommendationDraft(draft));
  assert.equal(isRecommendationSection({ ...section, data: { ...section.data, kind: 'VIDEOS' } }), false);
  assert.equal(isRecommendationDraft({ ...draft, data: { ...draft.data, rating: 6 } }), false);
  assert.equal(isRecommendationDraft({ ...draft, data: { ...draft.data, bookGroup: 'OTHER' } }), false);
  assert.equal(isRecommendationDraft({ ...draft, data: { ...draft.data, imageKey: '../x.png' } }), false);
  assert.deepEqual(reorder([1, 2, 3], 3, 0), [3, 1, 2]);
  assert.deepEqual(reorder([1, 2, 3], 1, 9), [2, 3, 1]);
  assert.deepEqual(reorder([1, 2], 5, 0), [1, 2]);
});
