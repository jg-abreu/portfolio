// Theme switch: the head script already set data-theme before the first paint; this keeps the
// attribute, the browser bar color and the toggle in sync. A stored choice wins over the system.
type Theme = 'light' | 'dark';

const themeRoot = document.documentElement;
const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const prefersLight = matchMedia('(prefers-color-scheme: light)');
const toggles = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
// Same values as --bg in Base.astro.
const barColors: Record<Theme, string> = { light: '#F5F2EA', dark: '#070D1C' };

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

for (const toggle of toggles) {
	toggle.hidden = false;
	toggle.addEventListener('click', () => {
		const next: Theme = themeRoot.dataset.theme === 'light' ? 'dark' : 'light';
		try {
			localStorage.setItem('theme', next);
		} catch {
			// Private mode or storage disabled: the switch still works for this page.
		}
		apply(next);
	});
}

prefersLight.addEventListener('change', (event) => {
	if (!storedTheme()) apply(event.matches ? 'light' : 'dark');
});

apply(themeRoot.dataset.theme === 'light' ? 'light' : 'dark');
