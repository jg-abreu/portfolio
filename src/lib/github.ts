import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validSnapshot, type Snapshot } from './github-data';

let cached: Snapshot | null | undefined;

/** The snapshot written by scripts/github-snapshot.ts, revalidated; null when there is none (never invented). */
export function getGitHubSnapshot(): Snapshot | null {
	if (cached !== undefined) return cached;
	try {
		cached = validSnapshot(JSON.parse(readFileSync(join(process.cwd(), 'src/data/github-snapshot.json'), 'utf8')));
	} catch {
		cached = null;
	}
	return cached;
}
