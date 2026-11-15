import { AdminClient, AdminRequestError } from '../lib/admin-client';
import { cardEmphases, cardIdentityFields, cardKinds, cardWidths, effectiveSpans, encodeCardSettings, isCardView,
  maxBlocks, maxLines, moveItem, nearestWidth, newBlock, parseStack, spanFraction, stepWidth, widthSpan,
  type CardBlock, type CardKind, type CardSettings, type CardView, type CardWidth } from '../lib/card-admin';
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
  const grid = q<HTMLOListElement>('[data-grid]');
  const editor = q<HTMLElement>('[data-block-editor]');
  const preview = q<HTMLImageElement>('[data-preview]');
  const previewMessage = q<HTMLElement>('[data-preview-message]');
  const discard = q<HTMLDialogElement>('[data-discard]');
  const reload = q<HTMLButtonElement>('[data-reload]');
  let view: CardView | null = null;
  let blocks: CardBlock[] = [];
  let selected: string | null = null;
  let baseline = '';
  let busy = false;
  let loggingOut = false;
  let signedIn = false;
  let pendingDiscard: (() => void) | null = null;
  let previewTimer = 0;
  const client = new AdminClient(clear);
  const notice = (text: string) => { q<HTMLElement>('[data-notice]').textContent = text; };
  const announce = (text: string) => { q<HTMLElement>('[data-announce]').textContent = text; };
  const input = (name: string) => q<HTMLInputElement>(`input[name="${name}"]`);
  const radio = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
  const format = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function clear() {
    view = null; baseline = ''; pendingDiscard = null; blocks = []; selected = null;
    window.clearTimeout(previewTimer);
    form.reset(); grid.replaceChildren(); editor.replaceChildren();
    preview.removeAttribute('src'); previewMessage.textContent = '';
    workspace.hidden = true; login.hidden = false; reload.hidden = true;
    q<HTMLElement>('[data-username]').textContent = '';
    q<HTMLElement>('[data-state]').textContent = '';
    if (discard.open) discard.close();
  }

  function data(): CardSettings {
    const identity = Object.fromEntries(cardIdentityFields.map(field => [field.name, input(field.name).value.trim()]));
    return { theme: radio('theme') as CardSettings['theme'], accent: radio('accent') as CardSettings['accent'],
      ...identity, blocks: structuredClone(blocks) } as CardSettings;
  }

  function fill(settings: CardSettings) {
    for (const field of cardIdentityFields) input(field.name).value = settings[field.name];
    for (const name of ['theme', 'accent'] as const)
      for (const option of root.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) option.checked = option.value === settings[name];
    blocks = structuredClone(settings.blocks);
    if (!blocks.some(block => block.id === selected)) selected = null;
    renderGrid();
    renderEditor();
    markInvalid(null);
    schedulePreview(0);
  }

  function summary(block: CardBlock) {
    if (block.kind === 'TEXT') return block.lines.map(line => line.text).join(' · ');
    if (block.kind === 'STACK') return block.stack.join(', ');
    return labels.kinds[block.kind];
  }

  function renderGrid() {
    const spans = effectiveSpans(blocks);
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('[data-block-id]')?.dataset.blockId : undefined;
    grid.replaceChildren(...blocks.map((block, index) => {
      const item = element('li', 'block-card');
      item.dataset.blockId = block.id;
      item.tabIndex = 0;
      item.style.gridColumn = `span ${spans[index]}`;
      if (block.id === selected) item.setAttribute('aria-current', 'true');
      const width = spans[index] === widthSpan[block.width] ? labels.widths[block.width]
        : `${labels.widths[block.width]} · ${format(labels.stretched, { span: spanFraction(spans[index]!) })}`;
      item.setAttribute('aria-label', `${block.title}, ${labels.kinds[block.kind]}, ${labels.widthLabel} ${width}`);
      const top = element('div', 'block-top');
      const grip = element('span', 'grip', '⠿');
      grip.setAttribute('aria-hidden', 'true');
      const menuButton = element('button', 'block-menu-button', '⋯');
      menuButton.type = 'button';
      menuButton.setAttribute('aria-label', `${labels.blockMenu}: ${block.title}`);
      const menu = element('div', 'block-menu');
      menu.id = `block-menu-${block.id}`;
      menu.popover = 'auto';
      menuButton.setAttribute('popovertarget', menu.id);
      const action = (text: string, name: string, value = '', pressed?: boolean) => {
        const button = element('button', '', text);
        button.type = 'button';
        button.dataset.action = name;
        if (value) button.dataset.value = value;
        if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed));
        return button;
      };
      menu.append(action(labels.moveEarlier, 'move', '-1'), action(labels.moveLater, 'move', '1'), element('hr'),
        ...cardWidths.map(option => action(`${labels.widthLabel} ${labels.widths[option]}`, 'width', option, option === block.width)),
        element('hr'), action(labels.remove, 'remove'));
      top.append(grip, element('span', 'block-kind', labels.kinds[block.kind]), menuButton);
      const resize = element('span', 'resize');
      resize.setAttribute('aria-hidden', 'true');
      resize.title = labels.resize;
      item.append(top, element('span', 'block-title', block.title), element('span', 'block-summary', summary(block)),
        element('span', 'block-width', width), resize, menu);
      return item;
    }));
    if (focused) grid.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
    q<HTMLButtonElement>('[data-add]').disabled = blocks.length >= maxBlocks;
  }

  function field(label: string, control: HTMLElement) {
    const wrapper = element('label', '', label);
    wrapper.append(control);
    return wrapper;
  }

  function textInput(value: string, max: number, path: string, onInput: (value: string) => void) {
    const control = element('input');
    control.value = value;
    control.maxLength = max;
    control.autocomplete = 'off';
    control.dataset.path = path;
    control.addEventListener('input', () => { onInput(control.value); changed(); });
    return control;
  }

  function renderEditor() {
    const index = blocks.findIndex(block => block.id === selected);
    const block = blocks[index];
    if (!block) { editor.replaceChildren(); return; }
    const box = element('div', 'editor-box');
    box.append(element('h3', '', `${labels.selected}: ${labels.kinds[block.kind]}`));
    box.append(field(labels.blockTitle, textInput(block.title, 40, `blocks[${index}].title`, value => { block.title = value; })));
    if (block.kind === 'TEXT') {
      box.append(element('strong', '', labels.lines));
      block.lines.forEach((line, lineIndex) => {
        const row = element('div', 'line-row');
        row.append(field(format(labels.lineText, { n: lineIndex + 1 }),
          textInput(line.text, 60, `blocks[${index}].lines[${lineIndex}]`, value => { line.text = value; })));
        const style = element('select');
        for (const option of cardEmphases) {
          const choice = element('option', '', labels.emphases[option]);
          choice.value = option;
          choice.selected = option === line.emphasis;
          style.append(choice);
        }
        style.addEventListener('change', () => { line.emphasis = style.value as typeof line.emphasis; changed(); });
        row.append(field(labels.emphasis, style));
        const removeLine = element('button', 'icon-button', '✕');
        removeLine.type = 'button';
        removeLine.setAttribute('aria-label', `${labels.removeLine} ${lineIndex + 1}`);
        removeLine.disabled = block.lines.length === 1;
        removeLine.addEventListener('click', () => { block.lines.splice(lineIndex, 1); changed(); renderEditor(); });
        row.append(removeLine);
        box.append(row);
      });
      const addLine = element('button', 'button secondary', `＋ ${labels.addLine}`);
      addLine.type = 'button';
      addLine.disabled = block.lines.length >= maxLines;
      addLine.addEventListener('click', () => {
        block.lines.push({ text: '', emphasis: 'NORMAL' });
        changed();
        renderEditor();
        editor.querySelector<HTMLInputElement>(`[data-path="blocks[${index}].lines[${block.lines.length - 1}]"]`)?.focus();
      });
      box.append(addLine);
    } else if (block.kind === 'STACK') {
      const stack = textInput(block.stack.join(', '), 160, `blocks[${index}].stack`, value => { block.stack = parseStack(value); });
      const wrapper = field(labels.stack, stack);
      wrapper.append(element('small', '', labels.stackHelp));
      box.append(wrapper);
    } else {
      box.append(element('p', 'muted', labels.automatic));
    }
    editor.replaceChildren(box);
  }

  function changed() {
    renderGrid();
    schedulePreview();
  }

  function select(id: string | null, focusEditor = false) {
    selected = id;
    renderGrid();
    renderEditor();
    if (focusEditor) editor.querySelector<HTMLInputElement>('input')?.focus();
  }

  function moveBlock(id: string, to: number, quiet = false) {
    const from = blocks.findIndex(block => block.id === id);
    if (from < 0 || from === to) return;
    blocks = moveItem(blocks, from, to);
    changed();
    renderEditor();
    const block = blocks.find(item => item.id === id)!;
    if (!quiet) announce(format(labels.moved, { title: block.title, position: blocks.indexOf(block) + 1 }));
  }

  function resizeBlock(id: string, width: CardWidth) {
    const block = blocks.find(item => item.id === id);
    if (!block || block.width === width) return;
    block.width = width;
    changed();
    announce(format(labels.resized, { title: block.title, width: labels.widths[width] }));
  }

  function removeBlock(id: string) {
    if (blocks.length <= 1) { announce(labels.lastBlock); notice(labels.lastBlock); return; }
    const index = blocks.findIndex(block => block.id === id);
    const [removed] = blocks.splice(index, 1);
    if (selected === id) selected = null;
    changed();
    renderEditor();
    announce(format(labels.removed, { title: removed?.title ?? '' }));
    grid.querySelector<HTMLElement>('.block-card')?.focus();
  }

  grid.addEventListener('click', event => {
    const target = event.target as Element;
    const item = target.closest<HTMLElement>('[data-block-id]');
    if (!item || busy) return;
    const id = item.dataset.blockId!;
    const button = target.closest<HTMLButtonElement>('button[data-action]');
    if (button) {
      item.querySelector<HTMLElement>('.block-menu')?.hidePopover();
      const index = blocks.findIndex(block => block.id === id);
      if (button.dataset.action === 'move') moveBlock(id, index + Number(button.dataset.value));
      if (button.dataset.action === 'width') resizeBlock(id, button.dataset.value as CardWidth);
      if (button.dataset.action === 'remove') removeBlock(id);
      grid.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`)?.focus();
      return;
    }
    if (target.closest('button, .resize') || suppressClick) return;
    select(id, true);
  });

  grid.addEventListener('keydown', event => {
    const item = (event.target as Element).closest<HTMLElement>('[data-block-id]');
    if (!item || event.target !== item || busy) return;
    const id = item.dataset.blockId!;
    const index = blocks.findIndex(block => block.id === id);
    const block = blocks[index]!;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(id, true); return; }
    if (!event.altKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveBlock(id, index + (event.key === 'ArrowLeft' ? -1 : 1));
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      resizeBlock(id, stepWidth(block.width, event.key === 'ArrowUp' ? 1 : -1));
    }
  });

  let suppressClick = false;
  grid.addEventListener('pointerdown', event => {
    const target = event.target as Element;
    const item = target.closest<HTMLElement>('[data-block-id]');
    if (!item || busy || event.button !== 0 || target.closest('button, .block-menu')) return;
    const id = item.dataset.blockId!;
    const resizing = target.closest('.resize') !== null;
    if (!resizing && event.pointerType !== 'mouse' && !target.closest('.grip')) return;
    const startX = event.clientX, startY = event.clientY;
    let active = false;
    const column = (grid.getBoundingClientRect().width + parseFloat(getComputedStyle(grid).columnGap)) / 6;
    const handle = target.closest<HTMLElement>('.resize');
    const move = (moveEvent: PointerEvent) => {
      if (!active && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 6) return;
      active = true;
      moveEvent.preventDefault();
      if (resizing) {
        handle?.classList.add('active');
        const current = grid.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`);
        if (!current) return;
        const span = (moveEvent.clientX - current.getBoundingClientRect().left) / column;
        resizeBlock(id, nearestWidth(span));
        grid.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"] .resize`)?.classList.add('active');
        return;
      }
      grid.querySelector(`[data-block-id="${CSS.escape(id)}"]`)?.classList.add('dragging');
      const over = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>('[data-block-id]');
      if (!over || over.dataset.blockId === id) return;
      const box = over.getBoundingClientRect();
      const overIndex = blocks.findIndex(block => block.id === over.dataset.blockId);
      const from = blocks.findIndex(block => block.id === id);
      const after = moveEvent.clientX > box.left + box.width / 2;
      let to = overIndex + (after ? 1 : 0);
      if (from < to) to--;
      moveBlock(id, to, true);
      grid.querySelector(`[data-block-id="${CSS.escape(id)}"]`)?.classList.add('dragging');
    };
    const end = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      grid.querySelector('.dragging')?.classList.remove('dragging');
      grid.querySelector('.resize.active')?.classList.remove('active');
      if (active) {
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; }, 0);
        const block = blocks.find(item => item.id === id);
        if (block && !resizing) announce(format(labels.moved, { title: block.title, position: blocks.indexOf(block) + 1 }));
      }
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  });

  q<HTMLButtonElement>('[data-add]').addEventListener('click', () => {
    if (busy) return;
    if (blocks.length >= maxBlocks) { notice(labels.limit); return; }
    const kind = q<HTMLSelectElement>('[data-add-kind]').value as CardKind;
    if (!cardKinds.includes(kind)) return;
    const block = newBlock(kind, blocks, labels.kindTitles[kind]);
    blocks.push(block);
    announce(labels.added);
    select(block.id, true);
    schedulePreview();
  });

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

  function markInvalid(path: string | null) {
    for (const node of root.querySelectorAll('[aria-invalid]')) node.removeAttribute('aria-invalid');
    if (!path) return;
    const block = /^blocks\[(\d+)\]/.exec(path);
    if (block) {
      const target = blocks[Number(block[1])];
      if (target && target.id !== selected) select(target.id);
      const control = editor.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`)
        ?? grid.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(target?.id ?? '')}"]`);
      if (control) { control.setAttribute('aria-invalid', 'true'); control.focus(); }
      return;
    }
    const control = root.querySelector<HTMLInputElement>(`input[name="${CSS.escape(path)}"]`);
    if (control) { control.setAttribute('aria-invalid', 'true'); control.focus(); }
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
      return typeof field === 'string' && /^[A-Za-z]{1,30}(\[\d{1,2}\](\.[A-Za-z]{1,10}(\[\d{1,2}\])?)?)?$/.test(field) ? field : null;
    } catch { return null; }
  }

  preview.addEventListener('error', () => {
    if (workspace.hidden || !preview.getAttribute('src')) return;
    previewMessage.textContent = labels.previewError;
    void invalidField(preview.src).then(path => { if (path && path !== 'settings') markInvalid(path); });
  });
  preview.addEventListener('load', () => {
    previewMessage.textContent = '';
    for (const node of root.querySelectorAll('[aria-invalid]')) node.removeAttribute('aria-invalid');
  });

  function error(cause: unknown) {
    if (cause instanceof AdminRequestError && cause.status === 409) { notice(labels.conflict); reload.hidden = false; return; }
    if (cause instanceof AdminRequestError && cause.status === 400) {
      notice(labels.invalid);
      void invalidField().then(markInvalid);
      return;
    }
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
    const next = await client.request('/api/admin/profile-card');
    if (!isCardView(next)) throw new Error('Invalid card settings');
    client.assertCurrent(version);
    q<HTMLElement>('[data-username]').textContent = session.username;
    workspace.hidden = false; login.hidden = true; q<HTMLElement>('[data-retry]').hidden = true;
    signedIn = true;
    showView(next);
  }

  form.addEventListener('input', event => { if (!editor.contains(event.target as Node)) schedulePreview(); });
  form.addEventListener('change', event => { if (!editor.contains(event.target as Node)) schedulePreview(); });
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
