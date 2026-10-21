import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'astro/zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const snapshotSchema = z.object({
	generatedAt: date,
	repos: z.array(
		z.object({
			name: z.string().regex(/^[A-Za-z0-9._-]+$/),
			pushedAt: date,
			fork: z.boolean(),
			archived: z.boolean(),
		}),
	),
});

export type GitHubSnapshot = z.infer<typeof snapshotSchema>;

let cached: GitHubSnapshot | null | undefined;

/** The snapshot written by scripts/github-snapshot.mjs, or null when there is none (never invented). */
export function getGitHubSnapshot(): GitHubSnapshot | null {
	if (cached !== undefined) return cached;
	try {
		const raw = readFileSync(join(process.cwd(), 'src/data/github-snapshot.json'), 'utf8');
		cached = snapshotSchema.parse(JSON.parse(raw));
	} catch {
		cached = null;
	}
	return cached;
}

/** Whole days between a repository's last push and the snapshot date, or null without data. */
export function daysSincePush(snapshot: GitHubSnapshot | null, repo: string): number | null {
	const pushedAt = snapshot?.repos.find((r) => r.name === repo)?.pushedAt;
	if (!snapshot || !pushedAt) return null;
	const ms = Date.parse(`${snapshot.generatedAt}T00:00:00Z`) - Date.parse(`${pushedAt}T00:00:00Z`);
	return Math.max(0, Math.round(ms / 86_400_000));
}
