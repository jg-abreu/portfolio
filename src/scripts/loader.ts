/**
 * Intro loader (markup and styles in Base.astro), modeled on augustogalego.com. The head script
 * adds .intro to <html> when the site is entered from outside or reloaded; this fills the bar and
 * the percentage and lifts the loader after about 1.5 s.
 *
 * The number climbs smoothly with time but never past the real milestone reached so far:
 *   - this module runs (the HTML has been parsed) → up to 60%
 *   - document.fonts.ready                        → up to 85%
 *   - window load, and at least MIN_MS on screen  → 100%, then a 0.3 s fade
 * Unlike a random counter, a slow page shows up as a bar that waits.
 */
const html = document.documentElement;
const loader = document.querySelector<HTMLElement>('[data-loader]');

if (loader && html.classList.contains('intro')) {
	const pct = loader.querySelector<HTMLElement>('[data-loader-pct]');
	const bar = loader.querySelector<HTMLElement>('[data-loader-bar]');
	const MIN_MS = 1500;
	const MAX_MS = 3500;
	const started = performance.now();
	let shown = 0;
	let milestone = 60;
	let finished = false;

	const finish = () => {
		if (finished) return;
		finished = true;
		loader.classList.add('done');
		// The page's own reveals start once the class is gone (see Base.astro).
		setTimeout(() => html.classList.remove('intro'), 300);
	};

	const tick = () => {
		const t = Math.min((performance.now() - started) / MIN_MS, 1);
		// Eases out toward 95% over MIN_MS; the last step waits for the page to load.
		const byTime = 95 * (1 - (1 - t) ** 2);
		const goal = milestone >= 100 ? 100 : Math.min(milestone, byTime);
		shown += (goal - shown) * 0.2;
		if (goal - shown < 0.5) shown = goal;
		if (pct) pct.textContent = String(Math.round(shown));
		if (bar) bar.style.transform = `scaleX(${shown / 100})`;
		if (shown >= 100) {
			setTimeout(finish, 120);
			return;
		}
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);

	document.fonts?.ready.then(() => {
		milestone = Math.max(milestone, 85);
	});

	const loaded = () => {
		const wait = Math.max(0, MIN_MS - (performance.now() - started));
		setTimeout(() => (milestone = 100), wait);
	};
	if (document.readyState === 'complete') loaded();
	else addEventListener('load', loaded, { once: true });

	// Never keep the visitor waiting on a slow resource.
	setTimeout(() => (milestone = 100), MAX_MS);
}

export {};
