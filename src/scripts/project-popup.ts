/**
 * Project popups (components/ProjectPopup.astro).
 *
 * - A click on a card link marked [data-pop] opens its dialog; with a modifier key, or without
 *   JavaScript, the link opens the project page as usual.
 * - Opening and closing are animated in CSS; closing waits for the animation (Esc, a click on the
 *   backdrop or the hidden close button), unless reduced motion is on.
 * - Folders open inside the popup: their contents come live from the GitHub contents API (validated
 *   like the build snapshot), with a Back button; the root list is the one rendered at build time.
 */
import { GITHUB_USER, fromGitHubContents, type TreeEntry } from '../lib/github-data';

const MAX = 8;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const cache = new Map<string, TreeEntry[]>();

const extIcon = 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6';
const folderIcon = 'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z';
const fileIcon = 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Zm-1 0v5h6';
const SVG = 'http://www.w3.org/2000/svg';

function icon(path: string, className: string) {
	const svg = document.createElementNS(SVG, 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('aria-hidden', 'true');
	if (className) svg.setAttribute('class', className);
	const p = document.createElementNS(SVG, 'path');
	p.setAttribute('d', path);
	svg.append(p);
	return svg;
}

/** Rows built the same way as the server-rendered ones, so they share the component styles. */
function row(entry: TreeEntry, path: string, openLabel: string) {
	const item = document.createElement('div');
	item.className = 'row';
	item.setAttribute('role', 'listitem');
	const open = document.createElement(entry.kind === 'dir' ? 'button' : 'a');
	open.className = 'open';
	if (open instanceof HTMLButtonElement) {
		open.type = 'button';
		open.dataset.dir = path ? `${path}/${entry.name}` : entry.name;
	} else {
		(open as HTMLAnchorElement).href = entry.url;
	}
	open.append(icon(entry.kind === 'dir' ? folderIcon : fileIcon, entry.kind === 'dir' ? 'icon dir' : 'icon'));
	const name = document.createElement('span');
	name.textContent = entry.name;
	open.append(name);
	const ext = document.createElement('a');
	ext.className = 'ext';
	ext.href = entry.url;
	ext.setAttribute('aria-label', `${openLabel}: ${entry.name}`);
	ext.append(icon(extIcon, ''));
	item.append(open, ext);
	return item;
}

async function contents(repo: string, path: string): Promise<TreeEntry[] | null> {
	const key = `${repo}/${path}`;
	const hit = cache.get(key);
	if (hit) return hit;
	try {
		const url = `https://api.github.com/repos/${GITHUB_USER}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
		const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
		if (!response.ok) return null;
		const entries = fromGitHubContents(await response.json());
		if (entries) cache.set(key, entries);
		return entries;
	} catch {
		return null;
	}
}

function setup(dialog: HTMLDialogElement) {
	const files = dialog.querySelector<HTMLElement>('[data-files]');
	const back = dialog.querySelector<HTMLButtonElement>('[data-back]');
	const view = dialog.querySelector<HTMLAnchorElement>('[data-view]');
	const rootNodes = files ? [...files.children].map((n) => n.cloneNode(true)) : [];
	const rootView = view?.href ?? '';
	const stack: string[] = [];

	const showRoot = () => {
		stack.length = 0;
		if (files) files.replaceChildren(...rootNodes.map((n) => n.cloneNode(true)));
		if (back) back.hidden = true;
		if (view) view.href = rootView;
	};

	const showFolder = async (path: string) => {
		if (!files) return;
		const repo = files.dataset.repo ?? '';
		const repoUrl = files.dataset.repoUrl ?? '';
		files.setAttribute('aria-busy', 'true');
		const entries = await contents(repo, path);
		files.removeAttribute('aria-busy');
		if (back) back.hidden = false;
		const folderUrl = `${repoUrl}/tree/HEAD/${path}`;
		if (view) view.href = folderUrl;
		if (!entries) {
			const note = document.createElement('a');
			note.className = 'note';
			note.href = folderUrl;
			note.textContent = files.dataset.error ?? '';
			files.replaceChildren(note);
			return;
		}
		const nodes: Node[] = entries.slice(0, MAX).map((e) => row(e, path, files.dataset.open ?? ''));
		if (entries.length > MAX) {
			const more = document.createElement('a');
			more.className = 'more';
			more.href = folderUrl;
			more.setAttribute('role', 'listitem');
			more.textContent = (files.dataset.more ?? '{n}').replace('{n}', String(entries.length - MAX));
			nodes.push(more);
		}
		files.replaceChildren(...nodes);
	};

	files?.addEventListener('click', (event) => {
		const button = (event.target as Element).closest<HTMLButtonElement>('button[data-dir]');
		if (!button?.dataset.dir) return;
		stack.push(button.dataset.dir);
		void showFolder(button.dataset.dir);
	});

	back?.addEventListener('click', () => {
		stack.pop();
		const previous = stack[stack.length - 1];
		if (previous) void showFolder(previous);
		else showRoot();
	});

	let closing = false;
	const close = () => {
		if (closing || !dialog.open) return;
		if (reduced.matches) {
			dialog.close();
			return;
		}
		closing = true;
		dialog.classList.add('closing');
		const done = () => {
			dialog.classList.remove('closing');
			dialog.close();
			closing = false;
		};
		dialog.addEventListener('animationend', done, { once: true });
		// In case the animation never runs (hidden tab), close anyway.
		setTimeout(() => closing && done(), 400);
	};

	dialog.addEventListener('cancel', (event) => {
		event.preventDefault();
		close();
	});
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) close();
	});
	dialog.querySelector('[data-close]')?.addEventListener('click', close);
	dialog.addEventListener('close', showRoot);
}

for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog.pop')) setup(dialog);

for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-pop]')) {
	const dialog = document.getElementById(`pop-${link.dataset.pop}`) as HTMLDialogElement | null;
	if (!dialog || typeof dialog.showModal !== 'function') continue;
	link.addEventListener('click', (event) => {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		dialog.showModal();
		dialog.querySelector<HTMLElement>('[data-card]')?.focus();
	});
}
