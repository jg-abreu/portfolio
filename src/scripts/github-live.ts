/**
 * Live GitHub data in the browser. The page is rendered with the build snapshot, so it is never
 * empty; this script then fetches fresh data and updates it in place:
 * - [data-live="contributions" | "repos"] counters (animated unless motion is reduced);
 * - radar blips and readout ages for each project repo ([data-repo]).
 * Responses are cached for 30 minutes (the anonymous API allows 60 requests/hour per IP), each
 * source loads independently, and anything that fails or does not validate leaves the snapshot
 * value in place. LeetCode is build-only: it blocks browser requests.
 */
import {
	ENDPOINTS,
	daysBetween,
	fromContributionsApi,
	fromGitHubProfile,
	fromGitHubRepos,
	validContributions,
	validProfile,
	validRepos,
	type Contributions,
	type Profile,
	type Repo,
} from '../lib/github-data';
import { activityStats, heatmapCells, recentRepos } from '../lib/activity';
import { pointAt, radiusForDays } from '../lib/radar-geometry';

interface LiveData {
	profile: Profile | null;
	repos: Repo[] | null;
	contributions: Contributions | null;
}

const CACHE_KEY = 'portfolio:github-live:v1';
const CACHE_MS = 30 * 60 * 1000;
const root = document.documentElement;
const motion = root.classList.contains('fx') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const numberFormat = new Intl.NumberFormat(root.lang || undefined);

function readCache(): LiveData | null {
	try {
		const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
		if (!raw || typeof raw.savedAt !== 'number' || Date.now() - raw.savedAt > CACHE_MS) return null;
		return {
			profile: validProfile(raw.profile),
			repos: validRepos(raw.repos),
			contributions: validContributions(raw.contributions),
		};
	} catch {
		return null;
	}
}

function writeCache(data: LiveData) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), ...data }));
	} catch {
		// Storage can be full, disabled or blocked; live data still shows for this visit.
	}
}

async function getJson(url: string): Promise<unknown> {
	const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
	if (!res.ok) throw new Error(String(res.status));
	return res.json();
}

async function fetchLive(): Promise<LiveData> {
	const [profile, repos, contributions] = await Promise.allSettled([
		getJson(ENDPOINTS.profile).then(fromGitHubProfile),
		getJson(ENDPOINTS.repos).then(fromGitHubRepos),
		getJson(ENDPOINTS.contributions).then(fromContributionsApi),
	]);
	const value = <T>(r: PromiseSettledResult<T | null>) => (r.status === 'fulfilled' ? r.value : null);
	return { profile: value(profile), repos: value(repos), contributions: value(contributions) };
}

// ---- Counters ----

function animateNumber(el: HTMLElement, from: number, to: number) {
	if (!motion || from === to) {
		el.textContent = numberFormat.format(to);
		return;
	}
	const start = performance.now();
	const duration = 1200;
	const step = (now: number) => {
		const t = Math.min(1, (now - start) / duration);
		const eased = 1 - (1 - t) ** 3;
		el.textContent = numberFormat.format(Math.round(from + (to - from) * eased));
		if (t < 1) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}

const counters = [...document.querySelectorAll<HTMLElement>('[data-live]')];

function setCounter(name: string, value: number) {
	for (const el of counters.filter((c) => c.dataset.live === name)) {
		const current = Number(el.dataset.value ?? 0);
		el.dataset.value = String(value);
		el.closest<HTMLElement>('[data-live-block]')?.removeAttribute('hidden');
		// Before the first count-up the number is shown as rendered; it animates once on screen.
		if (el.dataset.counted) animateNumber(el, current, value);
		else el.textContent = numberFormat.format(value);
	}
}

// Count up from zero the first time the counters come into view.
if (motion) {
	const observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			const el = entry.target as HTMLElement;
			el.dataset.counted = 'true';
			animateNumber(el, 0, Number(el.dataset.value ?? 0));
			observer.unobserve(el);
		}
	});
	counters.forEach((el) => observer.observe(el));
} else {
	counters.forEach((el) => (el.dataset.counted = 'true'));
}

// ---- Radar ----

function ageLabel(list: HTMLElement, days: number): string {
	const key = days === 0 ? 'ageToday' : days === 1 ? 'ageDay' : 'ageDays';
	return (list.dataset[key] ?? '').replace('{n}', String(days));
}

function updateRadar(repos: Repo[]) {
	const today = new Date().toISOString().slice(0, 10);
	for (const blip of document.querySelectorAll<SVGGElement>('.blip[data-repo]')) {
		const repo = repos.find((r) => r.name === blip.dataset.repo);
		if (!repo) continue;
		const days = daysBetween(repo.pushedAt, today);
		const { x, y } = pointAt(Number(blip.dataset.bearing), radiusForDays(days));
		for (const circle of blip.querySelectorAll('circle')) {
			circle.setAttribute('cx', String(x));
			circle.setAttribute('cy', String(y));
		}
		blip.querySelector('text')?.setAttribute('x', String(x + 10));
		blip.querySelector('text')?.setAttribute('y', String(y - 8));

		const list = document.querySelector<HTMLElement>('[data-age-days]');
		const age = document.querySelector<HTMLElement>(`[data-contact][data-repo="${repo.name}"] .age`);
		if (list && age) age.textContent = ageLabel(list, days);
	}
}

// ---- Activity: statistics and heatmap ----

