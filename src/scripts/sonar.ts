/**
 * Sonar islands:
 * - section displays ([data-display]) switch on when they come into view, so their icon assembles,
 *   and off as they scroll away, so it dissolves;
 * - radar scopes ([data-scope]) pause off-screen and send a ping on click;
 * - hovering or focusing a project card lights its contact on the scope and in the readout.
 * Sweeps and blip flashes are CSS animations (RadarScope.astro); icon motion is CSS transitions
 * (SonarIcon.astro), so this file only toggles classes.
 */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// On at 30% visible, off below 10%: the gap keeps a display from flickering at the threshold.
const displayObserver = new IntersectionObserver(
	(entries) => {
		for (const entry of entries) {
			const el = entry.target as HTMLElement;
			if (entry.intersectionRatio >= 0.3) el.classList.add('is-on');
			else if (entry.intersectionRatio < 0.1) el.classList.remove('is-on');
		}
	},
	{ threshold: [0, 0.1, 0.3] },
);
document.querySelectorAll('[data-display]').forEach((el) => displayObserver.observe(el));

// No animation work while a scope is off-screen or the tab is hidden.
const visibleScopes = new Set<Element>();
const scopes = [...document.querySelectorAll<HTMLElement>('[data-scope]')];
const syncPaused = () => {
	for (const scope of scopes) scope.classList.toggle('is-paused', document.hidden || !visibleScopes.has(scope));
};
const scopeObserver = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		if (entry.isIntersecting) visibleScopes.add(entry.target);
		else visibleScopes.delete(entry.target);
	}
	syncPaused();
});
scopes.forEach((scope) => scopeObserver.observe(scope));
document.addEventListener('visibilitychange', syncPaused);

// Ping: a ring expands from the center at constant speed and each contact echoes as it is reached.
const PING_MS = 1600;
for (const scope of scopes) {
	scope.addEventListener('click', () => {
		if (reduceMotion.matches) return;
		const ring = document.createElement('span');
		ring.className = 'ping';
		scope.append(ring);
		ring
			.animate(
				[
					{ transform: 'scale(0)', opacity: 0.9 },
					{ transform: 'scale(1)', opacity: 0 },
				],
				{ duration: PING_MS, easing: 'linear' },
			)
			.finished.then(() => ring.remove());

		for (const echo of scope.querySelectorAll<SVGCircleElement>('.echo')) {
			const distance = Math.hypot(echo.cx.baseVal.value - 200, echo.cy.baseVal.value - 200) / 180;
			echo.animate(
				[
					{ transform: 'scale(0.4)', opacity: 1 },
					{ transform: 'scale(1.8)', opacity: 0 },
				],
				{ duration: 700, delay: distance * PING_MS, easing: 'ease-out' },
			);
		}
	});
}

// Project card ↔ its contact on the scope (.blip) and in the readout ([data-contact]).
const contactParts = [...document.querySelectorAll<HTMLElement | SVGElement>('.blip[data-project], [data-contact]')];
const focusProject = (id: string | null) => {
	for (const el of contactParts) {
		el.classList.toggle('is-focus', (el.dataset.project ?? el.dataset.contact) === id);
	}
};
for (const card of document.querySelectorAll<HTMLElement>('article[data-project]')) {
	const id = card.dataset.project ?? null;
	card.addEventListener('pointerenter', () => focusProject(id));
	card.addEventListener('pointerleave', () => focusProject(null));
	card.addEventListener('focusin', () => focusProject(id));
	card.addEventListener('focusout', () => focusProject(null));
}
