/**
 * Live GitHub data in the browser. The page is rendered with the build snapshot, so it is never
 * empty; this script then fetches fresh data and updates it in place:
 * - the [data-live="contributions"] counter (animated unless motion is reduced) and the heatmap;
 * - practice readings ([data-practice]), from the latest commits added to the days in the snapshot.
 * Responses are cached for 30 minutes (the anonymous API allows 60 requests/hour per IP), each
 * source loads independently, and anything that fails or does not validate leaves the snapshot
 * value in place.
 */
import {
	ENDPOINTS,
	fromContributionsApi,
	fromGitHubCommits,
	practiceStats,
	validContributions,
	validDays,
	type Contributions,
} from '../lib/github-data';
import { activityStats, heatmapCells } from '../lib/activity';
import { rioDate, utcDate } from '../lib/calendar';

interface LiveData {
	contributions: Contributions | null;
	practiceDays: string[] | null;
}

const CACHE_KEY = 'portfolio:github-live:v4';
const CACHE_MS = 30 * 60 * 1000;
const root = document.documentElement;
const motion = root.classList.contains('fx') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const numberFormat = new Intl.NumberFormat(root.lang || undefined);

function readCache(): LiveData | null {
	try {
		const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
		if (!raw || typeof raw.savedAt !== 'number' || Date.now() - raw.savedAt > CACHE_MS) return null;
		return {
			contributions: validContributions(raw.contributions),
			practiceDays: validDays(raw.practiceDays),
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
	const [contributions, practiceDays] = await Promise.allSettled([
		getJson(ENDPOINTS.contributions).then(fromContributionsApi),
		getJson(ENDPOINTS.practiceCommits).then(fromGitHubCommits),
	]);
	const value = <T>(r: PromiseSettledResult<T | null>) => (r.status === 'fulfilled' ? r.value : null);
	return { contributions: value(contributions), practiceDays: value(practiceDays) };
}

// ---- Counters ----

function animateNumber(el: HTMLElement, from: number, to: number) {
	if (!motion || from === to) {
		el.textContent = numberFormat.format(to);
		return;
	}
	const start = performance.now();
	const duration = 1200;
	let done = false;
	const finish = () => {
		done = true;
		el.textContent = numberFormat.format(to);
	};
	const step = (now: number) => {
		if (done) return;
		const t = Math.min(1, (now - start) / duration);
		const eased = 1 - (1 - t) ** 3;
		el.textContent = numberFormat.format(Math.round(from + (to - from) * eased));
		if (t < 1) requestAnimationFrame(step);
		else finish();
	};
	requestAnimationFrame(step);
	// Animation frames can stall (background tabs, headless renderers): the real number always lands.
	setTimeout(finish, duration + 200);
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

// ---- Activity: statistics and heatmap ----

const today = rioDate;
const dateFormat = new Intl.DateTimeFormat(root.lang || undefined, { dateStyle: 'medium', timeZone: 'UTC' });
const at = (d: string) => new Date(`${d}T00:00:00Z`);
const dayLabel = (n: number) => {
	const source = document.querySelector<HTMLElement>('[data-day-one]');
	return (n === 1 ? source?.dataset.dayOne : source?.dataset.dayMany)?.replace('{n}', String(n)) ?? String(n);
};

function updateActivity(contributions: Contributions) {
	const stats = activityStats(contributions, today());
	const box = document.querySelector<HTMLElement>('[data-activity-stats]');
	const set = (name: string, value: string) => {
		const el = box?.querySelector<HTMLElement>(`[data-stat="${name}"]`);
		if (el) el.textContent = value;
	};
	set('total', numberFormat.format(stats.total));
	set('activeDays', numberFormat.format(stats.activeDays));
	set('currentStreak', dayLabel(stats.currentStreak));
	set('longestStreak', dayLabel(stats.longestStreak));
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
		// Only days whose count changed since the snapshot are touched.
		if (!rect || rect.dataset.count === String(cell.count)) continue;
		rect.classList.remove('l0', 'l1', 'l2', 'l3', 'l4');
		rect.classList.add(`l${cell.level}`);
		rect.dataset.count = String(cell.count);
	}
}

// One tooltip for the whole heatmap: the day under the pointer, formatted only when needed.
for (const heatmap of document.querySelectorAll<HTMLElement>('[data-heatmap]')) {
	const tip = heatmap.querySelector<HTMLElement>('[data-heat-tip]');
	const plot = tip?.parentElement;
	if (!tip || !plot) continue;
	heatmap.addEventListener('pointerover', (e) => {
		const rect = (e.target as Element).closest<SVGRectElement>('rect[data-date]');
		if (!rect?.dataset.date) return;
		const count = Number(rect.dataset.count ?? 0);
		const label = (count === 1 ? heatmap.dataset.labelOne : heatmap.dataset.labelMany) ?? '';
		tip.textContent = label.replace('{n}', numberFormat.format(count)).replace('{date}', dateFormat.format(at(rect.dataset.date)));
		const box = rect.getBoundingClientRect();
		const area = plot.getBoundingClientRect();
		// Kept inside the card so it never widens the page near the edges.
		const x = Math.min(Math.max(box.left + box.width / 2 - area.left, 70), area.width - 70);
		tip.style.left = `${x}px`;
		tip.style.top = `${box.top - area.top}px`;
		tip.hidden = false;
	});
	heatmap.addEventListener('pointerleave', () => (tip.hidden = true));
}

// ---- Practice: UTC days with a solution committed to the practice repo ----

function updatePractice(latest: string[]) {
	const box = document.querySelector<HTMLElement>('[data-practice]');
	if (!box) return;
	// The live request only sees the latest commits, so older days come from the snapshot.
	let built: string[] = [];
	try {
		built = validDays(JSON.parse(box.dataset.practice ?? '[]')) ?? [];
	} catch {
		built = [];
	}
	const stats = practiceStats([...built, ...latest], utcDate());
	if (!stats) return;
	const set = (name: string, value: string) => {
		const el = box.querySelector<HTMLElement>(`[data-stat="${name}"]`);
		if (el) el.textContent = value;
	};
	set('practiceDays', numberFormat.format(stats.activeDays));
	set('practiceCurrent', dayLabel(stats.currentStreak));
	set('practiceStreak', dayLabel(stats.longestStreak));
	set('practiceLast', dateFormat.format(at(stats.lastDay)));
	box.querySelector<HTMLTimeElement>('[data-stat="practiceLast"]')?.setAttribute('datetime', stats.lastDay);
}

// ---- Load ----

// Each update runs as its own idle task, so live data never blocks scrolling or input;
// the page already shows the snapshot, so nothing is waiting on these.
const whenIdle = (task: () => void) =>
	'requestIdleCallback' in window ? requestIdleCallback(task, { timeout: 2000 }) : setTimeout(task, 200);

function apply(data: LiveData) {
	const { contributions, practiceDays } = data;
	if (contributions) {
		setCounter('contributions', contributions.total);
		whenIdle(() => updateActivity(contributions));
	}
	if (practiceDays) whenIdle(() => updatePractice(practiceDays));
}

const cached = readCache();
if (cached) {
	whenIdle(() => apply(cached));
} else {
	fetchLive().then((data) => {
		apply(data);
		if (data.contributions || data.practiceDays) writeCache(data);
	});
}
