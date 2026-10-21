// Build-time snapshot of public GitHub data, written to src/data/github-snapshot.json (git-ignored).
// Runs before every build. If GitHub is unreachable, the previous snapshot is kept; if there is
// none, the site renders without repository activity instead of inventing it.
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const USER = 'jg-abreu';
const OUT = new URL('../src/data/github-snapshot.json', import.meta.url);

const headers = { Accept: 'application/vnd.github+json', 'User-Agent': `${USER}-portfolio-build` };
// Optional in CI, to avoid the 60 requests/hour limit for anonymous calls.
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const REPO_NAME = /^[A-Za-z0-9._-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function toRepo(raw) {
	const pushedAt = typeof raw?.pushed_at === 'string' ? raw.pushed_at.slice(0, 10) : '';
	if (typeof raw?.name !== 'string' || !REPO_NAME.test(raw.name) || !DATE.test(pushedAt)) return null;
	return { name: raw.name, pushedAt, fork: raw.fork === true, archived: raw.archived === true };
}

try {
	const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, {
		headers,
		signal: AbortSignal.timeout(10_000),
	});
	if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
	const body = await res.json();
	if (!Array.isArray(body)) throw new Error('unexpected response shape');

	const repos = body.map(toRepo).filter(Boolean);
	const snapshot = { generatedAt: new Date().toISOString().slice(0, 10), repos };
	await mkdir(new URL('.', OUT), { recursive: true });
	await writeFile(OUT, `${JSON.stringify(snapshot, null, '\t')}\n`);
	console.log(`[github-snapshot] ${repos.length} repositories saved (${snapshot.generatedAt})`);
} catch (error) {
	const fallback = existsSync(OUT) ? 'keeping the previous snapshot' : 'building without repository activity';
	console.warn(`[github-snapshot] ${error.message}; ${fallback}`);
}
