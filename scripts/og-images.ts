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

// Same scope as the site's radar: dashed rings, crosshair, a static sweep and a few contacts.
const rings = [60, 120, 180].map((r) => `<circle cx="200" cy="200" r="${r}" class="ring"/>`).join('');
const ticks = Array.from({ length: 36 }, (_, i) => i * 10)
	.map((d) => `<line x1="200" y1="${d % 90 === 0 ? 8 : 14}" x2="200" y2="20" transform="rotate(${d} 200 200)" class="axis"/>`)
	.join('');
const blips = [
	[242, 158],
	[242, 242],
	[158, 242],
	[158, 158],
]
	.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" class="blip"/>`)
	.join('');

function page(locale: (typeof locales)[number]) {
	const t = ui[locale];
	return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url(${inter}) format('woff2');font-weight:100 900}
@font-face{font-family:Mono;src:url(${mono}) format('woff2')}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#070D1C;color:#E3E8F7}
body{display:grid;grid-template-columns:1fr 380px;align-items:center;gap:48px;padding:0 72px;box-sizing:border-box;
  background:radial-gradient(circle at 78% 50%,rgba(111,140,255,.12),transparent 55%),#070D1C;font-family:Inter}
.label{margin:0 0 28px;color:#6F8CFF;font:400 22px Mono;letter-spacing:.18em}
h1{margin:0;font-size:92px;font-weight:700;letter-spacing:-.02em;line-height:1}
.role{margin:28px 0 0;font-size:31px;white-space:nowrap}
.meta{display:grid;gap:10px;margin:56px 0 0;color:#8F9AB8;font:400 19px Mono;letter-spacing:.12em}
.meta b{color:#6F8CFF;font-weight:400;font-size:24px}
svg{width:380px;height:380px}
.ring{fill:none;stroke:#1F3D99;stroke-width:1.5;stroke-dasharray:4 6}.axis{stroke:#1F3D99;stroke-width:1}
.blip,.origin{fill:#6F8CFF}
</style></head><body>
<div>
  <p class="label">${t['radar.active']}</p>
  <h1>${t['home.heading']}</h1>
  <p class="role">${t['home.role']}</p>
  <p class="meta"><b>joaoabreu.dev</b><span>${t['panel.position']}</span></p>
</div>
<svg viewBox="0 0 400 400">
  <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6F8CFF" stop-opacity="0"/><stop offset="1" stop-color="#6F8CFF" stop-opacity=".45"/></linearGradient></defs>
  ${rings}<line x1="20" y1="200" x2="380" y2="200" class="axis"/><line x1="200" y1="20" x2="200" y2="380" class="axis"/>${ticks}
  <path d="M200 200 L200 20 A180 180 0 0 1 355.9 110 Z" fill="url(#g)"/>
  <line x1="200" y1="200" x2="355.9" y2="110" stroke="#6F8CFF" stroke-width="3"/>
  ${blips}<circle cx="200" cy="200" r="5" class="origin"/>
</svg>
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
