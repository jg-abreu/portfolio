// Theme switch: the head script already set data-theme before the first paint; this keeps the
// attribute, the browser bar color and the toggle in sync. A stored choice wins over the system.
type Theme = 'light' | 'dark';

const themeRoot = document.documentElement;
const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const prefersLight = matchMedia('(prefers-color-scheme: light)');
const toggles = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
// Same values as --bg in Base.astro.
const barColors: Record<Theme, string> = { light: '#FFFFFF', dark: '#11141b' };

function storedTheme(): Theme | null {
	try {
		const value = localStorage.getItem('theme');
		return value === 'light' || value === 'dark' ? value : null;
	} catch {
		return null;
	}
}

function apply(theme: Theme) {
	themeRoot.dataset.theme = theme;
	meta?.setAttribute('content', barColors[theme]);
	for (const toggle of toggles) toggle.setAttribute('aria-pressed', String(theme === 'light'));
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let fadeTimer: number | undefined;

// The new theme grows as a circle from the toggle (View Transitions API). Without the API the
// colors fade instead; with reduced motion the switch is instant.
function switchTo(theme: Theme, from: HTMLElement) {
	if (reducedMotion.matches) return apply(theme);

	if (!document.startViewTransition) {
		themeRoot.classList.add('theme-fading');
		apply(theme);
		clearTimeout(fadeTimer);
		fadeTimer = window.setTimeout(() => themeRoot.classList.remove('theme-fading'), 500);
		return;
	}

	const box = from.getBoundingClientRect();
	const x = box.left + box.width / 2;
	const y = box.top + box.height / 2;
	const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
	const transition = document.startViewTransition(() => apply(theme));
	transition.ready
		.then(() => {
			themeRoot.animate(
				{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
				{ duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
			);
		})
		.catch(() => {
			// The transition was skipped (another one started); the theme is already applied.
		});
}

for (const toggle of toggles) {
	toggle.hidden = false;
	toggle.addEventListener('click', () => {
		const next: Theme = themeRoot.dataset.theme === 'light' ? 'dark' : 'light';
		try {
			localStorage.setItem('theme', next);
		} catch {
			// Private mode or storage disabled: the switch still works for this page.
		}
		switchTo(next, toggle);
	});
}

prefersLight.addEventListener('change', (event) => {
	if (!storedTheme()) apply(event.matches ? 'light' : 'dark');
});

apply(themeRoot.dataset.theme === 'light' ? 'light' : 'dark');
