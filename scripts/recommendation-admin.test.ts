import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { AdminClient, AdminRequestError } from '../src/lib/admin-client.ts';
import { isRecommendationDraft, isRecommendationSummary } from '../src/lib/recommendation-admin.ts';

const source = ts.transpileModule(readFileSync('src/scripts/recommendation-admin.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const copy = { title: '<img src=x onerror=unsafe()>', description: 'Private recommendation', imageAlt: 'Synthetic cover' };
const draft = { id: 1, version: 0, status: 'DRAFT', updatedAt: '2026-11-13T12:00:00Z',
  data: { slug: 'synthetic-book', category: 'BOOKS', displayOrder: 0, imageKey: '', url: '', en: copy, pt: copy } };

function harness() {
  const elements = new Map<string, any>();
  const element = (selector: string): any => {
    if (!elements.has(selector)) elements.set(selector, {
      hidden: ['[data-workspace]', '[data-login]', '[data-editor]'].includes(selector), value: '', textContent: '', disabled: false,
      open: false, dataset: {}, children: [], files: [], events: new Map<string, Function>(),
      addEventListener(name: string, callback: Function) { this.events.set(name, callback); },
      append(...children: unknown[]) { this.children.push(...children); },
      replaceChildren() { this.children = []; }, removeAttribute(name: string) { delete this[name]; },
      focus() {}, close() { this.open = false; }, showModal() { this.open = true; }, reportValidity() { return true; },
      reset() { for (const [key, field] of elements) if (key.startsWith('[name=')) field.value = key.includes('displayOrder') ? '0' : key.includes('category') ? 'BOOKS' : ''; element('[data-file]').files = []; },
    });
    return elements.get(selector);
  };
  let expired = false;
  let poll: Function = () => {};
  let created = 0;
  let pause = false;
  let release: (response: Response) => void = () => {};
  const transport = (async (path: string) => {
    if (path === '/api/auth/csrf') return Response.json({ headerName: 'X-CSRF-TOKEN', token: 'test' });
    if (path === '/api/auth/logout') return new Response(null, { status: 204 });
    if (expired && path.startsWith('/api/admin/')) return new Response(null, { status: 401 });
    if (path === '/api/admin/session') return Response.json({ username: 'synthetic-admin' });
    if (path === '/api/admin/recommendations') {
      if (pause) return new Promise<Response>(resolve => { release = resolve; });
      return Response.json([draft]);
    }
    if (path === '/api/admin/recommendations/1') return Response.json(draft);
    if (path === '/api/admin/recommendation-publications') return Response.json([]);
    return Response.json({ schemaVersion: 1, recommendations: [] });
  }) as typeof fetch;
  class BoundClient extends AdminClient { constructor(clear: () => void) { super(clear, transport); } }
  const root = { dataset: { locale: 'en', labels: JSON.stringify({ expired: 'Expired', draft: 'Draft', unpublished: 'Unpublished' }) }, querySelector: element };
  runInNewContext(source, { exports: {}, require: (path: string) => path.includes('admin-client') ? { AdminClient: BoundClient, AdminRequestError } : { isRecommendationDraft, isRecommendationSummary },
    document: { querySelector: () => root, createElement: () => element(`created-${created++}`), visibilityState: 'visible' },
    window: { addEventListener() {}, setInterval(callback: Function) { poll = callback; } }, fetch: transport, FormData, AbortSignal, console });
  return { element, expire() { expired = true; }, poll: () => poll(), pause() { pause = true; },
    release() { release(Response.json([draft])); } };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 25));

test('recommendation editor renders plain text and clears private fields on logout', async () => {
  const view = harness(); await settle();
  const button = view.element('[data-list]').children[0].children[0];
  assert.equal(button.children[0].textContent, copy.title);
  button.events.get('click')(); await settle();
  assert.equal(view.element('[name="en.description"]').value, copy.description);
  view.element('[data-logout]').events.get('click')();
  assert.equal(view.element('[name="en.description"]').value, '');
  assert.equal(view.element('[data-workspace]').hidden, true);
  assert.equal(view.element('[data-list]').children.length, 0);
  await settle();
});

test('expired recommendation sessions clear the open editor', async () => {
  const view = harness(); await settle();
  view.element('[data-list]').children[0].children[0].events.get('click')(); await settle();
  view.expire(); view.poll(); await settle();
  assert.equal(view.element('[data-editor]').hidden, true);
  assert.equal(view.element('[name="en.title"]').value, '');
  assert.equal(view.element('[data-username]').textContent, '');
});

test('late recommendation refresh cannot restore private content after logout', async () => {
  const view = harness(); await settle(); view.pause();
  view.element('[data-refresh]').events.get('click')(); await settle();
  view.element('[data-logout]').events.get('click')(); await settle(); view.release(); await settle();
  assert.equal(view.element('[data-workspace]').hidden, true);
  assert.equal(view.element('[data-list]').children.length, 0);
});
