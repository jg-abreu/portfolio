// A fixed-size gradient moves with transform only; touch and reduced motion keep static cards.
const glowMedia = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');

for (const card of document.querySelectorAll<HTMLElement>('.card')) {
	const glow = document.createElement('span');
	glow.className = 'card-glow';
	glow.setAttribute('aria-hidden', 'true');
	card.prepend(glow);
	let frame = 0;
	let x = 0;
	let y = 0;
	const clear = () => {
		cancelAnimationFrame(frame);
		frame = 0;
		glow.classList.remove('is-active');
	};
	card.addEventListener('pointermove', (event) => {
		if (!glowMedia.matches || event.pointerType !== 'mouse') return;
		const bounds = card.getBoundingClientRect();
		x = event.clientX - bounds.left - card.clientLeft;
		y = event.clientY - bounds.top - card.clientTop;
		if (!frame) {
			frame = requestAnimationFrame(() => {
				frame = 0;
				glow.style.transform = `translate(${x - 160}px, ${y - 160}px)`;
				glow.classList.add('is-active');
			});
		}
	});
	card.addEventListener('pointerleave', clear);
	card.addEventListener('pointercancel', clear);
	glowMedia.addEventListener('change', clear);
}
