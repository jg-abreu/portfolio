// Build-time snapshot of public GitHub data, written to src/data/github-snapshot.json
// (git-ignored). Runs before every build. Each source is fetched independently: a source that
// fails keeps its value from the previous snapshot, or stays null, so the site never invents data.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { rioDate } from '../src/lib/calendar.ts';
import {
	ENDPOINTS,
	GITHUB_USER,
	fromContributionsApi,
	fromDevArticles,
	fromGitHubContents,
	fromGitHubCommits,
	fromGitHubProfile,
	fromGitHubRepos,
	validDays,
	validSnapshot,
	type Snapshot,
	type TreeEntry,
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

/** Every page of the practice repo's commits; any failed page fails the source, so a partial history is never kept. */
async function practiceDays(): Promise<string[] | null> {
	const days: string[] = [];
	for (let page = 1; page <= 50; page++) {
		const raw = await getJson(`${ENDPOINTS.practiceCommits}&page=${page}`, { headers: githubHeaders });
		const parsed = fromGitHubCommits(raw);
		if (!parsed) return null;
		days.push(...parsed);
		if ((raw as unknown[]).length < 100) return validDays(days);
	}
	throw new Error('more commit pages than expected');
}

/** Root folders and files of every project repository listed in src/content/projects.yaml. */
async function trees(): Promise<Record<string, TreeEntry[]> | null> {
	const yaml = readFileSync(new URL('../src/content/projects.yaml', import.meta.url), 'utf8');
	const repos = [...yaml.matchAll(/^\s+repo:\s*([A-Za-z0-9._-]+)\s*$/gm)].map((m) => m[1]);
	const out: Record<string, TreeEntry[]> = {};
	for (const repo of repos) {
		const entries = fromGitHubContents(await getJson(ENDPOINTS.repoRoot(repo), { headers: githubHeaders }));
		if (!entries) return null;
		out[repo] = entries;
	}
	return out;
}

const sources = {
	profile: () => getJson(ENDPOINTS.profile, { headers: githubHeaders }).then(fromGitHubProfile),
	repos: () => getJson(ENDPOINTS.repos, { headers: githubHeaders }).then(fromGitHubRepos),
	contributions: () => getJson(ENDPOINTS.contributions).then(fromContributionsApi),
	practiceDays,
	articles: () =>
		getJson(ENDPOINTS.articles, { headers: { Accept: 'application/json', 'User-Agent': `${GITHUB_USER}-portfolio-build` } }).then(
			fromDevArticles,
		),
	trees,
};

const names = Object.keys(sources) as (keyof typeof sources)[];
const results = await Promise.allSettled(names.map((name) => sources[name]()));

const snapshot: Snapshot = {
	generatedAt: rioDate(),
	profile: previous?.profile ?? null,
	repos: previous?.repos ?? null,
	contributions: previous?.contributions ?? null,
	practiceDays: previous?.practiceDays ?? null,
	articles: previous?.articles ?? null,
	trees: previous?.trees ?? null,
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
