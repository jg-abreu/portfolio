import type { Project } from './content';
import { daysBetween } from './github-data';
import { getGitHubSnapshot } from './github';
import { pointAt, radiusForDays } from './radar-geometry';

/** One project drawn as a contact on the radar, in the 400 × 400 scope coordinates. */
export interface RadarContact {
	id: string;
	repo: string;
	title: string;
	number: string;
	bearing: number;
	days: number | null;
	x: number;
	y: number;
	/** Bearing as a fraction of a full turn, so the blip flashes when the sweep passes it. */
	phase: number;
}

/**
 * Bearings are spread evenly (they carry no meaning); the distance from the center is real data,
 * the days since the repository's last push. Without data, contacts sit on the edge and report
 * no data instead of an invented age. The browser refreshes both with live data.
 */
export function toRadarContacts(projects: Project[]): RadarContact[] {
	const snapshot = getGitHubSnapshot();
	return projects.map((p, i) => {
		const bearing = Math.round((360 / projects.length) * (i + 0.5));
		const pushedAt = snapshot?.repos?.find((r) => r.name === p.repo)?.pushedAt;
		const days = snapshot && pushedAt ? daysBetween(pushedAt, snapshot.generatedAt) : null;
		return {
			id: p.id,
			repo: p.repo,
			title: p.title,
			number: String(i + 1).padStart(2, '0'),
			bearing,
			days,
			...pointAt(bearing, radiusForDays(days)),
			phase: bearing / 360,
		};
	});
}
