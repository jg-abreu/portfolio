import { AdminClient, AdminRequestError } from '../lib/admin-client';
import { cardBlocks, cardTextFields, encodeCardSettings, isCardView, moveBlock, parseStack,
  type CardBlock, type CardSettings, type CardView } from '../lib/card-admin';
import type { CardAdminLabels } from '../i18n/card-admin';

const root = document.querySelector<HTMLElement>('[data-card-admin]');
if (root) initialize(root);

function initialize(root: HTMLElement) {
  const labels: CardAdminLabels = JSON.parse(root.dataset.labels ?? '{}');
  const locale = root.dataset.locale === 'pt' ? 'pt-BR' : 'en-US';
  const q = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing card editor element: ${selector}`);
    return element;
  };
  const workspace = q<HTMLElement>('[data-workspace]');
  const login = q<HTMLElement>('[data-login]');
  const form = q<HTMLFormElement>('[data-form]');
  const blockList = q<HTMLOListElement>('[data-blocks]');
  const preview = q<HTMLImageElement>('[data-preview]');
  const previewMessage = q<HTMLElement>('[data-preview-message]');
  const discard = q<HTMLDialogElement>('[data-discard]');
  const reload = q<HTMLButtonElement>('[data-reload]');
  let view: CardView | null = null;
  let baseline = '';
  let busy = false;
  let loggingOut = false;
  let pendingDiscard: (() => void) | null = null;
  let previewTimer = 0;
  const client = new AdminClient(clear);
  const notice = (text: string) => { q<HTMLElement>('[data-notice]').textContent = text; };
  const input = (name: string) => q<HTMLInputElement>(`input[name="${name}"]`);
  const radio = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
  const items = () => [...blockList.querySelectorAll<HTMLLIElement>('li[data-block]')];

  function clear() {
    view = null; baseline = ''; pendingDiscard = null;
    window.clearTimeout(previewTimer);
    form.reset(); preview.removeAttribute('src'); previewMessage.textContent = '';
    workspace.hidden = true; login.hidden = false; reload.hidden = true;
    q<HTMLElement>('[data-username]').textContent = '';
    q<HTMLElement>('[data-state]').textContent = '';
    if (discard.open) discard.close();
  }

  function data(): CardSettings {
    const text = Object.fromEntries(cardTextFields.map(field => [field.name, input(field.name).value.trim()]));
    const blocks = items().filter(item => item.querySelector<HTMLInputElement>('[data-block-visible]')?.checked)
      .map(item => item.dataset.block as CardBlock);
    return { theme: radio('theme') as CardSettings['theme'], accent: radio('accent') as CardSettings['accent'],
      blocks, stack: parseStack(input('stack').value), ...text } as CardSettings;
  }

  function fill(settings: CardSettings) {
    for (const field of cardTextFields) input(field.name).value = settings[field.name];
    input('stack').value = settings.stack.join(', ');
    for (const name of ['theme', 'accent'] as const)
      for (const option of root.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) option.checked = option.value === settings[name];
    const order = [...settings.blocks, ...cardBlocks.filter(block => !settings.blocks.includes(block))];
    const byBlock = new Map(items().map(item => [item.dataset.block, item]));
    for (const block of order) {
      const item = byBlock.get(block);
      if (!item) continue;
      blockList.append(item);
      const visible = item.querySelector<HTMLInputElement>('[data-block-visible]');
      if (visible) visible.checked = settings.blocks.includes(block);
    }
    markInvalid(null);
    schedulePreview(0);
  }

  const dirty = () => !workspace.hidden && view !== null && JSON.stringify(data()) !== baseline;

  function guard(action: () => void) {
    if (busy) return;
    if (!dirty()) { action(); return; }
    pendingDiscard = action; discard.showModal();
  }

  function showView(next: CardView) {
    view = next;
    fill(next.draft);
    baseline = JSON.stringify(data());
    reload.hidden = true;
    const state = next.published === null ? labels.neverPublished : next.pending ? labels.pending : labels.live;
    const when = next.publishedAt ? ` ${labels.publishedAt}: ${new Date(next.publishedAt).toLocaleString(locale)}.` : '';
    q<HTMLElement>('[data-state]').textContent = `${state}${when}`;
  }

  function markInvalid(field: string | null) {
    for (const element of form.querySelectorAll<HTMLInputElement>('input[aria-invalid]')) element.removeAttribute('aria-invalid');
    if (!field) return;
    const target = field === 'blocks' ? blockList.querySelector<HTMLInputElement>('[data-block-visible]')
      : root.querySelector<HTMLInputElement>(`input[name="${CSS.escape(field)}"]`);
    if (target) { target.setAttribute('aria-invalid', 'true'); target.focus(); }
  }

  function previewUrl() { return `/api/admin/profile-card/preview.svg?settings=${encodeCardSettings(data())}`; }

  function schedulePreview(delay = 350) {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      if (workspace.hidden) return;
      previewMessage.textContent = '';
      preview.src = previewUrl();
    }, delay);
  }

  async function invalidField(url = previewUrl()) {
    try {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (response.status !== 400) return null;
      const problem: unknown = await response.json();
      const field = problem && typeof problem === 'object' && 'field' in problem ? problem.field : null;
      return typeof field === 'string' && /^[A-Za-z]{1,30}$/.test(field) ? field : null;
    } catch { return null; }
  }

  preview.addEventListener('error', () => {
    if (workspace.hidden || !preview.getAttribute('src')) return;
    previewMessage.textContent = labels.previewError;
    void invalidField(preview.src).then(field => { if (field && field !== 'settings') markInvalid(field); });
  });
  preview.addEventListener('load', () => { previewMessage.textContent = ''; markInvalid(null); });

  function error(cause: unknown) {
    if (cause instanceof AdminRequestError && cause.status === 409) { notice(labels.conflict); reload.hidden = false; return; }
    if (cause instanceof AdminRequestError && cause.status === 400) {
      notice(labels.invalid);
      void invalidField().then(markInvalid);
      return;
    }
    notice(cause instanceof AdminRequestError && (cause.status === 401 || cause.status === 403) ? labels.expired : labels.error);
  }

  async function execute(action: () => Promise<void>) {
    if (busy) return;
    busy = true; q<HTMLFieldSetElement>('[data-fields]').disabled = true;
    const version = client.version();
    try { await action(); } catch (cause) { if (version === client.version() || workspace.hidden) error(cause); }
    finally { busy = false; q<HTMLFieldSetElement>('[data-fields]').disabled = false; }
  }

  async function load() {
    const version = client.version();
    const session = await client.request('/api/admin/session');
    if (!session || typeof session !== 'object' || !('username' in session) || typeof session.username !== 'string') throw new Error('Invalid session');
    const next = await client.request('/api/admin/profile-card');
    if (!isCardView(next)) throw new Error('Invalid card settings');
    client.assertCurrent(version);
    q<HTMLElement>('[data-username]').textContent = session.username;
    workspace.hidden = false; login.hidden = true; q<HTMLElement>('[data-retry]').hidden = true;
    showView(next);
  }

  form.addEventListener('input', () => schedulePreview());
  form.addEventListener('change', () => schedulePreview());
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!view) return;
    const current = view;
    void execute(async () => {
      const saved = await client.mutate('/api/admin/profile-card/draft', 'PUT', { version: current.version, settings: data() });
      if (!isCardView(saved)) throw new Error('Invalid saved card');
      showView(saved); notice(labels.saved);
    });
  });
  q('[data-publish]').addEventListener('click', () => {
    if (!view || busy) return;
    if (dirty()) { notice(labels.unsaved); return; }
    const current = view;
    void execute(async () => {
      const published = await client.mutate('/api/admin/profile-card/publish', 'POST', { version: current.version });
      if (!isCardView(published)) throw new Error('Invalid published card');
      showView(published); notice(labels.published);
    });
  });
  q('[data-revert]').addEventListener('click', () => { if (view && !busy) guard(() => { const saved = view; if (saved) showView(saved); notice(''); }); });
  q('[data-defaults]').addEventListener('click', () => { if (view && !busy) { fill(view.defaults); notice(''); } });
  reload.addEventListener('click', () => guard(() => { void execute(async () => { await load(); notice(''); }); }));
  blockList.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-move]');
    const item = button?.closest<HTMLLIElement>('li[data-block]');
    if (!button || !item || busy) return;
    const offset = button.dataset.move === '-1' ? -1 : 1;
    const order = moveBlock(items().map(value => value.dataset.block as CardBlock), item.dataset.block as CardBlock, offset);
    const byBlock = new Map(items().map(value => [value.dataset.block, value]));
    for (const block of order) { const value = byBlock.get(block); if (value) blockList.append(value); }
    button.focus();
    schedulePreview();
  });
  q('[data-retry]').addEventListener('click', () => { void execute(async () => { await load(); notice(''); }); });
  q('[data-keep]').addEventListener('click', () => { pendingDiscard = null; discard.close(); });
  q('[data-confirm-discard]').addEventListener('click', () => { const action = pendingDiscard; pendingDiscard = null; discard.close(); action?.(); });
  discard.addEventListener('cancel', () => { pendingDiscard = null; });
  q('[data-logout]').addEventListener('click', () => {
    if (loggingOut) return;
    loggingOut = true;
    client.invalidate();
    void client.mutate('/api/auth/logout', 'POST').then(() => notice('')).catch(error).finally(() => {
      client.invalidate(); loggingOut = false;
    });
  });
  window.addEventListener('beforeunload', event => { if (dirty()) event.preventDefault(); });
  window.addEventListener('pagehide', () => client.invalidate());
  window.addEventListener('pageshow', event => { if (event.persisted) void execute(async () => { await load(); notice(''); }); });
  window.setInterval(() => {
    if (document.visibilityState !== 'visible' || workspace.hidden || busy) return;
    const version = client.version();
    void client.request('/api/admin/session').then(() => client.assertCurrent(version)).catch(error);
  }, 30000);
  void execute(async () => { await load(); notice(''); });
}
