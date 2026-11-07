/**
 * Public data the site shows about João's GitHub activity: types, endpoints and
 * validators. Shared by the build-time snapshot (scripts/github-snapshot.ts), the build
 * (lib/github.ts) and the browser (scripts/github-live.ts), so the same rules apply everywhere:
 * https links only, YYYY-MM-DD dates, non-negative integers, plain-text strings (rendered with
 * textContent, never as HTML). No Node or DOM APIs here.
 */
import { utcDate } from './calendar.ts';

export const GITHUB_USER = 'jg-abreu';
/** Where all algorithm practice lands: a UTC day with a solution committed here is a day practiced. */
export const PRACTICE_REPO = 'algorithms-and-data-structures';

export const ENDPOINTS = {
	profile: `https://api.github.com/users/${GITHUB_USER}`,
	repos: `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`,
	contributions: `https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`,
	practiceCommits: `https://api.github.com/repos/${GITHUB_USER}/${PRACTICE_REPO}/commits?per_page=100`,
} as const;

export interface Profile {
	publicRepos: number;
}

export interface Repo {
	name: string;
	url: string;
	description: string | null;
	language: string | null;
	stars: number;
	pushedAt: string;
	fork: boolean;
	archived: boolean;
	homepage: string | null;
}

export interface Contributions {
	total: number;
	days: { date: string; count: number }[];
}

export interface PracticeStats {
	activeDays: number;
	/** Consecutive days up to today; today may still be empty, so a run ending yesterday counts. */
	currentStreak: number;
	longestStreak: number;
	lastDay: string;
}

/** Each source is independent: null means "no data", which the site shows as absent, never invented. */
export interface Snapshot {
	generatedAt: string;
	profile: Profile | null;
	repos: Repo[] | null;
	contributions: Contributions | null;
	/** UTC days with at least one solution commit in PRACTICE_REPO, sorted. */
	practiceDays: string[] | null;
}

type Unknown = Record<string, unknown> | undefined | null;
const obj = (v: unknown): Unknown => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (v: unknown): v is string => typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(v));
export const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const REPO_NAME = /^[A-Za-z0-9._-]+$/;

export function httpsUrl(v: unknown): string | null {
	if (typeof v !== 'string' || v === '') return null;
	try {
		return new URL(v).protocol === 'https:' ? v : null;
	} catch {
		return null;
	}
}

/** Trimmed, length-limited plain text; markup is never interpreted because it is set as text. */
function text(v: unknown, max = 300): string | null {
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t ? t.slice(0, max) : null;
}

// ---- Validators for the normalized shapes (stored snapshot and adapter output) ----

export function validProfile(v: unknown): Profile | null {
	const o = obj(v);
	return o && isCount(o.publicRepos) ? { publicRepos: o.publicRepos } : null;
}

export function validRepo(v: unknown): Repo | null {
	const o = obj(v);
	if (!o || typeof o.name !== 'string' || !REPO_NAME.test(o.name) || !isDate(o.pushedAt) || !isCount(o.stars)) return null;
	const url = httpsUrl(o.url);
	if (!url) return null;
	return {
		name: o.name,
		url,
		description: text(o.description),
		language: text(o.language, 40),
		stars: o.stars,
		pushedAt: o.pushedAt,
		fork: o.fork === true,
		archived: o.archived === true,
		homepage: httpsUrl(o.homepage),
	};
}

export function validRepos(v: unknown): Repo[] | null {
	return Array.isArray(v) ? v.map(validRepo).filter((r): r is Repo => r !== null) : null;
}

export function validContributions(v: unknown): Contributions | null {
	const o = obj(v);
	if (!o || !isCount(o.total) || !Array.isArray(o.days)) return null;
	const days = o.days
		.map(obj)
		.filter((d): d is Record<string, unknown> => !!d && isDate(d.date) && isCount(d.count))
		.map((d) => ({ date: d.date as string, count: d.count as number }));
	return { total: o.total, days };
}

export function validDays(v: unknown): string[] | null {
	return Array.isArray(v) ? [...new Set(v.filter(isDate))].sort() : null;
}

export function validSnapshot(v: unknown): Snapshot | null {
	const o = obj(v);
	if (!o || !isDate(o.generatedAt)) return null;
	return {
		generatedAt: o.generatedAt,
		profile: validProfile(o.profile),
		repos: validRepos(o.repos),
		contributions: validContributions(o.contributions),
		practiceDays: validDays(o.practiceDays),
	};
}

// ---- Adapters from each service's raw response to the normalized shapes ----

export function fromGitHubProfile(raw: unknown): Profile | null {
	return validProfile({ publicRepos: obj(raw)?.public_repos });
}

export function fromGitHubRepos(raw: unknown): Repo[] | null {
	if (!Array.isArray(raw)) return null;
	return validRepos(
		raw.map((r) => {
			const o = obj(r);
			return {
				name: o?.name,
				url: o?.html_url,
				description: o?.description,
				language: o?.language,
				stars: o?.stargazers_count,
				pushedAt: typeof o?.pushed_at === 'string' ? o.pushed_at.slice(0, 10) : null,
				fork: o?.fork,
				archived: o?.archived,
				homepage: o?.homepage,
			};
		}),
	);
}

export function fromContributionsApi(raw: unknown): Contributions | null {
	const o = obj(raw);
	return validContributions({ total: obj(o?.total)?.lastYear, days: o?.contributions });
}

/** Solution commits are titled with the run's stats, e.g. "Time: 2 ms (92.71%), Space: 71.53 MB (60.77%)". */
const SOLUTION_COMMIT = /^Time: .+, Space: /;

/**
 * The UTC day of each solution commit, like LeetCode's own calendar: a commit at 23:39 in Rio is
 * already the next day. Commits that only touch docs or the repository layout are not practice.
 */
export function fromGitHubCommits(raw: unknown): string[] | null {
	if (!Array.isArray(raw)) return null;
	const dates = raw
		.map((c) => obj(obj(c)?.commit))
		.filter((commit) => typeof commit?.message === 'string' && SOLUTION_COMMIT.test(commit.message))
		.map((commit) => obj(commit?.author)?.date);
	return validDays(
		dates.filter((d): d is string => typeof d === 'string' && !Number.isNaN(Date.parse(d))).map((d) => utcDate(new Date(d))),
	);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD), never negative. */
export function daysBetween(from: string, to: string): number {
	const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
	return Math.max(0, Math.round(ms / 86_400_000));
}

/** Active days, current and longest runs of consecutive days and the latest day; null when there are no days. */
export function practiceStats(days: string[], today: string): PracticeStats | null {
	const sorted = validDays(days) ?? [];
	if (sorted.length === 0) return null;
	let longestStreak = 0;
	let run = 0;
	sorted.forEach((day, i) => {
		run = i > 0 && daysBetween(sorted[i - 1], day) === 1 ? run + 1 : 1;
		longestStreak = Math.max(longestStreak, run);
	});
	const lastDay = sorted[sorted.length - 1];
	// `run` ends at the last day; it is still current only if that day is today or yesterday.
	const currentStreak = daysBetween(lastDay, today) <= 1 ? run : 0;
	return { activeDays: sorted.length, currentStreak, longestStreak, lastDay };
}
