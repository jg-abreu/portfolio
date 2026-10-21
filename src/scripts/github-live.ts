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

// ---- Load ----

function apply(data: LiveData) {
	if (data.contributions) setCounter('contributions', data.contributions.total);
	if (data.profile) setCounter('repos', data.profile.publicRepos);
	if (data.repos) updateRadar(data.repos);
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
