/**
 * Where a contact sits on the 400 × 400 radar scope. Pure math, shared by the build (lib/radar.ts)
 * and the browser (scripts/github-live.ts), so live data moves blips with the same scale.
 */
export const CENTER = 200;
const R_MIN = 45;
const R_MAX = 170;

/** Days since the last push on a log scale: today near the center, a year or more on the edge. */
export function radiusForDays(days: number | null): number {
	if (days === null) return R_MAX;
	return R_MIN + (R_MAX - R_MIN) * Math.min(1, Math.log1p(days) / Math.log1p(365));
}

export function pointAt(bearing: number, r: number): { x: number; y: number } {
	const rad = (bearing * Math.PI) / 180;
	return { x: +(CENTER + r * Math.sin(rad)).toFixed(1), y: +(CENTER - r * Math.cos(rad)).toFixed(1) };
}
