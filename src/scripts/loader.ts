/**
 * Intro loader (markup and styles in Base.astro). The head script adds .intro to <html> on the
 * first page of a browser session; this moves the bar and the percentage toward real milestones
 * and lifts the loader when the page has loaded:
 *   - this module runs: the HTML has been parsed  → 60%
 *   - document.fonts.ready                         → 85%
 *   - window load (and at least MIN_MS on screen)  → 100%, then it fades out
 * The number eases toward each milestone; it never counts up on its own.
 */
const html = document.documentElement;
const loader = document.querySelector<HTMLElement>('[data-loader]');

if (loader && html.classList.contains('intro')) {
	const pct = loader.querySelector<HTMLElement>('[data-loader-pct]');
	const bar = loader.querySelector<HTMLElement>('[data-loader-bar]');
	const MIN_MS = 900;
	const MAX_MS = 3500;
	const started = performance.now();
	let shown = 0;
	let target = 60;
	let finished = false;

	const finish = () => {
		if (finished) return;
		finished = true;
		loader.classList.add('done');
		// The page's own reveals start once the class is gone (see Base.astro).
		setTimeout(() => html.classList.remove('intro'), 400);
	};

	const tick = () => {
		shown += Math.max(0.5, (target - shown) * 0.14);
		if (shown > target) shown = target;
		if (pct) pct.textContent = String(Math.round(shown));
		if (bar) bar.style.transform = `scaleX(${shown / 100})`;
		if (shown >= 100) {
			setTimeout(finish, 150);
			return;
		}
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);

	document.fonts?.ready.then(() => {
		target = Math.max(target, 85);
	});

	const loaded = () => {
		const wait = Math.max(0, MIN_MS - (performance.now() - started));
		setTimeout(() => (target = 100), wait);
	};
	if (document.readyState === 'complete') loaded();
	else addEventListener('load', loaded, { once: true });

	// Never keep the visitor waiting on a slow resource.
	setTimeout(() => (target = 100), MAX_MS);
}

export {};
