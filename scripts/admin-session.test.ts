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
      dataset: {}, children: [], events: new Map<string, Function>(),
      addEventListener(name: string, callback: Function) {
        callbacks.set(`${selector}:${name}`, callback);
        this.events.set(name, callback);
      },
      replaceChildren() { this.children = []; },
      append(child: unknown) { this.children.push(child); },
      reset() { element('[data-private-field]').value = ''; },
      close() { this.open = false; },
      setAttribute() {},
      removeAttribute() {},
      focus() {},
    });
    return elements.get(selector);
  };
  let expired = false;
  let refresh: Function = () => {};
  let delayPublications: ((value: unknown) => void) | undefined;
  let deferredPath = '';
  let created = 0;
  let inboxDetail = {
    id: 7, version: 0, name: 'Test sender', email: 'sender@example.com',
    message: '<img src=x onerror=alert(1)>\nPrivate visitor text',
    createdAt: '2026-11-13T03:00:00Z', readAt: null as string | null,
    archivedAt: null as string | null, deliveryStatus: 'pending',
  };
  const changes: { action: string; version: number }[] = [];
  const root = {
    dataset: { locale: 'en', labels: JSON.stringify({ checking: 'Checking', empty: 'Empty' }) },
    querySelector: element,
    querySelectorAll: () => [],
  };
  runInNewContext(source, {
    exports: {},
    document: { querySelector: () => root, visibilityState: 'visible',
      createElement: () => element(`[created-${created++}]`) },
    window: { addEventListener() {}, setInterval(callback: Function) { refresh = callback; } },
    AbortSignal,
    fetch: async (path: string, options: RequestInit = {}) => {
      const status = expired && path.startsWith('/api/admin/') ? 401 : path.endsWith('/logout') ? 204 : 200;
      if (path.endsWith('/7/read') || path.endsWith('/7/archive')) {
        const change = JSON.parse(String(options.body));
        const action = path.endsWith('/read') ? 'readAt' : 'archivedAt';
        changes.push({ action, version: change.version });
        inboxDetail = { ...inboxDetail, version: inboxDetail.version + 1,
          [action]: change.value ? '2026-11-13T03:01:00Z' : null };
      }
      let body: unknown = path.endsWith('/session') ? { username: 'jg-abreu' }
        : path.endsWith('/csrf') ? { headerName: 'X-CSRF-TOKEN', token: 'test-token' }
        : path.startsWith('/api/admin/messages?') ? {
          messages: inboxDetail.archivedAt ? [] : [inboxDetail], totalElements: inboxDetail.archivedAt ? 0 : 1, hasNext: false }
        : path.startsWith('/api/admin/messages/7') ? inboxDetail
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
    openInbox: () => callbacks.get('[data-open-inbox]:click')!(),
    changes,
    changeRead: () => callbacks.get('[data-inbox-read]:click')!(),
    changeArchive: () => callbacks.get('[data-inbox-archive]:click')!(),
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

test('inbox renders visitor content as plain text and clears it on logout', async () => {
  const app = await workspace();
  app.openInbox();
  await app.settle();
  const list = app.element('[data-inbox-list]');
  assert.equal(list.children.length, 1);
  list.children[0].events.get('click')();
  await app.settle();
  assert.equal(app.element('[data-inbox-email]').textContent, 'sender@example.com');
  assert.equal(app.element('[data-inbox-body]').textContent,
    '<img src=x onerror=alert(1)>\nPrivate visitor text');
  await app.logout();
  assert.equal(app.element('[data-inbox-body]').textContent, '');
  assert.equal(app.element('[data-inbox-email]').textContent, '');
  assert.equal(list.children.length, 0);
  assert.equal(app.element('[data-inbox-detail]').hidden, true);
});

test('an inbox response arriving after logout cannot restore message details', async () => {
  const app = await workspace();
  app.openInbox();
  await app.settle();
  app.deferRefresh('/api/admin/messages/7');
  app.element('[data-inbox-list]').children[0].events.get('click')();
  await app.settle();
  await app.logout();
  app.resolveRefresh();
  await app.settle();
  assert.equal(app.element('[data-inbox-body]').textContent, '');
  assert.equal(app.element('[data-inbox-detail]').hidden, true);
});

test('session expiry clears an open inbox and its private message fields', async () => {
  const app = await workspace();
  app.openInbox();
  await app.settle();
  app.element('[data-inbox-list]').children[0].events.get('click')();
  await app.settle();
  assert.equal(app.element('[data-inbox-email]').textContent, 'sender@example.com');
  app.expire();
  await app.refresh();
  app.assertCleared();
  assert.equal(app.element('[data-inbox-list]').children.length, 0);
  assert.equal(app.element('[data-inbox-body]').textContent, '');
  assert.equal(app.element('[data-inbox-email]').textContent, '');
  assert.equal(app.element('[data-inbox-detail]').hidden, true);
});

test('inbox actions use the version returned by the previous update', async () => {
  const app = await workspace();
  app.openInbox();
  await app.settle();
  app.element('[data-inbox-list]').children[0].events.get('click')();
  await app.settle();
  app.changeRead();
  await app.settle();
  app.changeArchive();
  await app.settle();
  assert.deepEqual(app.changes, [{ action: 'readAt', version: 0 }, { action: 'archivedAt', version: 1 }]);
  assert.equal(app.element('[data-inbox-list]').children.length, 0);
  assert.equal(app.element('[data-inbox-detail]').hidden, true);
});
