import { clearBuildStatus, updateBuildStatus } from '../lib/publication-status';
import { AdminClient, AdminRequestError } from '../lib/admin-client';
import { isRecommendationDraft, isRecommendationSection, isRecommendationSummary, reorder,
  type RecommendationDraft, type RecommendationSection, type RecommendationSummary } from '../lib/recommendation-admin';
import type { RecommendationAdminLabels } from '../i18n/recommendation-admin';
import { bookGroups, linkHost, starFill, type BookGroup, type SectionKind } from '../lib/recommendations';
import { bookCoverUrl, bookInfoUrl, parseBookResults } from '../lib/google-books';
import { sortable } from '../lib/sortable';

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
  const container = q<HTMLElement>('[data-sections]');
  const sectionDialog = q<HTMLDialogElement>('[data-section-dialog]');
  const sectionForm = q<HTMLFormElement>('[data-section-form]');
  const itemDialog = q<HTMLDialogElement>('[data-item-dialog]');
  const itemForm = q<HTMLFormElement>('[data-item-form]');
  const preview = q<HTMLImageElement>('[data-preview]');
  const file = q<HTMLInputElement>('[data-file]');
  const discard = q<HTMLDialogElement>('[data-discard]');
  const confirmDialog = q<HTMLDialogElement>('[data-confirm]');
  const itemMessage = q<HTMLElement>('[data-item-message]');
  let sections: RecommendationSection[] = [];
  let drafts: RecommendationDraft[] = [];
  let publications: RecommendationSummary[] = [];
  let deployed: RecommendationSummary[] = [];
  let current: RecommendationDraft | null = null;
  let currentSection: RecommendationSection | null = null;
  let editingSection: RecommendationSection | null = null;
  let newKind: SectionKind = 'BOOKS';
  let baseline = '';
  let busy = false;
  let loggingOut = false;
  let pendingDiscard: (() => void) | null = null;
  const client = new AdminClient(clear);
  const notice = (text: string) => { q<HTMLElement>('[data-notice]').textContent = text; };
  const field = <T extends HTMLInputElement | HTMLTextAreaElement>(form: HTMLFormElement, name: string) =>
    form.querySelector<T>(`[name="${name}"]`)!;
  const checked = (name: string) => itemForm.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function clear() {
    clearBuildStatus(root);
    sections = []; drafts = []; publications = []; deployed = []; current = null; currentSection = null; editingSection = null;
    baseline = ''; pendingDiscard = null;
    container.replaceChildren(); itemForm.reset(); sectionForm.reset(); file.value = '';
    for (const dialog of [sectionDialog, itemDialog, discard, confirmDialog]) if (dialog.open) dialog.close();
    workspace.hidden = true; login.hidden = false;
    q<HTMLElement>('[data-username]').textContent = '';
  }

  function error(cause: unknown, target: (text: string) => void = notice) {
    target(cause instanceof AdminRequestError
      ? cause.status === 401 || cause.status === 403 ? labels.expired
      : cause.status === 409 ? labels.conflict : cause.status === 400 || cause.status === 413 ? labels.invalid
        : cause.status === 503 ? labels.bookUnavailable : cause.status === 429 ? labels.bookWait : labels.error
      : labels.error);
  }

  function state(item: RecommendationDraft): { text: string; tone: string } {
    if (item.status === 'ARCHIVED') return { text: labels.statusArchived, tone: 'draft' };
    const selected = publications.find(value => value.recommendationId === item.id);
    if (!selected) return { text: labels.statusDraft, tone: 'draft' };
    if (!deployed.some(value => value.recommendationId === item.id && value.revision === selected.revision))
      return { text: labels.statusPending, tone: 'pending' };
    return selected.draftVersion === item.version ? { text: labels.statusLive, tone: 'live' } : { text: labels.statusChanges, tone: 'changes' };
  }

  function thumbnail(item: RecommendationDraft) {
    const box = element('div', 'thumb');
    const source = item.data.googleBooksId ? bookCoverUrl(item.data.googleBooksId)
      : item.data.imageKey ? `/api/admin/recommendation-images/${encodeURIComponent(item.data.imageKey)}` : '';
    if (source) {
      const image = element('img');
      image.src = source; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
      box.append(image);
    }
    return box;
  }

  function itemCard(item: RecommendationDraft, section: RecommendationSection) {
    const li = element('li', `rec-item${item.status === 'ARCHIVED' ? ' archived' : ''}`);
    li.dataset.itemId = String(item.id);
    li.tabIndex = 0;
    const status = state(item);
    const badge = element('span', 'status-badge', status.text);
    badge.dataset.tone = status.tone;
    const top = element('span', 'inline');
    const grip = element('span', 'grip', '⠿');
    grip.setAttribute('aria-hidden', 'true');
    top.append(grip, badge);
    li.append(top, thumbnail(item), element('strong', '', item.data[locale].title || item.data.slug));
    if (section.data.kind === 'BOOKS' && item.data.rating > 0) {
      const stars = element('span', 'stars', '★'.repeat(item.data.rating) + '☆'.repeat(5 - item.data.rating));
      stars.setAttribute('aria-label', labels.ratingValue.replace('{n}', String(item.data.rating)));
      li.append(stars);
    }
    if (item.data.subtitle) li.append(element('small', '', item.data.subtitle));
    const open = () => guard(() => { void execute(async () => {
      const latest = await client.request(`/api/admin/recommendations/${item.id}`);
      if (!isRecommendationDraft(latest)) throw new Error('Invalid draft');
      openItem(latest, section);
    }); });
    li.addEventListener('click', open);
    li.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); open(); } });
    return li;
  }

  function itemList(section: RecommendationSection, items: RecommendationDraft[], group: BookGroup | null) {
    const list = element('ul', 'items');
    list.dataset.sectionId = String(section.id);
    if (group) list.dataset.group = group;
    for (const item of items) list.append(itemCard(item, section));
    sortable(list, { item: '.rec-item', handle: '.grip', onDrop: () => void saveItemOrder(section) });
    return list;
  }

  function sectionMenu(section: RecommendationSection, index: number) {
    const wrapper = element('span', 'section-actions');
    const edit = element('button', 'button secondary', labels.editSection);
    edit.type = 'button';
    edit.addEventListener('click', () => openSection(section));
    const more = element('button', 'button secondary more-button', '⋯');
    more.type = 'button';
    more.setAttribute('aria-label', `${labels.more}: ${section.data[locale].title}`);
    const menu = element('div', 'more-menu');
    menu.id = `section-menu-${section.id}`;
    menu.popover = 'auto';
    more.setAttribute('popovertarget', menu.id);
    const action = (text: string, run: () => void, disabled = false) => {
      const button = element('button', '', text);
      button.type = 'button';
      button.disabled = disabled;
      button.addEventListener('click', () => { menu.hidePopover(); run(); });
      return button;
    };
    menu.append(
      action(labels.moveUp, () => void saveSectionOrder(reorder(sections.map(value => value.id), section.id, index - 1)), index === 0),
      action(labels.moveDown, () => void saveSectionOrder(reorder(sections.map(value => value.id), section.id, index + 1)), index === sections.length - 1),
      action(labels.deleteSection, () => void deleteSection(section)));
    wrapper.append(edit, more, menu);
    return wrapper;
  }

  function render() {
    q<HTMLElement>('[data-empty]').hidden = sections.length > 0;
    container.replaceChildren(...sections.map((section, index) => {
      const article = element('article', 'rec-section');
      article.dataset.sectionId = String(section.id);
      const head = element('div', 'section-head');
      const grip = element('span', 'grip', '⠿');
      grip.setAttribute('aria-hidden', 'true');
      const items = drafts.filter(item => item.data.sectionId === section.id);
      head.append(grip, element('h2', '', section.data[locale].title),
        element('span', 'kind-badge', section.data.kind === 'BOOKS' ? labels.modelBooks
          : section.data.kind === 'LINK' ? labels.modelLink : labels.modelItems),
        element('small', 'muted', String(items.length)), sectionMenu(section, index));
      article.append(head);
      if (section.data.kind === 'LINK') {
        const link = element('a', 'link-target', labels.linkCard.replace('{host}', linkHost(section.data.url)));
        link.href = section.data.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        article.append(link);
        return article;
      }
      if (section.data.kind === 'BOOKS') {
        const groups = element('div', 'groups');
        for (const group of bookGroups) {
          const box = element('div', 'group');
          box.append(element('h3', '', group === 'TECHNICAL' ? labels.technical : labels.nonTechnical),
            itemList(section, items.filter(item => item.data.bookGroup === group), group));
          groups.append(box);
        }
        const ungrouped = items.filter(item => !item.data.bookGroup);
        if (ungrouped.length) groups.append(itemList(section, ungrouped, null));
        article.append(groups);
      } else {
        const box = element('div', 'group');
        box.append(itemList(section, items, null));
        article.append(box);
      }
      if (!items.length) article.append(element('p', 'empty-items', labels.noItems));
      const add = element('button', 'button secondary add-item', `＋ ${section.data.kind === 'BOOKS' ? labels.addBook : labels.addItem}`);
      add.type = 'button';
      add.addEventListener('click', () => guard(() => openItem(null, section)));
      article.append(add);
      return article;
    }));
  }

  async function saveItemOrder(section: RecommendationSection) {
    const article = container.querySelector<HTMLElement>(`[data-section-id="${section.id}"]`);
    if (!article) return;
    const ids = [...article.querySelectorAll<HTMLElement>('.rec-item')].map(item => Number(item.dataset.itemId));
    await execute(async () => {
      const result = await client.mutate('/api/admin/recommendations/order', 'PUT', { sectionId: section.id, ids });
      if (!Array.isArray(result) || !result.every(isRecommendationDraft)) throw new Error('Invalid order');
      drafts = result; await refreshPublications(); render(); notice(labels.reordered);
    });
  }

  async function saveSectionOrder(ids: number[]) {
    await execute(async () => {
      const result = await client.mutate('/api/admin/recommendation-sections/order', 'PUT', { ids });
      if (!Array.isArray(result) || !result.every(isRecommendationSection)) throw new Error('Invalid order');
      sections = result; render(); notice(labels.reordered);
    });
  }

  sortable(container, { item: '.rec-section', handle: '.section-head', handleOnly: true, ignore: 'button, .more-menu', axis: 'y',
    onDrop: (_, order) => void saveSectionOrder(order.map(node => Number(node.dataset.sectionId))) });

  function confirmAction(title: string, body: string, action: string): Promise<boolean> {
    q<HTMLElement>('[data-confirm-title]').textContent = title;
    q<HTMLElement>('[data-confirm-body]').textContent = body;
    const ok = q<HTMLButtonElement>('[data-confirm-ok]');
    ok.textContent = action;
    return new Promise(resolve => {
      const finish = (value: boolean) => {
        ok.removeEventListener('click', accept);
        confirmDialog.removeEventListener('close', cancel);
        if (confirmDialog.open) confirmDialog.close();
        resolve(value);
      };
      const accept = () => finish(true);
      const cancel = () => finish(false);
      ok.addEventListener('click', accept);
      confirmDialog.addEventListener('close', cancel);
      confirmDialog.showModal();
    });
  }
  q('[data-confirm-cancel]').addEventListener('click', () => confirmDialog.close());

  function kindName(kind: SectionKind) {
    return kind === 'BOOKS' ? labels.newBooks : kind === 'LINK' ? labels.newLink : labels.newItems;
  }

  function openSection(section: RecommendationSection | null, kind: SectionKind = 'BOOKS') {
    editingSection = section;
    newKind = section?.data.kind ?? kind;
    sectionForm.reset();
    for (const node of sectionForm.querySelectorAll('[aria-invalid]')) node.removeAttribute('aria-invalid');
    q<HTMLElement>('[data-section-heading]').textContent = kindName(newKind);
    q<HTMLElement>('[data-link-only]').hidden = newKind !== 'LINK';
    field(sectionForm, 'ptTitle').value = section?.data.pt.title ?? '';
    field(sectionForm, 'enTitle').value = section?.data.en.title ?? '';
    field(sectionForm, 'ptDescription').value = section?.data.pt.description ?? '';
    field(sectionForm, 'enDescription').value = section?.data.en.description ?? '';
    field(sectionForm, 'sectionUrl').value = section?.data.url ?? '';
    sectionDialog.showModal();
    field(sectionForm, 'ptTitle').focus();
  }

  sectionForm.addEventListener('submit', event => {
    event.preventDefault();
    const pt = field(sectionForm, 'ptTitle'), en = field(sectionForm, 'enTitle');
    const url = field<HTMLInputElement>(sectionForm, 'sectionUrl');
    const required = newKind === 'LINK' ? [pt, en, url] : [pt, en];
    let invalid: HTMLInputElement | null = null;
    for (const input of required as HTMLInputElement[]) {
      const empty = !input.value.trim() || (input === url && !/^https:\/\/[^\s]+$/.test(input.value.trim()));
      input.toggleAttribute('aria-invalid', empty);
      if (empty) input.setAttribute('aria-invalid', 'true');
      invalid ??= empty ? input : null;
    }
    if (invalid) { invalid.focus(); return; }
    const target = editingSection;
    void execute(async () => {
      const body = { version: target?.version ?? 0, data: { kind: newKind,
        en: { title: en.value.trim(), description: field(sectionForm, 'enDescription').value.trim() },
        pt: { title: pt.value.trim(), description: field(sectionForm, 'ptDescription').value.trim() },
        slug: target?.data.slug ?? '', url: newKind === 'LINK' ? url.value.trim() : '' } };
      const saved = await client.mutate(target ? `/api/admin/recommendation-sections/${target.id}` : '/api/admin/recommendation-sections',
        target ? 'PUT' : 'POST', body);
      if (!isRecommendationSection(saved)) throw new Error('Invalid section');
      sectionDialog.close();
      await load();
      notice(labels.sectionSaved);
    });
  });
  q('[data-section-cancel]').addEventListener('click', () => sectionDialog.close());
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-new-section]'))
    button.addEventListener('click', () => openSection(null, (button.dataset.newSection as SectionKind) ?? 'BOOKS'));

  async function deleteSection(section: RecommendationSection) {
    if (drafts.some(item => item.data.sectionId === section.id)) { notice(labels.sectionNotEmpty); return; }
    if (!await confirmAction(labels.confirmDeleteTitle, labels.confirmDeleteBody, labels.deleteSection)) return;
    await execute(async () => {
      await client.mutate(`/api/admin/recommendation-sections/${section.id}`, 'DELETE', { version: section.version });
      await load(); notice(labels.sectionDeleted);
    });
  }

  function isBook() { return currentSection?.data.kind === 'BOOKS'; }

  function itemData() {
    const title = field(itemForm, 'title').value.trim();
    const copy = (language: 'en' | 'pt') => ({ title, description: field(itemForm, `${language}Description`).value.trim(), imageAlt: '' });
    return {
      slug: current?.data.slug ?? '', sectionId: currentSection?.id ?? 0,
      imageKey: field(itemForm, 'imageKey').value, googleBooksId: field(itemForm, 'googleBooksId').value,
      url: field(itemForm, 'url').value.trim(), subtitle: field(itemForm, 'subtitle').value.trim(),
      rating: isBook() ? Number(checked('rating') || 0) : 0,
      bookGroup: isBook() ? (checked('bookGroup') || null) : null,
      readIn: isBook() ? (checked('readIn') || null) : null,
      en: copy('en'), pt: copy('pt'),
    };
  }

  const dirty = () => itemDialog.open && JSON.stringify(itemData()) !== baseline;

  function guard(action: () => void) {
    if (busy) return;
    if (!dirty()) { action(); return; }
    pendingDiscard = action; discard.showModal();
  }

  function paintStars() {
    const rating = Number(checked('rating') || 0);
    for (const star of itemForm.querySelectorAll<HTMLElement>('[data-star]')) {
      star.classList.remove('full', 'half', 'empty');
      star.classList.add(starFill(rating, Number(star.dataset.star)));
    }
    const value = itemForm.querySelector<HTMLOutputElement>('[data-star-value]');
    if (value) value.value = rating ? rating.toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US') : '';
  }

  function updatePreview() {
    const key = field(itemForm, 'imageKey').value;
    const book = field(itemForm, 'googleBooksId').value;
    const source = q<HTMLAnchorElement>('[data-book-source]');
    source.hidden = !book;
    if (book) { preview.src = bookCoverUrl(book); source.href = bookInfoUrl(book); }
    else if (/^[0-9a-f]{64}\.png$/.test(key)) { preview.src = `/api/admin/recommendation-images/${encodeURIComponent(key)}`; source.removeAttribute('href'); }
    else preview.removeAttribute('src');
    preview.hidden = !key && !book;
    q<HTMLElement>('[data-preview-empty]').hidden = !preview.hidden;
  }

  function openItem(item: RecommendationDraft | null, section: RecommendationSection) {
    current = item; currentSection = section;
    itemForm.reset(); file.value = ''; itemMessage.textContent = '';
    for (const node of itemForm.querySelectorAll('[aria-invalid]')) node.removeAttribute('aria-invalid');
    q<HTMLElement>('[data-book-results]').replaceChildren();
    q<HTMLElement>('[data-book-results-section]').hidden = true;
    const book = section.data.kind === 'BOOKS';
    for (const node of itemForm.querySelectorAll<HTMLElement>('[data-book-only]')) node.hidden = !book;
    q<HTMLElement>('[data-item-heading]').textContent = `${book ? labels.bookDialog : labels.itemDialog} · ${section.data[locale].title}`;
    q<HTMLElement>('[data-title-label]').textContent = book ? labels.bookTitle : labels.itemName;
    q<HTMLElement>('[data-subtitle-label]').textContent = book ? labels.author : labels.brand;
    q<HTMLElement>('[data-image-label]').textContent = book ? labels.cover : labels.photo;
    if (item) {
      field(itemForm, 'title').value = item.data[locale].title || item.data.en.title || item.data.pt.title;
      field(itemForm, 'subtitle').value = item.data.subtitle;
      field(itemForm, 'enDescription').value = item.data.en.description;
      field(itemForm, 'ptDescription').value = item.data.pt.description;
      field(itemForm, 'url').value = item.data.url;
      field(itemForm, 'imageKey').value = item.data.imageKey;
      field(itemForm, 'googleBooksId').value = item.data.googleBooksId ?? '';
      for (const radio of itemForm.querySelectorAll<HTMLInputElement>('input[name="rating"]')) radio.checked = Number(radio.value) === item.data.rating;
      for (const radio of itemForm.querySelectorAll<HTMLInputElement>('input[name="bookGroup"]')) radio.checked = radio.value === item.data.bookGroup;
      for (const radio of itemForm.querySelectorAll<HTMLInputElement>('input[name="readIn"]')) radio.checked = radio.value === (item.data.readIn ?? '');
    }
    const status = item ? state(item) : { text: labels.statusDraft, tone: 'draft' };
    const badge = q<HTMLElement>('[data-item-status]');
    badge.textContent = status.text; badge.dataset.tone = status.tone;
    const selected = !!item && publications.some(value => value.recommendationId === item.id);
    q<HTMLButtonElement>('[data-item-withdraw]').hidden = !selected;
    q<HTMLButtonElement>('[data-item-archive]').hidden = !item;
    q<HTMLElement>('[data-item-archive]').textContent = item?.status === 'ARCHIVED' ? labels.restore : labels.archive;
    q<HTMLButtonElement>('[data-item-publish]').hidden = item?.status === 'ARCHIVED';
    paintStars(); updatePreview();
    baseline = JSON.stringify(itemData());
    if (!itemDialog.open) itemDialog.showModal();
    (book && !item ? q<HTMLInputElement>('[data-book-query]') : field(itemForm, 'title')).focus();
  }

  function closeItem() {
    try { q<HTMLElement>('[data-item-more]').hidePopover(); } catch {}
    itemDialog.close(); current = null; currentSection = null;
  }

  function validateItem() {
    const checks: [Element | null, boolean][] = [[field(itemForm, 'title'), !field(itemForm, 'title').value.trim()]];
    if (isBook()) {
      checks.push([itemForm.querySelector('.stars'), !checked('rating')]);
      checks.push([itemForm.querySelector('.group-choice'), !checked('bookGroup')]);
    }
    for (const [node, invalid] of checks) node?.toggleAttribute('aria-invalid', invalid);
    const first = checks.find(([, invalid]) => invalid)?.[0];
    if (first) { (first.querySelector('input') ?? first as HTMLElement).focus(); itemMessage.textContent = labels.invalid; return false; }
    return true;
  }

  itemForm.addEventListener('submit', event => {
    event.preventDefault();
    const publish = (event as SubmitEvent).submitter === q('[data-item-publish]');
    if (!validateItem() || !currentSection) return;
    const target = current;
    void execute(async () => {
      const saved = await client.mutate(target ? `/api/admin/recommendations/${target.id}` : '/api/admin/recommendations',
        target ? 'PUT' : 'POST', { version: target?.version ?? 0, data: itemData() });
      if (!isRecommendationDraft(saved)) throw new Error('Invalid saved draft');
      current = saved; baseline = JSON.stringify(itemData());
      if (publish) {
        try {
          await client.mutate(`/api/admin/recommendations/${saved.id}/publication`, 'PUT', { version: saved.version });
        } catch (cause) {
          await load();
          if (cause instanceof AdminRequestError && cause.status === 400) { itemMessage.textContent = labels.incomplete; return; }
          throw cause;
        }
      }
      await load();
      closeItem();
      notice(publish ? labels.published : labels.saved);
    }, text => { itemMessage.textContent = text; });
  });

  q('[data-item-withdraw]').addEventListener('click', async () => {
    try { q<HTMLElement>('[data-item-more]').hidePopover(); } catch {}
    const item = current;
    if (!item || !await confirmAction(labels.confirmWithdrawTitle, labels.confirmWithdrawBody, labels.withdraw)) return;
    void execute(async () => {
      await client.mutate(`/api/admin/recommendations/${item.id}/publication`, 'DELETE', { version: item.version });
      await load(); closeItem(); notice(labels.withdrawn);
    }, text => { itemMessage.textContent = text; });
  });
  q('[data-item-archive]').addEventListener('click', () => {
    try { q<HTMLElement>('[data-item-more]').hidePopover(); } catch {}
    const item = current;
    if (!item) return;
    void execute(async () => {
      const result = await client.mutate(`/api/admin/recommendations/${item.id}/status`, 'PATCH',
        { version: item.version, status: item.status === 'ARCHIVED' ? 'DRAFT' : 'ARCHIVED' });
      if (!isRecommendationDraft(result)) throw new Error('Invalid status');
      await load(); closeItem(); notice(result.status === 'ARCHIVED' ? labels.archived : labels.restored);
    }, text => { itemMessage.textContent = text; });
  });
  q('[data-item-discard]').addEventListener('click', () => { closeItem(); });
  q('[data-item-close]').addEventListener('click', () => guard(closeItem));
  itemDialog.addEventListener('cancel', event => { event.preventDefault(); guard(closeItem); });
  itemForm.addEventListener('change', event => {
    const target = event.target as HTMLInputElement;
    if (target.name === 'rating') paintStars();
    if (target.name === 'rating' || target.name === 'bookGroup') target.closest('[aria-invalid]')?.removeAttribute('aria-invalid');
  });

  file.addEventListener('change', () => {
    const image = file.files?.[0];
    if (!image) return;
    if (!['image/png', 'image/jpeg'].includes(image.type) || image.size > 2 * 1024 * 1024) {
      itemMessage.textContent = labels.invalidFile; file.value = ''; return;
    }
    itemMessage.textContent = labels.uploading;
    void execute(async () => {
      const body = new FormData(); body.append('image', image);
      const result = await client.mutate('/api/admin/recommendation-images', 'POST', body);
      if (!result || typeof result !== 'object' || !('key' in result) || typeof result.key !== 'string' || !/^[0-9a-f]{64}\.png$/.test(result.key)) throw new Error('Invalid image');
      field(itemForm, 'imageKey').value = result.key; field(itemForm, 'googleBooksId').value = ''; file.value = ''; updatePreview();
      itemMessage.textContent = labels.uploaded;
    }, text => { itemMessage.textContent = text; });
  });
  q('[data-remove-image]').addEventListener('click', () => {
    if (busy) return;
    field(itemForm, 'imageKey').value = ''; field(itemForm, 'googleBooksId').value = ''; file.value = ''; updatePreview();
  });

  function searchBooks() {
    const input = q<HTMLInputElement>('[data-book-query]');
    if (input.value.trim().length < 2) { input.focus(); return; }
    void execute(async () => {
      const results = parseBookResults(await client.request(`/api/admin/books?q=${encodeURIComponent(input.value.trim())}`));
      const target = q<HTMLElement>('[data-book-results]'); target.replaceChildren();
      q<HTMLElement>('[data-book-results-section]').hidden = false;
      q<HTMLElement>('[data-book-message]').textContent = results.length ? '' : labels.bookEmpty;
      for (const book of results) {
        const li = element('li');
        if (book.hasCover) {
          const image = element('img'); image.src = bookCoverUrl(book.volumeId); image.alt = '';
          image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; li.append(image);
        }
        li.append(element('strong', '', book.title), element('span', 'muted', book.authors.join(', ')));
        const choose = element('button', 'button secondary', book.hasCover ? labels.bookChoose : labels.bookMissing);
        choose.type = 'button'; choose.disabled = !book.hasCover;
        choose.addEventListener('click', () => { void execute(async () => {
          const selected = parseBookResults([await client.mutate(`/api/admin/books/${book.volumeId}/selection`, 'POST')])[0];
          if (!selected?.hasCover || selected.volumeId !== book.volumeId) throw new Error('Invalid book selection');
          field(itemForm, 'imageKey').value = ''; field(itemForm, 'googleBooksId').value = selected.volumeId;
          field(itemForm, 'title').value = selected.title.slice(0, 150);
          if (selected.authors.length) field(itemForm, 'subtitle').value = selected.authors.join(', ').slice(0, 150);
          file.value = ''; updatePreview();
          q<HTMLElement>('[data-book-results-section]').hidden = true;
          itemMessage.textContent = labels.bookSelected;
          field(itemForm, 'title').removeAttribute('aria-invalid');
        }, text => { itemMessage.textContent = text; }); });
        li.append(choose); target.append(li);
      }
    }, text => { q<HTMLElement>('[data-book-message]').textContent = text; q<HTMLElement>('[data-book-results-section]').hidden = false; });
  }
  q('[data-search-books]').addEventListener('click', searchBooks);
  q('[data-book-query]').addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') { event.preventDefault(); searchBooks(); } });

  async function execute(action: () => Promise<void>, target: (text: string) => void = notice) {
    if (busy) return;
    busy = true;
    const version = client.version();
    try { await action(); } catch (cause) { if (version === client.version() || workspace.hidden) error(cause, target); }
    finally { busy = false; }
  }

  async function refreshPublications() {
    const selected = await client.request('/api/admin/recommendation-publications');
    if (!Array.isArray(selected) || !selected.every(isRecommendationSummary)) throw new Error('Invalid publications');
    publications = selected;
    let manifest: RecommendationSummary[] = [];
    try {
      const response = await fetch('/recommendation-publications.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const value = await response.json();
        if (value?.schemaVersion === 1 && Array.isArray(value.recommendations) && value.recommendations.every(isRecommendationSummary)) manifest = value.recommendations;
      }
    } catch {}
    deployed = manifest;
  }

  async function load() {
    const version = client.version();
    const session = await client.request('/api/admin/session');
    if (!session || typeof session !== 'object' || !('username' in session) || typeof session.username !== 'string') throw new Error('Invalid session');
    const nextSections = await client.request('/api/admin/recommendation-sections');
    const nextDrafts = await client.request('/api/admin/recommendations');
    if (!Array.isArray(nextSections) || !nextSections.every(isRecommendationSection)
      || !Array.isArray(nextDrafts) || nextDrafts.length > 500 || !nextDrafts.every(isRecommendationDraft)) throw new Error('Invalid recommendations');
    await refreshPublications();
    client.assertCurrent(version);
    sections = nextSections; drafts = nextDrafts;
    render();
    q<HTMLElement>('[data-username]').textContent = session.username;
    workspace.hidden = false; login.hidden = true; q<HTMLElement>('[data-retry]').hidden = true;
    void updateBuildStatus(root, path => client.request(path));
  }

  q('[data-retry]').addEventListener('click', () => { void execute(async () => { await load(); notice(''); }); });
  q('[data-keep]').addEventListener('click', () => { pendingDiscard = null; discard.close(); });
  q('[data-confirm-discard]').addEventListener('click', () => { const action = pendingDiscard; pendingDiscard = null; discard.close(); action?.(); });
  discard.addEventListener('cancel', () => { pendingDiscard = null; });
  q('[data-logout]').addEventListener('click', () => {
    if (loggingOut) return;
    loggingOut = true;
    client.invalidate();
    void client.mutate('/api/auth/logout', 'POST').then(() => notice('')).catch(cause => error(cause)).finally(() => {
      client.invalidate(); loggingOut = false;
    });
  });
  window.addEventListener('beforeunload', event => { if (dirty()) event.preventDefault(); });
  window.addEventListener('pagehide', () => client.invalidate());
  window.addEventListener('pageshow', event => { if (event.persisted) void execute(async () => { await load(); notice(''); }); });
  window.setInterval(() => {
    if (document.visibilityState !== 'visible' || workspace.hidden || busy) return;
    const version = client.version();
    void client.request('/api/admin/session').then(() => {
      client.assertCurrent(version);
      return updateBuildStatus(root, path => client.request(path));
    }).catch(cause => error(cause));
  }, 30000);
  void execute(async () => { await load(); notice(''); });
}
