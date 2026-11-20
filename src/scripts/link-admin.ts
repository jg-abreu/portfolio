import { AdminClient, AdminRequestError } from '../lib/admin-client';
import { isLinkPageView, linkTitleError, linkUrlError, maxLinks, type LinkPage, type LinkPageView, type PageLink } from '../lib/link-page';
import { sortable } from '../lib/sortable';
import type { LinkAdminLabels } from '../i18n/link-admin';

const root = document.querySelector<HTMLElement>('[data-link-admin]');
if (root) initialize(root);

function initialize(root: HTMLElement) {
  const labels: LinkAdminLabels = JSON.parse(root.dataset.labels ?? '{}');
  const locale = root.dataset.locale === 'pt' ? 'pt-BR' : 'en-US';
  const maxTitle = Number(root.dataset.maxTitle);
  const maxUrl = Number(root.dataset.maxUrl);
  const q = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing links editor element: ${selector}`);
    return element;
  };
  const workspace = q<HTMLElement>('[data-workspace]');
  const login = q<HTMLElement>('[data-login]');
  const form = q<HTMLFormElement>('[data-form]');
  const rows = q<HTMLOListElement>('[data-rows]');
  const preview = q<HTMLUListElement>('[data-preview]');
  const picker = q<HTMLDialogElement>('[data-picker]');
  const search = q<HTMLInputElement>('[data-picker-search]');
  const discard = q<HTMLDialogElement>('[data-discard]');
  const reload = q<HTMLButtonElement>('[data-reload]');
  const options = [...root.querySelectorAll<HTMLButtonElement>('[data-icon]')];
  const iconIds = new Set(options.map(option => option.dataset.icon!));
  let view: LinkPageView | null = null;
  let links: (PageLink & { key: number })[] = [];
  let nextKey = 0;
  let picking: number | null = null;
  let baseline = '';
  let busy = false;
  let loggingOut = false;
  let signedIn = false;
  let pendingDiscard: (() => void) | null = null;
  const client = new AdminClient(clear);
  const notice = (text: string) => { q<HTMLElement>('[data-notice]').textContent = text; };
  const announce = (text: string) => { q<HTMLElement>('[data-announce]').textContent = text; };
  const format = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const iconSvg = (id: string) => {
    const option = options.find(candidate => candidate.dataset.icon === id) ?? options.find(candidate => candidate.dataset.icon === 'link');
    return option?.querySelector('svg')?.cloneNode(true) as SVGElement | undefined;
  };
  const titleOf = (link: PageLink) => link.title.trim() || labels.untitled;

  function clear() {
    view = null; baseline = ''; pendingDiscard = null; links = []; picking = null;
    rows.replaceChildren(); preview.replaceChildren();
    workspace.hidden = true; login.hidden = false; reload.hidden = true;
    q<HTMLElement>('[data-username]').textContent = '';
    q<HTMLElement>('[data-state]').textContent = '';
    if (discard.open) discard.close();
    if (picker.open) picker.close();
  }

  function data(): LinkPage {
    return { links: links.map(({ title, url, icon }) => ({ title: title.trim(), url: url.trim(), icon })) };
  }

  function fill(page: LinkPage) {
    links = page.links.map(link => ({ ...link, key: nextKey++ }));
    render();
  }

  function renderPreview() {
    preview.replaceChildren(...links.map(link => {
      const item = element('li');
      const icon = element('span');
      const svg = iconSvg(link.icon);
      if (svg) icon.append(svg);
      icon.setAttribute('aria-hidden', 'true');
      const arrow = element('span', '', '→');
      arrow.setAttribute('aria-hidden', 'true');
      item.append(icon, element('span', 'preview-title', titleOf(link)), arrow);
      return item;
    }));
  }

  function iconButton(button: HTMLButtonElement, link: PageLink) {
    const svg = iconSvg(link.icon);
    button.replaceChildren(...(svg ? [svg] : []));
    button.setAttribute('aria-label', `${format(labels.chooseIcon, { title: titleOf(link) })} (${link.icon})`);
    button.title = link.icon;
  }

  function render() {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusKey = focused?.closest<HTMLElement>('[data-key]')?.dataset.key;
    const focusField = focused?.dataset.field;
    rows.replaceChildren(...links.map((link, index) => {
      const row = element('li', 'row');
      row.dataset.key = String(link.key);
      const grip = element('span', 'grip', '⠿');
      grip.title = labels.drag;
      grip.setAttribute('aria-hidden', 'true');
      const pick = element('button', 'icon-pick');
      pick.type = 'button';
      pick.dataset.field = 'icon';
      pick.dataset.path = `links[${index}].icon`;
      iconButton(pick, link);
      const title = element('input');
      title.value = link.title;
      title.maxLength = maxTitle;
      title.autocomplete = 'off';
      title.placeholder = labels.linkTitle;
      title.setAttribute('aria-label', `${labels.linkTitle} ${index + 1}`);
      title.dataset.field = 'title';
      title.dataset.path = `links[${index}].title`;
      const url = element('input');
      url.type = 'url';
      url.value = link.url;
      url.maxLength = maxUrl;
      url.autocomplete = 'off';
      url.spellcheck = false;
      url.placeholder = 'https://';
      url.setAttribute('aria-label', `${labels.linkUrl} ${index + 1}`);
      url.dataset.field = 'url';
      url.dataset.path = `links[${index}].url`;
      const actions = element('div', 'row-actions');
      const action = (text: string, name: string, label: string, disabled = false) => {
        const button = element('button', 'icon-button', text);
        button.type = 'button';
        button.dataset.action = name;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.disabled = disabled;
        return button;
      };
      actions.append(action('↑', 'up', labels.moveUp, index === 0), action('↓', 'down', labels.moveDown, index === links.length - 1),
        action('✕', 'remove', format(labels.remove, { title: titleOf(link) }), links.length <= 1));
      row.append(grip, pick, title, actions, url);
      return row;
    }));
    if (focusKey && focusField)
      rows.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"] [data-field="${CSS.escape(focusField)}"]`)?.focus({ preventScroll: true });
    q<HTMLButtonElement>('[data-add]').disabled = links.length >= maxLinks;
    renderPreview();
  }

  const indexOf = (target: EventTarget | null) => {
    const key = (target as Element | null)?.closest<HTMLElement>('[data-key]')?.dataset.key;
    return links.findIndex(link => String(link.key) === key);
  };

  function move(from: number, to: number) {
    if (to < 0 || to >= links.length) return;
    const [link] = links.splice(from, 1);
    links.splice(to, 0, link!);
    render();
    announce(format(labels.moved, { title: titleOf(link!), position: to + 1 }));
  }

  rows.addEventListener('input', event => {
    const target = event.target as HTMLInputElement;
    const index = indexOf(target);
    const field = target.dataset.field;
    if (index < 0 || (field !== 'title' && field !== 'url')) return;
    links[index]![field] = target.value;
    target.removeAttribute('aria-invalid');
    if (field === 'title') {
      const pick = target.closest('.row')?.querySelector<HTMLButtonElement>('.icon-pick');
      if (pick) iconButton(pick, links[index]!);
    }
    renderPreview();
  });

  rows.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target || busy) return;
    const index = indexOf(target);
    if (index < 0) return;
    if (target.classList.contains('icon-pick')) { openPicker(index); return; }
    if (target.dataset.action === 'up') move(index, index - 1);
    if (target.dataset.action === 'down') move(index, index + 1);
    if (target.dataset.action === 'remove') {
      if (links.length <= 1) { notice(labels.lastLink); return; }
      const [removed] = links.splice(index, 1);
      render();
      announce(format(labels.removed, { title: titleOf(removed!) }));
      rows.querySelectorAll<HTMLElement>('[data-field="title"]')[Math.min(index, links.length - 1)]?.focus();
    }
  });

  sortable(rows, {
    item: '.row', handle: '.grip', ignore: 'input, button', axis: 'y',
    onDrop: (_dragged, order) => {
      const byKey = new Map(links.map(link => [String(link.key), link]));
      links = order.map(row => byKey.get(row.dataset.key!)!).filter(Boolean);
      render();
    },
  });

  q('[data-add]').addEventListener('click', () => {
    if (busy) return;
    if (links.length >= maxLinks) { notice(labels.limit); return; }
    links.push({ title: '', url: 'https://', icon: 'link', key: nextKey++ });
    render();
    announce(labels.added);
    rows.querySelector<HTMLElement>('.row:last-child [data-field="title"]')?.focus();
  });

  function filterIcons() {
    const term = search.value.trim().toLowerCase();
    let shown = 0;
    for (const option of options) {
      const match = !term || option.dataset.icon!.includes(term);
      option.hidden = !match;
      if (match) shown++;
    }
    q<HTMLElement>('[data-no-icons]').hidden = shown > 0;
  }

  function openPicker(index: number) {
    picking = index;
    const current = links[index]!;
    q<HTMLElement>('[data-picker-title]').textContent = format(labels.chooseIcon, { title: titleOf(current) });
    search.value = '';
    filterIcons();
    for (const option of options) option.setAttribute('aria-pressed', String(option.dataset.icon === current.icon));
    picker.showModal();
    (options.find(option => option.dataset.icon === current.icon) ?? search).focus();
  }

  search.addEventListener('input', filterIcons);
  q('[data-icon-grid]').addEventListener('click', event => {
    const option = (event.target as Element).closest<HTMLButtonElement>('[data-icon]');
    if (!option || picking === null || !links[picking] || !iconIds.has(option.dataset.icon!)) return;
    const key = links[picking]!.key;
    links[picking]!.icon = option.dataset.icon!;
    picking = null;
    picker.close();
    render();
    rows.querySelector<HTMLElement>(`[data-key="${key}"] .icon-pick`)?.focus();
  });
  q('[data-picker-close]').addEventListener('click', () => picker.close());
  picker.addEventListener('close', () => { picking = null; });

  const dirty = () => !workspace.hidden && view !== null && JSON.stringify(data()) !== baseline;

  function guard(action: () => void) {
    if (busy) return;
    if (!dirty()) { action(); return; }
    pendingDiscard = action; discard.showModal();
  }

  function showView(next: LinkPageView) {
    view = next;
    fill(next.draft);
    baseline = JSON.stringify(data());
    reload.hidden = true;
    const state = next.published === null ? labels.neverPublished : next.pending ? labels.pending : labels.live;
    const when = next.publishedAt ? ` ${labels.publishedAt}: ${new Date(next.publishedAt).toLocaleString(locale)}.` : '';
    q<HTMLElement>('[data-state]').textContent = `${state}${when}`;
  }

  function markInvalid(path: string | null) {
    for (const node of root.querySelectorAll('[aria-invalid]')) node.removeAttribute('aria-invalid');
    if (!path) return;
    const control = rows.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`);
    if (control) { control.setAttribute('aria-invalid', 'true'); control.focus(); }
  }

  function firstInvalid(): string | null {
    for (const [index, link] of links.entries()) {
      if (linkTitleError(link.title)) return `links[${index}].title`;
      if (linkUrlError(link.url)) return `links[${index}].url`;
    }
    return null;
  }

  function error(cause: unknown) {
    if (cause instanceof AdminRequestError && cause.status === 409) { notice(labels.conflict); reload.hidden = false; return; }
    if (cause instanceof AdminRequestError && cause.status === 400) { notice(labels.invalid); markInvalid(firstInvalid()); return; }
    const unauthorized = cause instanceof AdminRequestError && (cause.status === 401 || cause.status === 403);
    notice(unauthorized ? signedIn ? labels.expired : '' : labels.error);
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
    const next = await client.request('/api/admin/link-page');
    if (!isLinkPageView(next)) throw new Error('Invalid link page');
    client.assertCurrent(version);
    q<HTMLElement>('[data-username]').textContent = session.username;
    workspace.hidden = false; login.hidden = true; q<HTMLElement>('[data-retry]').hidden = true;
    signedIn = true;
    showView(next);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!view) return;
    const invalid = firstInvalid();
    if (invalid) { notice(labels.invalid); markInvalid(invalid); return; }
    const current = view;
    void execute(async () => {
      const saved = await client.mutate('/api/admin/link-page/draft', 'PUT', { version: current.version, page: data() });
      if (!isLinkPageView(saved)) throw new Error('Invalid saved links');
      showView(saved); notice(labels.saved);
    });
  });
  q('[data-publish]').addEventListener('click', () => {
    if (!view || busy) return;
    if (dirty()) { notice(labels.unsaved); return; }
    const current = view;
    void execute(async () => {
      const published = await client.mutate('/api/admin/link-page/publish', 'POST', { version: current.version });
      if (!isLinkPageView(published)) throw new Error('Invalid published links');
      showView(published); notice(labels.published);
    });
  });
  q('[data-revert]').addEventListener('click', () => { if (view && !busy) guard(() => { const saved = view; if (saved) showView(saved); notice(''); }); });
  q('[data-defaults]').addEventListener('click', () => { if (view && !busy) { fill(view.defaults); notice(''); } });
  reload.addEventListener('click', () => guard(() => { void execute(async () => { await load(); notice(''); }); }));
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
