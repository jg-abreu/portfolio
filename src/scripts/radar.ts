/**
 * Radar island: section-aware status, pause when off-screen, sonar ping on click and
 * highlighting the contact of the project card under the pointer or keyboard focus.
 * The sweep and blip flashes themselves are CSS animations (see RadarPanel.astro).
 */
const panel = document.querySelector<HTMLElement>('[data-radar]');

if (panel) {
	const status = panel.querySelector<HTMLElement>('[data-radar-status]');
	const scope = panel.querySelector<HTMLElement>('.scope');
	const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
	const states = ['projects', 'signals', 'contact'];

	// Status follows the section on screen; scroll-fx publishes it on <html> and as an event.
	function setState(section: string | undefined) {
		const state = section && states.includes(section) ? section : 'hero';
		panel!.dataset.state = state;
		if (status) status.textContent = panel!.getAttribute(`data-state-${state}`) ?? '';
	}
	setState(document.documentElement.dataset.section);
	document.addEventListener('fx:section', (e) => setState((e as CustomEvent<{ id?: string }>).detail.id));

	// No animation work while the panel is off-screen (phones) or the tab is hidden.
	let onScreen = true;
	const syncPaused = () => panel.classList.toggle('is-paused', !onScreen || document.hidden);
	new IntersectionObserver(([entry]) => {
		onScreen = entry.isIntersecting;
		syncPaused();
	}).observe(panel);
	document.addEventListener('visibilitychange', syncPaused);

	// Ping: a ring expands from the center at constant speed and each contact echoes as it is reached.
	const PING_MS = 1600;
	scope?.addEventListener('click', () => {
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

		for (const echo of panel.querySelectorAll<SVGCircleElement>('.echo')) {
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

	// Hovering or focusing a project card lights its contact on the scope and in the readout.
	const focusProject = (id: string | null) => {
		for (const el of panel.querySelectorAll<HTMLElement | SVGElement>('[data-project]')) {
			el.classList.toggle('is-focus', el.dataset.project === id);
		}
	};
	for (const card of document.querySelectorAll<HTMLElement>('main [data-project]')) {
		const id = card.dataset.project ?? null;
		card.addEventListener('pointerenter', () => focusProject(id));
		card.addEventListener('pointerleave', () => focusProject(null));
		card.addEventListener('focusin', () => focusProject(id));
		card.addEventListener('focusout', () => focusProject(null));
	}
}
