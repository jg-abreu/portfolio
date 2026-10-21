import type { Project } from './content';
import { daysSincePush, getGitHubSnapshot } from './github';

/** One project drawn as a contact on the radar, in the 400 × 400 scope coordinates. */
export interface RadarContact {
	id: string;
	title: string;
	number: string;
	bearing: string;
	days: number | null;
	x: number;
	y: number;
	/** Bearing as a fraction of a full turn, so the blip flashes when the sweep passes it. */
	phase: number;
}

const CENTER = 200;
const R_MIN = 45;
const R_MAX = 170;

/**
 * Bearings are spread evenly (they carry no meaning); the distance from the center is real data,
 * the days since the repository's last push on a log scale. Without a snapshot, contacts sit on the
 * edge and report no data instead of an invented age.
 */
export function toRadarContacts(projects: Project[]): RadarContact[] {
	const snapshot = getGitHubSnapshot();
	return projects.map((p, i) => {
		const bearing = Math.round((360 / projects.length) * (i + 0.5));
		const days = daysSincePush(snapshot, p.repo);
		const r = days === null ? R_MAX : R_MIN + (R_MAX - R_MIN) * Math.min(1, Math.log1p(days) / Math.log1p(365));
		const rad = (bearing * Math.PI) / 180;
		return {
			id: p.id,
			title: p.title,
			number: String(i + 1).padStart(2, '0'),
			bearing: String(bearing).padStart(3, '0'),
			days,
			x: +(CENTER + r * Math.sin(rad)).toFixed(1),
			y: +(CENTER - r * Math.cos(rad)).toFixed(1),
			phase: bearing / 360,
		};
	});
}
