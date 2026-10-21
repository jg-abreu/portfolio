/**
 * Public data the site shows about João's GitHub and LeetCode activity: types, endpoints and
 * validators. Shared by the build-time snapshot (scripts/github-snapshot.ts), the build
 * (lib/github.ts) and the browser (scripts/github-live.ts), so the same rules apply everywhere:
 * https links only, YYYY-MM-DD dates, non-negative integers, plain-text strings (rendered with
 * textContent, never as HTML). No Node or DOM APIs here.
 */
export const GITHUB_USER = 'jg-abreu';
export const LEETCODE_USER = 'jg-abreu';

export const ENDPOINTS = {
	profile: `https://api.github.com/users/${GITHUB_USER}`,
	repos: `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`,
	contributions: `https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`,
	leetcode: 'https://leetcode.com/graphql',
} as const;

export const LEETCODE_QUERY =
	'query($u:String!){matchedUser(username:$u){submitStatsGlobal{acSubmissionNum{difficulty count}} userCalendar{streak totalActiveDays submissionCalendar}}}';

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

export interface LeetCode {
	solved: number;
	easy: number;
	medium: number;
	hard: number;
	activeDays: number;
	maxStreak: number;
	lastSubmission: string | null;
}

/** Each source is independent: null means "no data", which the site shows as absent, never invented. */
export interface Snapshot {
	generatedAt: string;
	profile: Profile | null;
	repos: Repo[] | null;
	contributions: Contributions | null;
	leetcode: LeetCode | null;
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

export function validLeetCode(v: unknown): LeetCode | null {
	const o = obj(v);
	if (!o) return null;
	const counts = [o.solved, o.easy, o.medium, o.hard, o.activeDays, o.maxStreak];
	if (!counts.every(isCount)) return null;
	return {
		solved: o.solved as number,
		easy: o.easy as number,
		medium: o.medium as number,
		hard: o.hard as number,
		activeDays: o.activeDays as number,
		maxStreak: o.maxStreak as number,
		lastSubmission: isDate(o.lastSubmission) ? o.lastSubmission : null,
	};
}

export function validSnapshot(v: unknown): Snapshot | null {
	const o = obj(v);
	if (!o || !isDate(o.generatedAt)) return null;
	return {
		generatedAt: o.generatedAt,
		profile: validProfile(o.profile),
		repos: validRepos(o.repos),
		contributions: validContributions(o.contributions),
		leetcode: validLeetCode(o.leetcode),
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

export function fromLeetCodeApi(raw: unknown): LeetCode | null {
	const user = obj(obj(obj(raw)?.data)?.matchedUser);
	const stats = obj(user?.submitStatsGlobal)?.acSubmissionNum;
	const calendar = obj(user?.userCalendar);
	if (!Array.isArray(stats) || !calendar) return null;
	const count = (difficulty: string) => obj(stats.find((s) => obj(s)?.difficulty === difficulty))?.count;

	// submissionCalendar is a JSON string of { "<unix seconds>": submissions }.
	let lastSubmission: string | null = null;
	try {
		const days = Object.keys(JSON.parse(String(calendar.submissionCalendar ?? '{}')))
			.map(Number)
			.filter((s) => Number.isFinite(s) && s > 0);
		if (days.length) lastSubmission = new Date(Math.max(...days) * 1000).toISOString().slice(0, 10);
	} catch {
		lastSubmission = null;
	}

	return validLeetCode({
		solved: count('All'),
		easy: count('Easy'),
		medium: count('Medium'),
		hard: count('Hard'),
		activeDays: calendar.totalActiveDays,
		maxStreak: calendar.streak,
		lastSubmission,
	});
}

/** Whole days from `from` to `to` (both YYYY-MM-DD), never negative. */
export function daysBetween(from: string, to: string): number {
	const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
	return Math.max(0, Math.round(ms / 86_400_000));
}