const today = () => new Date().toISOString().slice(0, 10);
const dateFormat = new Intl.DateTimeFormat(root.lang || undefined, { dateStyle: 'medium', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat(root.lang || undefined, { day: '2-digit', month: 'short', timeZone: 'UTC' });
const at = (d: string) => new Date(`${d}T00:00:00Z`);

function updateActivity(contributions: Contributions) {
	const stats = activityStats(contributions, today());
	const box = document.querySelector<HTMLElement>('[data-activity-stats]');
	const days = (n: number) => {
		const source = document.querySelector<HTMLElement>('[data-day-one]');
		return (n === 1 ? source?.dataset.dayOne : source?.dataset.dayMany)?.replace('{n}', String(n)) ?? String(n);
	};
	const set = (name: string, value: string) => {
		const el = box?.querySelector<HTMLElement>(`[data-stat="${name}"]`);
		if (el) el.textContent = value;
	};
	set('total', numberFormat.format(stats.total));
	set('activeDays', numberFormat.format(stats.activeDays));
	set('currentStreak', days(stats.currentStreak));
	set('longestStreak', days(stats.longestStreak));
	if (stats.bestDay) {
		set('bestCount', numberFormat.format(stats.bestDay.count));
		set('bestDate', dateFormat.format(at(stats.bestDay.date)));
	}

	// Same layout as the build, so cells are matched by date; days not drawn yet are skipped.
	const heatmap = document.querySelector<HTMLElement>('[data-heatmap]');
	if (!heatmap) return;
	const rects = new Map([...heatmap.querySelectorAll<SVGRectElement>('rect[data-date]')].map((r) => [r.dataset.date, r]));
	for (const cell of heatmapCells(contributions, today())) {
		const rect = rects.get(cell.date);
		if (!rect) continue;
		rect.classList.remove('l0', 'l1', 'l2', 'l3', 'l4');
		rect.classList.add(`l${cell.level}`);
		const label = (cell.count === 1 ? heatmap.dataset.labelOne : heatmap.dataset.labelMany) ?? '';
		const title = rect.querySelector('title');
		if (title) title.textContent = label.replace('{n}', String(cell.count)).replace('{date}', dateFormat.format(at(cell.date)));
	}
}

// ---- Recently pushed repositories (ticker and cards), rebuilt from live data with textContent ----

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (text !== undefined) el.textContent = text;
	return el;
}

function updateRecent(repos: Repo[]) {
	for (const box of document.querySelectorAll<HTMLElement>('[data-recent]')) {
		let descriptions: Record<string, string> = {};
		try {
			descriptions = JSON.parse(box.dataset.descriptions ?? '{}');
		} catch {
			descriptions = {};
		}
		const describe = (r: Repo) => (typeof descriptions[r.name] === 'string' ? descriptions[r.name] : (r.description ?? ''));
		const variant = box.dataset.recent;
		const list = recentRepos(repos, variant === 'ticker' ? 8 : 4);
		if (list.length === 0) continue;

		for (const ul of box.querySelectorAll<HTMLUListElement>('[data-recent-list]')) {
			// Scoped styles need the component's scope attribute on new nodes.
			const scope = [...ul.attributes].find((a) => a.name.startsWith('data-astro-cid-'))?.name;
			const items = list.map((r) => {
				const time = element('time', undefined, variant === 'ticker' ? shortDate.format(at(r.pushedAt)) : dateFormat.format(at(r.pushedAt)));
				time.dateTime = r.pushedAt;
				let li: HTMLLIElement;
				if (variant === 'ticker') {
					li = element('li');
					li.append(time, element('span', 'name', r.name), element('span', 'desc', describe(r)));
				} else {
					li = element('li', 'card');
					const link = element('a', 'name', `${r.name} ↗`);
					link.href = r.url; // validated https URL
					const meta = element('p', 'meta');
					if (r.language) meta.append(element('span', undefined, r.language));
					const pushed = element('span', undefined, `${box.dataset.pushedLabel ?? ''} `);
					pushed.append(time);
					meta.append(pushed);
					li.append(link, element('p', 'desc', describe(r)), meta);
				}
				if (scope) for (const el of [li, ...li.querySelectorAll('*')]) el.setAttribute(scope, '');
				return li;
			});
			ul.replaceChildren(...items);
		}
	}
}

// ---- Ticker pause button (moving content must be pausable) ----

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-ticker-toggle]')) {
	button.addEventListener('click', () => {
		const ticker = button.closest<HTMLElement>('[data-recent]');
		const paused = ticker?.classList.toggle('is-paused') ?? false;
		button.setAttribute('aria-pressed', String(paused));
		button.textContent = (paused ? button.dataset.play : button.dataset.pause) ?? '';
	});
}

// ---- Local time in Rio de Janeiro ----

const clock = document.querySelector<HTMLTimeElement>('[data-clock]');
if (clock) {
	const format = new Intl.DateTimeFormat(root.lang || undefined, {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'America/Sao_Paulo',
	});
	const tick = () => {
		clock.textContent = format.format(new Date());
	};
	tick();
	clock.closest<HTMLElement>('[data-clock-line]')?.removeAttribute('hidden');
	setInterval(tick, 30_000);
}

// ---- Load ----

function apply(data: LiveData) {
	if (data.contributions) {
		setCounter('contributions', data.contributions.total);
		updateActivity(data.contributions);
	}
	if (data.profile) setCounter('repos', data.profile.publicRepos);
	if (data.repos) {
		updateRadar(data.repos);
		updateRecent(data.repos);
	}
}

const cached = readCache();
if (cached) {
	apply(cached);
} else {
	fetchLive().then((data) => {
		apply(data);
		if (data.profile || data.repos || data.contributions) writeCache(data);
	});
}
