// Generates the Open Graph images (public/og/og-<locale>.png, 1200 × 630) with headless Chrome.
// Run `npm run og` after changing the name, role or position strings; the PNGs are committed,
// so builds and CI never need a browser. Set CHROME_PATH if Chrome is not in the default place.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { locales, ui } from '../src/i18n/ui.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const chrome =
	process.env.CHROME_PATH ??
	(process.platform === 'win32'
		? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
		: process.platform === 'darwin'
			? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
			: 'google-chrome');

const font = (path: string) => pathToFileURL(join(root, 'node_modules', path)).href;
const inter = font('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const mono = font('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2');

// The site's look: slate background under a blue glow (like the wallpapers), the gradient "JA"
// monogram, name, role and the two badges from the home page.
function page(locale: (typeof locales)[number]) {
	const t = ui[locale];
	return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url(${inter}) format('woff2');font-weight:100 900}
@font-face{font-family:Mono;src:url(${mono}) format('woff2')}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;color:#fafafa}
body{position:relative;display:grid;grid-template-columns:1fr 300px;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box;
  font-family:Inter;background:#11141b}
.glow{position:absolute;inset:0;z-index:-1;background:
  radial-gradient(45% 70% at 8% 0%,rgba(56,189,248,.45),transparent 70%),
  radial-gradient(60% 80% at 45% 0%,rgba(37,99,235,.6),transparent 72%),
  radial-gradient(50% 70% at 85% 10%,rgba(99,102,241,.5),transparent 70%),
  radial-gradient(60% 60% at 70% 110%,rgba(29,78,216,.35),transparent 70%)}
.site{margin:0 0 30px;color:#93c5fd;font:400 22px Mono;letter-spacing:.12em}
h1{margin:0;font-size:96px;font-weight:800;letter-spacing:-.035em;line-height:1}
.role{margin:26px 0 0;font-size:32px;color:#e2e8f0;white-space:nowrap}
.badges{display:flex;gap:14px;margin:44px 0 0}
.badge{display:inline-flex;align-items:center;gap:10px;padding:10px 20px;border:1px solid rgba(255,255,255,.18);border-radius:999px;
  background:rgba(17,20,27,.55);font-size:21px;font-weight:600}
.dot{width:12px;height:12px;border-radius:50%;background:#4ade80;box-shadow:0 0 12px #4ade80}
.mark{display:grid;place-items:center;width:300px;height:300px;border-radius:72px;
  background:linear-gradient(135deg,#38bdf8,#2563eb 55%,#6366f1);box-shadow:0 30px 90px rgba(37,99,235,.55);
  color:#fff;font-size:132px;font-weight:800;letter-spacing:-.05em}
</style></head><body>
<div class="glow"></div>
<div>
  <p class="site">joaoabreu.dev</p>
  <h1>${t['home.heading']}</h1>
  <p class="role">${t['home.role']}</p>
  <p class="badges"><span class="badge"><span class="dot"></span>${t['home.status']}</span><span class="badge">${t['home.location']}</span></p>
</div>
<div class="mark">JA</div>
</body></html>`;
}

const work = mkdtempSync(join(tmpdir(), 'og-'));
const out = join(root, 'public', 'og');
mkdirSync(out, { recursive: true });
try {
	for (const locale of locales) {
		const html = join(work, `${locale}.html`);
		writeFileSync(html, page(locale));
		const png = join(out, `og-${locale}.png`);
		execFileSync(chrome, [
			'--headless=new',
			'--disable-gpu',
			'--hide-scrollbars',
			'--force-device-scale-factor=1',
			'--virtual-time-budget=3000',
			'--window-size=1200,630',
			`--screenshot=${png}`,
			pathToFileURL(html).href,
		]);
		console.log(`[og] public/og/og-${locale}.png`);
	}
} finally {
	rmSync(work, { recursive: true, force: true });
}
