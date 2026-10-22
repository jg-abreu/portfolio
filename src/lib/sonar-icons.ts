/**
 * Section icons drawn with sonar dots on a 25 × 25 grid inside a 400 × 400 view box.
 * Each icon is a predicate in unit coordinates (u right, v up, both in -1..1 around the center);
 * every grid point that satisfies it becomes a dot with its own scatter offset and delay, so the
 * icon can assemble when its section arrives and dissolve when it leaves.
 */
export type SonarIconName = 'dial' | 'antenna' | 'anchor' | 'bars' | 'pulse' | 'route';

export interface SonarDot {
	x: number;
	y: number;
	dx: number;
	dy: number;
	delay: number;
}

const STEP = 16;
const COUNT = 25;
const SCALE = 180;

const deg = (a: number) => (a * Math.PI) / 180;

/** Angle from straight up, clockwise, in degrees (0..360). */
const bearingOf = (u: number, v: number) => ((Math.atan2(u, v) * 180) / Math.PI + 360) % 360;

/** Distance from (u, v) to the segment from the center along `bearing` with length `len`. */
function distanceToHand(u: number, v: number, bearing: number, len: number) {
	const hx = Math.sin(deg(bearing));
	const hy = Math.cos(deg(bearing));
	const t = Math.max(0, Math.min(len, u * hx + v * hy));
	return Math.hypot(u - hx * t, v - hy * t);
}

/** Distance from (u, v) to a polyline through `points`. */
function distanceToPolyline(u: number, v: number, points: [number, number][]) {
	let best = Infinity;
	for (let i = 1; i < points.length; i++) {
		const [ax, ay] = points[i - 1];
		const [bx, by] = points[i];
		const dx = bx - ax;
		const dy = by - ay;
		const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
		best = Math.min(best, Math.hypot(u - ax - t * dx, v - ay - t * dy));
	}
	return best;
}

const PULSE: [number, number][] = [
	[-0.95, 0],
	[-0.4, 0],
	[-0.25, 0.45],
	[-0.08, -0.6],
	[0.12, 0.8],
	[0.3, 0],
	[0.95, 0],
];

const ROUTE: [number, number][] = [
	[-0.72, -0.55],
	[-0.24, 0.4],
	[0.24, -0.4],
	[0.72, 0.55],
];

const icons: Record<SonarIconName, (u: number, v: number) => boolean> = {
	// "Pipeline": a route of waypoints, one per stage the site passes through.
	route(u, v) {
		const node = ROUTE.map(([x, y]) => Math.hypot(u - x, v - y));
		const ring = node.some((d) => Math.abs(d - 0.14) < 0.05);
		const leg = distanceToPolyline(u, v, ROUTE) < 0.06 && node.every((d) => d > 0.19);
		return ring || leg;
	},
	// "About": an anchor, for the path that started with the Naval Academy exam.
	anchor(u, v) {
		const ring = Math.abs(Math.hypot(u, v - 0.66) - 0.13) < 0.05;
		const shank = Math.abs(u) < 0.05 && v > -0.72 && v < 0.52;
		const stock = Math.abs(v - 0.36) < 0.05 && Math.abs(u) < 0.34;
		const arms = Math.abs(Math.hypot(u, v + 0.02) - 0.7) < 0.05 && v < -0.3;
		const flukes = Math.abs(v + 0.32) < 0.06 && Math.abs(Math.abs(u) - 0.66) < 0.1;
		return ring || shank || stock || arms || flukes;
	},
	// "Stack": instrument bars, like signal strength meters.
	bars(u, v) {
		const heights = [0.55, 1.05, 0.75, 1.35, 0.9];
		return heights.some((h, i) => Math.abs(u - (i - 2) * 0.34) < 0.09 && v > -0.75 && v < -0.75 + h);
	},
	// "Activity": a sonar return pulse.
	pulse(u, v) {
		return distanceToPolyline(u, v, PULSE) < 0.06;
	},
	// "Time on patrol": a dial with hour ticks and one hand.
	dial(u, v) {
		const r = Math.hypot(u, v);
		const b = bearingOf(u, v);
		const nearHour = Math.min(b % 30, 30 - (b % 30)) < 6;
		return (
			Math.abs(r - 0.8) < 0.07 ||
			(r > 0.52 && r < 0.66 && nearHour) ||
			distanceToHand(u, v, 60, 0.45) < 0.06 ||
			r < 0.1
		);
	},
	// "Establishing communication": a mast with a base and waves broadcasting from its tip.
	antenna(u, v) {
		const tipV = 0.25;
		const d = Math.hypot(u, v - tipV);
		// Arcs on both sides of the tip, like (( · )), never above or below it.
		const fromUp = Math.abs((Math.atan2(u, v - tipV) * 180) / Math.PI);
		const wave = [0.3, 0.5, 0.7].some((k) => Math.abs(d - k) < 0.05) && fromUp > 50 && fromUp < 130;
		const mast = Math.abs(u) < 0.05 && v > -0.78 && v < tipV;
		const base = v > -0.88 && v < -0.76 && Math.abs(u) < 0.32;
		return wave || mast || base || d < 0.11;
	},
};

/** Small deterministic PRNG, so the build output is stable between runs. */
function seeded(seed: number) {
	let s = seed;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let x = Math.imul(s ^ (s >>> 15), 1 | s);
		x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
		return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
	};
}

export function sonarIconDots(name: SonarIconName): SonarDot[] {
	const random = seeded(name.length * 7919 + name.charCodeAt(0));
	const dots: SonarDot[] = [];
	const offset = (400 - STEP * (COUNT - 1)) / 2;
	for (let row = 0; row < COUNT; row++) {
		for (let col = 0; col < COUNT; col++) {
			const x = offset + col * STEP;
			const y = offset + row * STEP;
			if (!icons[name]((x - 200) / SCALE, (200 - y) / SCALE)) continue;
			const angle = random() * Math.PI * 2;
			const spread = 40 + random() * 80;
			dots.push({
				x,
				y,
				dx: Math.round(Math.cos(angle) * spread),
				dy: Math.round(Math.sin(angle) * spread),
				delay: Math.round(random() * 350 + (Math.hypot(x - 200, y - 200) / 200) * 250),
			});
		}
	}
	return dots;
}
