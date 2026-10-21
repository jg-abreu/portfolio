/**
 * Contribution statistics and the year heatmap layout, computed from the contributions days.
 * Pure functions shared by the build and the browser, so live data gives the same numbers.
 */
import { GITHUB_USER, type Contributions, type Repo } from './github-data';

export interface ActivityStats {
	total: number;
	activeDays: number;
	currentStreak: number;
	longestStreak: number;
	bestDay: { date: string; count: number } | null;
}

export interface HeatCell {
	date: string;
	count: number;
	level: 0 | 1 | 2 | 3 | 4;
	week: number;
	weekday: number;
}

const addDays = (date: string, n: number) => {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
};

/** Days up to and including `today`, sorted; the service also returns padding days in the future. */
function pastDays(contributions: Contributions, today: string) {
	return contributions.days.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function activityStats(contributions: Contributions, today: string): ActivityStats {
	const days = pastDays(contributions, today);
	const byDate = new Map(days.map((d) => [d.date, d.count]));

	let longest = 0;
	let run = 0;
	let best: ActivityStats['bestDay'] = null;
	for (const d of days) {
		run = d.count > 0 ? run + 1 : 0;
		longest = Math.max(longest, run);
		if (d.count > 0 && (!best || d.count > best.count)) best = { date: d.date, count: d.count };
	}

	// The current streak may end yesterday: today is not over yet.
	let cursor = (byDate.get(today) ?? 0) > 0 ? today : addDays(today, -1);
	let current = 0;
	while ((byDate.get(cursor) ?? 0) > 0) {
		current++;
		cursor = addDays(cursor, -1);
	}

	return {
		total: contributions.total,
		activeDays: days.filter((d) => d.count > 0).length,
		currentStreak: current,
		longestStreak: longest,
		bestDay: best,
	};
}

/**
 * The last 53 weeks as columns (Sunday on top, like GitHub), ending with the week of `today`.
 * Levels split the busiest day into quarters, so the scale adapts to the year's activity.
 */
export function heatmapCells(contributions: Contributions, today: string): HeatCell[] {
	const byDate = new Map(pastDays(contributions, today).map((d) => [d.date, d.count]));
	const max = Math.max(1, ...byDate.values());
	const todayWeekday = new Date(`${today}T00:00:00Z`).getUTCDay();
	const start = addDays(today, -(52 * 7 + todayWeekday));

	const cells: HeatCell[] = [];
	for (let i = 0; i <= 52 * 7 + todayWeekday; i++) {
		const date = addDays(start, i);
		const count = byDate.get(date) ?? 0;
		const level = count === 0 ? 0 : (Math.min(4, Math.ceil((count / max) * 4)) as HeatCell['level']);
		cells.push({ date, count, level, week: Math.floor(i / 7), weekday: i % 7 });
	}
	return cells;
}

/** Repositories pushed most recently, without forks, archived ones, the profile repo and this site. */
export function recentRepos(repos: Repo[], limit: number): Repo[] {
	const hidden = new Set([GITHUB_USER, 'portfolio']);
	return repos
		.filter((r) => !r.fork && !r.archived && !hidden.has(r.name))
		.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))
		.slice(0, limit);
}
