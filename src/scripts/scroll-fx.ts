/**
 * Scroll effects: reading progress bar, active section in the header nav, and reveal-on-scroll
 * for elements marked with [data-reveal] (fade and rise) or [data-split] (words rise one by one).
 *
 * Reveals only run when the inline head script added `fx` to <html>, which it skips under
 * prefers-reduced-motion; without it every element is simply visible.
 */
const root = document.documentElement;

const bar = document.querySelector<HTMLElement>('.progress');
const links = [...document.querySelectorAll<HTMLAnchorElement>('.sections a')];
const targets = links.map((a) => document.getElementById(a.hash.slice(1)));

let ticking = false;
function update() {
	ticking = false;
	const max = root.scrollHeight - innerHeight;
	if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;

	// The current section is the last one whose top has passed 40% of the viewport.
	let current = -1;
	targets.forEach((section, i) => {
		if (section && section.getBoundingClientRect().top <= innerHeight * 0.4) current = i;
	});
	links.forEach((a, i) => {
		if (i === current) a.setAttribute('aria-current', 'true');
		else a.removeAttribute('aria-current');
	});
}
function requestUpdate() {
	if (!ticking) {
		ticking = true;
		requestAnimationFrame(update);
	}
}
addEventListener('scroll', requestUpdate, { passive: true });
addEventListener('resize', requestUpdate);
update();

if (root.classList.contains('fx')) {
	// Wrap each word so it can rise from behind its own mask; the text stays readable as-is.
	for (const el of document.querySelectorAll<HTMLElement>('[data-split]')) {
		const words = (el.textContent ?? '').trim().split(/\s+/);
		el.textContent = '';
		words.forEach((word, i) => {
			const mask = document.createElement('span');
			mask.className = 'w';
			const inner = document.createElement('span');
			inner.style.setProperty('--i', String(i));
			inner.textContent = word;
			mask.append(inner);
			el.append(mask);
			if (i < words.length - 1) el.append(' ');
		});
	}

	// Reveal once 15% is visible, or a fifth of the screen for blocks taller than the viewport.
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const visible =
					entry.isIntersecting &&
					(entry.intersectionRatio >= 0.15 || entry.intersectionRect.height >= innerHeight * 0.2);
				if (visible) {
					entry.target.classList.add('in');
					observer.unobserve(entry.target);
				}
			}
		},
		{ threshold: [0, 0.05, 0.1, 0.15], rootMargin: '0px 0px -6% 0px' },
	);
	document.querySelectorAll('[data-reveal], [data-split]').forEach((el) => observer.observe(el));

	// Tells the head script's safety timer that reveals are running.
	root.dataset.fxReady = '';
}
