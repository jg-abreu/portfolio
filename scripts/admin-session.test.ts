import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/scripts/admin.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

async function workspace() {
  const elements = new Map<string, any>();
  const callbacks = new Map<string, Function>();
  const element = (selector: string): any => {
    if (!elements.has(selector)) elements.set(selector, {
      hidden: false, open: false, value: '', textContent: '', disabled: false,
      dataset: {}, children: [],
      addEventListener(name: string, callback: Function) { callbacks.set(`${selector}:${name}`, callback); },
      replaceChildren() { this.children = []; },
      reset() { element('[data-private-field]').value = ''; },
      close() { this.open = false; },
      setAttribute() {},
    });
    return elements.get(selector);
  };
  let expired = false;
  let refresh: Function = () => {};
  let delayPublications: ((value: unknown) => void) | undefined;
  let deferredPath = '';
  const root = {
    dataset: { locale: 'en', labels: JSON.stringify({ checking: 'Checking', empty: 'Empty' }) },
    querySelector: element,
    querySelectorAll: () => [],
  };
  runInNewContext(source, {
    exports: {},
    document: { querySelector: () => root, visibilityState: 'visible' },
    window: { addEventListener() {}, setInterval(callback: Function) { refresh = callback; } },
    AbortSignal,
    fetch: async (path: string) => {
      const status = expired && path.startsWith('/api/admin/') ? 401 : path.endsWith('/logout') ? 204 : 200;
      let body: unknown = path.endsWith('/session') ? { username: 'jg-abreu' }
        : path.endsWith('/csrf') ? { headerName: 'X-CSRF-TOKEN', token: 'test-token' }
        : path.endsWith('.json') ? { schemaVersion: 1, projects: [] } : [];
      if (path === deferredPath)
        body = await new Promise(resolve => { delayPublications = resolve; });
      return { ok: status < 400, status, json: async () => body };
    },
  });
  const settle = async () => { for (let i = 0; i < 10; i++) await new Promise(setImmediate); };
  await settle();
  assert.equal(element('[data-username]').textContent, 'jg-abreu');
  element('[data-private-field]').value = 'Private unsaved project';
  element('[data-search]').value = 'Private search';
  element('[data-editor]').open = true;
  element('[data-discard]').open = true;
  const logout = () => callbacks.get('[data-logout]:click')!({ currentTarget: element('[data-logout]') });
  const assertCleared = () => {
    assert.equal(element('[data-workspace]').hidden, true);
    assert.equal(element('[data-login]').hidden, false);
    assert.equal(element('[data-private-field]').value, '');
    assert.equal(element('[data-username]').textContent, '');
    assert.equal(element('[data-search]').value, '');
    assert.equal(element('[data-editor]').open, false);
    assert.equal(element('[data-discard]').open, false);
  };
  return { element, logout, assertCleared, refresh: () => refresh(), expire: () => { expired = true; },
    deferRefresh: (path = '/api/admin/project-publications') => { deferredPath = path; },
    resolveRefresh: () => delayPublications!([]), settle };
}

test('logout clears private editor values and closes dialogs', async () => {
  const app = await workspace();
  await app.logout();
  app.assertCleared();
});

test('an expired session clears the workspace during refresh', async () => {
  const app = await workspace();
  app.expire();
  await app.refresh();
  app.assertCleared();
});

test('a refresh started before logout cannot render private state afterward', async () => {
  const app = await workspace();
  app.deferRefresh();
  const pending = app.refresh();
  await app.settle();
  await app.logout();
  app.element('[data-project-list]').children = ['unchanged after logout'];
  app.resolveRefresh();
  await pending;
  assert.deepEqual(app.element('[data-project-list]').children, ['unchanged after logout']);
  app.assertCleared();
});

test('an optional manifest response cannot resume a refresh after logout', async () => {
  const app = await workspace();
  app.deferRefresh('/project-publications.json');
  const pending = app.refresh();
  await app.settle();
  await app.logout();
  app.element('[data-project-list]').children = ['unchanged after logout'];
  app.resolveRefresh();
  await pending;
  assert.deepEqual(app.element('[data-project-list]').children, ['unchanged after logout']);
});
