import { clearBuildStatus, updateBuildStatus } from '../lib/publication-status';
import { AdminClient, AdminRequestError } from '../lib/admin-client';
import { isRecommendationDraft, isRecommendationSummary, type RecommendationDraft, type RecommendationSummary } from '../lib/recommendation-admin';
import type { RecommendationAdminLabels } from '../i18n/recommendation-admin';
import type { RecommendationData } from '../lib/recommendations';
import { bookCoverUrl, bookInfoUrl, parseBookResults } from '../lib/google-books';

const root = document.querySelector<HTMLElement>('[data-recommendation-admin]');
if (root) initialize(root);

function initialize(root: HTMLElement) {
  const labels: RecommendationAdminLabels = JSON.parse(root.dataset.labels ?? '{}');
  const locale = root.dataset.locale === 'pt' ? 'pt' : 'en';
  const q = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing recommendation editor element: ${selector}`);
    return element;
  };
  const workspace = q<HTMLElement>('[data-workspace]');
  const login = q<HTMLElement>('[data-login]');
  const form = q<HTMLFormElement>('[data-form]');
  const editor = q<HTMLElement>('[data-editor]');
  const list = q<HTMLElement>('[data-list]');
  const preview = q<HTMLImageElement>('[data-preview]');
  const discard = q<HTMLDialogElement>('[data-discard]');
  const file = q<HTMLInputElement>('[data-file]');
  let current: RecommendationDraft | null = null;
  let publications: RecommendationSummary[] = [];
  let deployed: RecommendationSummary[] = [];
  let baseline = '';
  let busy = false;
  let loggingOut = false;
  let pendingDiscard: (() => void) | null = null;
  const client = new AdminClient(clear);
  const field = (name: string) => q<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`);
  const notice = (text: string) => { q<HTMLElement>('[data-notice]').textContent = text; };

  function clear() {
    clearBuildStatus(root);
    current = null; publications = []; deployed = []; baseline = ''; pendingDiscard = null;
    form.reset(); file.value = ''; preview.removeAttribute('src'); preview.hidden = true;
    list.replaceChildren(); editor.hidden = true; workspace.hidden = true; login.hidden = false;
    q<HTMLElement>('[data-username]').textContent = '';
    q<HTMLElement>('[data-publication-status]').textContent = '';
    q<HTMLElement>('[data-book-results]').replaceChildren();
    q<HTMLElement>('[data-book-results-section]').hidden = true;
    q<HTMLElement>('[data-book-message]').textContent = '';
    q<HTMLAnchorElement>('[data-book-source]').removeAttribute('href');
    q<HTMLAnchorElement>('[data-book-source]').hidden = true;
    q<HTMLElement>('[data-actions]').hidden = true;
    if (discard.open) discard.close();
  }
  function error(error: unknown) {
    notice(error instanceof AdminRequestError
      ? error.status === 401 || error.status === 403 ? labels.expired
      : error.status === 409 ? labels.conflict : error.status === 400 || error.status === 413 ? labels.invalid
        : error.status === 503 ? labels.bookUnavailable : error.status === 429 ? labels.bookWait : labels.error
      : labels.error);
  }
  function data(): RecommendationData {
    const copy = (language: string) => ({ title: field(`${language}.title`).value,
      description: field(`${language}.description`).value, imageAlt: field(`${language}.imageAlt`).value });
    return { slug: field('slug').value.trim(), category: field('category').value as RecommendationData['category'],
      imageKey: field('imageKey').value, url: field('url').value.trim(), displayOrder: Number(field('displayOrder').value),
      googleBooksId: field('googleBooksId').value,
      en: copy('en'), pt: copy('pt') };
  }
  const dirty = () => !editor.hidden && (JSON.stringify(data()) !== baseline || !!file.files?.length);
  function guard(action: () => void) {
    if (busy) return;
    if (!dirty()) { action(); return; }
    pendingDiscard = action; discard.showModal();
  }
  function updatePreview() {
    const key = field('imageKey').value;
    const book = field('googleBooksId').value;
    const source = q<HTMLAnchorElement>('[data-book-source]');
    source.hidden = !book;
    if (book) { preview.src = bookCoverUrl(book); source.href = bookInfoUrl(book); }
    else if (/^[0-9a-f]{64}\.png$/.test(key)) { preview.src = `/api/admin/recommendation-images/${encodeURIComponent(key)}`; source.removeAttribute('href'); }
    else preview.removeAttribute('src');
    preview.hidden = !key && !book;
  }
  function publicationStatus(item: RecommendationDraft) {
    const selected = publications.find(value => value.recommendationId === item.id);
    if (!selected) return labels.unpublished;
    return `${deployed.some(value => value.recommendationId === item.id && value.revision === selected.revision) ? labels.deployed : labels.pending}${selected.draftVersion !== item.version ? ` · ${labels.newer}` : ''}`;
  }
  function show(item: RecommendationDraft | null) {
    current = item; form.reset(); file.value = '';
    q<HTMLElement>('[data-book-results]').replaceChildren();
    q<HTMLElement>('[data-book-results-section]').hidden = true;
    q<HTMLElement>('[data-book-message]').textContent = '';
    const value = item?.data;
    if (value) {
      for (const name of ['slug', 'category', 'imageKey', 'url', 'displayOrder'] as const) field(name).value = String(value[name]);
      field('googleBooksId').value = value.googleBooksId ?? '';
      for (const language of ['en', 'pt'] as const)
        for (const name of ['title', 'description', 'imageAlt'] as const) field(`${language}.${name}`).value = value[language][name];
    }
    baseline = JSON.stringify(data()); editor.hidden = false;
    q<HTMLElement>('[data-actions]').hidden = !item;
    q<HTMLButtonElement>('[data-select]').disabled = item?.status === 'ARCHIVED';
    q<HTMLButtonElement>('[data-withdraw]').disabled = !publications.some(value => value.recommendationId === item?.id);
    q<HTMLElement>('[data-archive]').textContent = item?.status === 'ARCHIVED' ? labels.restore : labels.archive;
    q<HTMLElement>('[data-publication-status]').textContent = item ? publicationStatus(item) : labels.unpublished;
    updatePreview(); q<HTMLElement>('#recommendation-editor-heading').focus();
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
    const values = await client.request('/api/admin/recommendations');
    const selected = await client.request('/api/admin/recommendation-publications');
    if (!Array.isArray(values) || values.length > 500 || !values.every(isRecommendationDraft)
      || !Array.isArray(selected) || !selected.every(isRecommendationSummary)) throw new Error('Invalid recommendations');
    let manifest: RecommendationSummary[] = [];
    try {
      const response = await fetch('/recommendation-publications.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const value = await response.json();
        if (value?.schemaVersion === 1 && Array.isArray(value.recommendations) && value.recommendations.every(isRecommendationSummary)) manifest = value.recommendations;
      }
    } catch {}
    client.assertCurrent(version);
    publications = selected; deployed = manifest;
    list.replaceChildren();
    for (const item of values) {
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      const title = document.createElement('strong'); title.textContent = item.data[locale].title || item.data.slug;
      const status = document.createElement('small'); status.textContent = `${item.status === 'ARCHIVED' ? labels.archived : labels.draft} · ${publicationStatus(item)}`;
      button.append(title, status); button.addEventListener('click', () => guard(() => {
        void execute(async () => {
          const latest = await client.request(`/api/admin/recommendations/${item.id}`);
          if (!isRecommendationDraft(latest)) throw new Error('Invalid draft');
          show(latest);
        });
      })); li.append(button); list.append(li);
    }
    q<HTMLElement>('[data-empty]').hidden = values.length !== 0;
    q<HTMLElement>('[data-username]').textContent = session.username;
    workspace.hidden = false; login.hidden = true; q<HTMLElement>('[data-retry]').hidden = true;
    void updateBuildStatus(root, path => client.request(path));
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (file.files?.length) { notice(labels.invalidFile); return; }
    void execute(async () => {
      const saved = await client.mutate(current ? `/api/admin/recommendations/${current.id}` : '/api/admin/recommendations', current ? 'PUT' : 'POST',
        { version: current?.version ?? 0, data: data() });
      if (!isRecommendationDraft(saved)) throw new Error('Invalid saved draft');
      show(saved); await load(); notice(labels.saved);
    });
  });
  q('[data-upload]').addEventListener('click', () => {
    const image = file.files?.[0];
    if (!image || !['image/png', 'image/jpeg'].includes(image.type) || image.size > 2 * 1024 * 1024) { notice(labels.invalidFile); return; }
    void execute(async () => {
      const body = new FormData(); body.append('image', image);
      const result = await client.mutate('/api/admin/recommendation-images', 'POST', body);
      if (!result || typeof result !== 'object' || !('key' in result) || typeof result.key !== 'string' || !/^[0-9a-f]{64}\.png$/.test(result.key)) throw new Error('Invalid image');
      field('imageKey').value = result.key; field('googleBooksId').value = ''; file.value = ''; updatePreview(); notice(labels.uploaded);
    });
  });
  q('[data-remove-image]').addEventListener('click', () => { if (!busy) { field('imageKey').value = ''; field('googleBooksId').value = ''; file.value = ''; updatePreview(); } });
  function searchBooks() {
    const input = q<HTMLInputElement>('[data-book-query]');
    if (!input.reportValidity() || input.value.trim().length < 2) { notice(labels.invalid); return; }
    void execute(async () => {
      const results = parseBookResults(await client.request(`/api/admin/books?q=${encodeURIComponent(input.value.trim())}`));
      const target = q<HTMLElement>('[data-book-results]'); target.replaceChildren();
      q<HTMLElement>('[data-book-results-section]').hidden = false;
      q<HTMLElement>('[data-book-message]').textContent = results.length ? '' : labels.bookEmpty;
      for (const book of results) {
        const li = document.createElement('li');
        if (book.hasCover) {
          const image = document.createElement('img'); image.src = bookCoverUrl(book.volumeId); image.alt = book.title;
          image.width = 128; image.height = 160; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; li.append(image);
        }
        const title = document.createElement('strong'); title.textContent = book.title;
        const metadata = document.createElement('p'); metadata.textContent = [book.authors.join(', '), book.publisher, book.publishedDate].filter(Boolean).join(' · ');
        const link = document.createElement('a'); link.textContent = labels.bookOpen; link.href = bookInfoUrl(book.volumeId); link.target = '_blank'; link.rel = 'noopener noreferrer';
        const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'button secondary';
        choose.textContent = book.hasCover ? labels.bookChoose : labels.bookMissing; choose.disabled = !book.hasCover;
        choose.addEventListener('click', () => { void execute(async () => {
          const selected = parseBookResults([await client.mutate(`/api/admin/books/${book.volumeId}/selection`, 'POST')])[0];
          if (!selected.hasCover || selected.volumeId !== book.volumeId) throw new Error('Invalid book selection');
          field('imageKey').value = ''; field('googleBooksId').value = selected.volumeId; field('category').value = 'BOOKS';
          file.value = ''; updatePreview(); notice(labels.bookSelected);
        }); });
        li.append(title, metadata, link, choose); target.append(li);
      }
      notice('');
    });
  }
  q('[data-search-books]').addEventListener('click', searchBooks);
  q('[data-book-query]').addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') { event.preventDefault(); searchBooks(); } });
  function action(kind: 'select' | 'withdraw' | 'archive') {
    if (!current || busy) return;
    if (dirty()) { notice(labels.unsaved); return; }
    const item = current;
    void execute(async () => {
      const path = `/api/admin/recommendations/${item.id}`;
      if (kind === 'archive') {
        const result = await client.mutate(`${path}/status`, 'PATCH', { version: item.version, status: item.status === 'ARCHIVED' ? 'DRAFT' : 'ARCHIVED' });
        if (!isRecommendationDraft(result)) throw new Error('Invalid draft status');
        current = result;
      } else await client.mutate(`${path}/publication`, kind === 'select' ? 'PUT' : 'DELETE', { version: item.version });
      await load(); show(current); notice(kind === 'select' ? labels.selected : kind === 'withdraw' ? labels.withdrawn : labels.changedStatus);
    });
  }
  for (const kind of ['select', 'withdraw', 'archive'] as const) q(`[data-${kind}]`).addEventListener('click', () => action(kind));
  q('[data-new]').addEventListener('click', () => guard(() => show(null)));
  q('[data-close]').addEventListener('click', () => guard(() => { form.reset(); current = null; preview.removeAttribute('src'); editor.hidden = true; }));
  q('[data-refresh]').addEventListener('click', () => { void execute(async () => { await load(); notice(''); }); });
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
  window.addEventListener('pagehide', () => client.invalidate());
  window.addEventListener('pageshow', event => { if (event.persisted) void execute(async () => { await load(); notice(''); }); });
  window.setInterval(() => {
    if (document.visibilityState !== 'visible' || workspace.hidden || busy) return;
    const version = client.version();
    void client.request('/api/admin/session').then(() => {
      client.assertCurrent(version);
      return updateBuildStatus(root, path => client.request(path));
    }).catch(error);
  }, 30000);
  void execute(async () => { await load(); notice(''); });
}
