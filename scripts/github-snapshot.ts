// Build-time snapshot of public GitHub and LeetCode data, written to src/data/github-snapshot.json
// (git-ignored). Runs before every build. Each source is fetched independently: a source that
// fails keeps its value from the previous snapshot, or stays null, so the site never invents data.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { rioDate } from '../src/lib/calendar.ts';
import {
	ENDPOINTS,
	LEETCODE_QUERY,
	LEETCODE_USER,
	GITHUB_USER,
	fromContributionsApi,
	fromGitHubProfile,
	fromGitHubRepos,
	fromLeetCodeApi,
	validSnapshot,
	type Snapshot,
} from '../src/lib/github-data.ts';

const OUT = new URL('../src/data/github-snapshot.json', import.meta.url);

const githubHeaders: Record<string, string> = {
	Accept: 'application/vnd.github+json',
	'User-Agent': `${GITHUB_USER}-portfolio-build`,
};
// Optional in CI, to avoid the 60 requests/hour limit for anonymous calls.
if (process.env.GITHUB_TOKEN) githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function getJson(url: string, init: RequestInit = {}): Promise<unknown> {
	const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
	return res.json();
}

const previous: Snapshot | null = existsSync(OUT) ? validSnapshot(JSON.parse(readFileSync(OUT, 'utf8'))) : null;

const sources = {
	profile: () => getJson(ENDPOINTS.profile, { headers: githubHeaders }).then(fromGitHubProfile),
	repos: () => getJson(ENDPOINTS.repos, { headers: githubHeaders }).then(fromGitHubRepos),
	contributions: () => getJson(ENDPOINTS.contributions).then(fromContributionsApi),
	// LeetCode blocks browser requests, so this source only exists at build time.
	leetcode: () =>
		getJson(ENDPOINTS.leetcode, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Referer: `https://leetcode.com/u/${LEETCODE_USER}/`,
				'User-Agent': `${GITHUB_USER}-portfolio-build`,
			},
			body: JSON.stringify({ query: LEETCODE_QUERY, variables: { u: LEETCODE_USER } }),
		}).then(fromLeetCodeApi),
};

const names = Object.keys(sources) as (keyof typeof sources)[];
const results = await Promise.allSettled(names.map((name) => sources[name]()));

const snapshot: Snapshot = {
	generatedAt: rioDate(),
	profile: previous?.profile ?? null,
	repos: previous?.repos ?? null,
	contributions: previous?.contributions ?? null,
	leetcode: previous?.leetcode ?? null,
};

names.forEach((name, i) => {
	const result = results[i];
	if (result.status === 'fulfilled' && result.value !== null) {
		(snapshot as unknown as Record<string, unknown>)[name] = result.value;
		console.log(`[github-snapshot] ${name}: ok`);
	} else {
		const reason = result.status === 'rejected' ? (result.reason as Error).message : 'invalid response';
		const kept = snapshot[name] !== null ? 'keeping the previous value' : 'no data';
		console.warn(`[github-snapshot] ${name}: ${reason}; ${kept}`);
	}
});

await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(snapshot, null, '\t')}\n`);
