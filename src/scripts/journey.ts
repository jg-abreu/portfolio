/**
 * The pipeline page ("How this site reaches you").
 *
 * 1. Scroll: a packet rides the rail as the page scrolls and every station it reaches lights up
 *    (transform and opacity only; only with .fx, which the head script skips under reduced motion).
 * 2. Live facts about this very visit, all real and read in the browser:
 *    - Navigation Timing: how long DNS, connection, TLS, server response, download and render took.
 *    - The page's own response headers (a same-origin HEAD request).
 *    - Cloudflare's /cdn-cgi/trace: the data center, HTTP version and TLS version of this visit.
 *    - The latest run of the deploy workflow from the public GitHub API (cached for 10 minutes).
 *    Whatever cannot be read stays as it is (a dash, or a note that it shows up on the live site).
 */
import { GITHUB_USER } from '../lib/github-data';

const root = document.documentElement;
const lang = root.lang || undefined;
const pt = (lang ?? '').startsWith('pt');
const journey = document.querySelector<HTMLElement>('[data-journey]');

// ---------- 1. Scroll-driven packet ----------

if (journey && root.classList.contains('fx')) {
	const rail = journey.querySelector<HTMLElement>('.rail');
	const stations = [...journey.querySelectorAll<HTMLElement>('[data-station]')];
	let ticking = false;

	const update = () => {
		ticking = false;
		if (!rail) return;
		const box = rail.getBoundingClientRect();
		// The packet sits where the middle of the screen crosses the rail.
		const line = innerHeight * 0.55;
		const progress = Math.min(Math.max((line - box.top) / box.height, 0), 1);
		journey.style.setProperty('--progress', progress.toFixed(4));
		journey.style.setProperty('--packet', `${(progress * box.height).toFixed(1)}px`);
		for (const station of stations) {
			const node = station.querySelector('.node')?.getBoundingClientRect();
			if (node) station.classList.toggle('on', node.top + node.height / 2 <= line + 1);
		}
	};
	const request = () => {
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(update);
		}
	};

	journey.dataset.ready = '';
	update();
	addEventListener('scroll', request, { passive: true });
	addEventListener('resize', request);
}

// ---------- Helpers ----------

const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
const ms = (value: number) => `${numberFormat.format(Math.max(0, value))} ms`;
const setText = (selector: string, text: string) => {
	for (const el of document.querySelectorAll<HTMLElement>(selector)) el.textContent = text;
};

// Cloudflare data centers are named by the nearest airport code; the common ones get a city name.
const cities: Record<string, [string, string]> = {
	GIG: ['Rio de Janeiro', 'Rio de Janeiro'],
	GRU: ['São Paulo', 'São Paulo'],
	VCP: ['Campinas', 'Campinas'],
	BSB: ['Brasília', 'Brasília'],
	CNF: ['Belo Horizonte', 'Belo Horizonte'],
	CWB: ['Curitiba', 'Curitiba'],
	POA: ['Porto Alegre', 'Porto Alegre'],
	FLN: ['Florianópolis', 'Florianópolis'],
	SSA: ['Salvador', 'Salvador'],
	REC: ['Recife', 'Recife'],
	FOR: ['Fortaleza', 'Fortaleza'],
	BEL: ['Belém', 'Belém'],
	MAO: ['Manaus', 'Manaus'],
	EZE: ['Buenos Aires', 'Buenos Aires'],
	SCL: ['Santiago', 'Santiago'],
	LIM: ['Lima', 'Lima'],
	BOG: ['Bogotá', 'Bogotá'],
	MIA: ['Miami', 'Miami'],
	ATL: ['Atlanta', 'Atlanta'],
	IAD: ['Ashburn', 'Ashburn'],
	EWR: ['Newark', 'Newark'],
	ORD: ['Chicago', 'Chicago'],
	DFW: ['Dallas', 'Dallas'],
	LAX: ['Los Angeles', 'Los Angeles'],
	SJC: ['San Jose', 'San José'],
	SEA: ['Seattle', 'Seattle'],
	YYZ: ['Toronto', 'Toronto'],
	LIS: ['Lisbon', 'Lisboa'],
	MAD: ['Madrid', 'Madri'],
	LHR: ['London', 'Londres'],
	CDG: ['Paris', 'Paris'],
	AMS: ['Amsterdam', 'Amsterdã'],
	FRA: ['Frankfurt', 'Frankfurt'],
	NRT: ['Tokyo', 'Tóquio'],
	SIN: ['Singapore', 'Singapura'],
	SYD: ['Sydney', 'Sydney'],
};
const coloName = (code: string) => {
	const city = cities[code];
	return city ? `${code} · ${city[pt ? 1 : 0]}` : code;
};

// ---------- 2a. Navigation Timing of this visit ----------

function showTimings() {
	const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
	if (!nav) return;
	const ready = nav.loadEventEnd > 0 ? nav.loadEventEnd : nav.domContentLoadedEventEnd;
	if (!(ready > 0)) return;
	const tlsStart = nav.secureConnectionStart > 0 ? nav.secureConnectionStart : 0;
	const phases: Record<string, [number, number]> = {
		dns: [nav.domainLookupStart, nav.domainLookupEnd],
		connect: [nav.connectStart, tlsStart || nav.connectEnd],
		tls: [tlsStart || nav.connectEnd, nav.connectEnd],
		wait: [nav.requestStart, nav.responseStart],
		download: [nav.responseStart, nav.responseEnd],
		render: [nav.responseEnd, ready],
	};
	for (const [id, [start, end]] of Object.entries(phases)) {
		const row = document.querySelector<HTMLElement>(`[data-phase="${id}"]`);
		if (!row) continue;
		const bar = row.querySelector<HTMLElement>('.bar');
		const label = row.querySelector<HTMLElement>('.ms');
		const length = Math.max(0, end - start);
		if (bar) {
			bar.style.left = `${(Math.max(0, start) / ready) * 100}%`;
			bar.style.width = `${(length / ready) * 100}%`;
		}
		if (label) label.textContent = ms(length);
	}
	setText('[data-you="total"]', ms(ready));
	setText('[data-receipt="total"]', ms(ready));
	const waterfall = document.querySelector<HTMLElement>('[data-waterfall]');
	setText(
		'[data-you="bytes"]',
		nav.transferSize > 0
			? `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(nav.transferSize / 1024)} KB`
			: (waterfall?.dataset.cached ?? '—'),
	);
	const protocols: Record<string, string> = { h3: 'HTTP/3', h2: 'HTTP/2', 'http/1.1': 'HTTP/1.1' };
	if (nav.nextHopProtocol) setText('[data-you="protocol"]', protocols[nav.nextHopProtocol] ?? nav.nextHopProtocol);
}

if (document.readyState === 'complete') setTimeout(showTimings, 0);
else addEventListener('load', () => setTimeout(showTimings, 0), { once: true });

// ---------- 2b. Response headers and Cloudflare trace ----------

const HEADERS = [
	'server',
	'content-type',
	'cache-control',
	'strict-transport-security',
	'content-security-policy',
	'x-content-type-options',
	'x-frame-options',
	'referrer-policy',
	'permissions-policy',
	'cf-cache-status',
	'cf-ray',
];

function element(tag: string, className: string, text: string) {
	const el = document.createElement(tag);
	el.className = className;
	el.textContent = text;
	return el;
}

async function showHeaders(): Promise<Headers | null> {
	const box = document.querySelector<HTMLElement>('[data-headers]');
	const code = box?.querySelector('code');
	if (!box || !code) return null;
	try {
		const response = await fetch(location.pathname, { method: 'HEAD', cache: 'no-cache' });
		const rows = HEADERS.filter((name) => response.headers.has(name));
		if (rows.length === 0) throw new Error('no headers');
		code.replaceChildren();
		code.append(element('span', 'dim', `HTTP ${response.status} ${response.statusText || 'OK'}\n`));
		for (const name of rows) {
			const value = response.headers.get(name) ?? '';
			code.append(element('span', 'hl', `${name}: `));
			code.append(document.createTextNode(`${value.length > 72 ? `${value.slice(0, 71)}…` : value}\n`));
		}
		return response.headers;
	} catch {
		code.replaceChildren(element('span', 'dim', box.dataset.none ?? ''));
		return null;
	}
}

async function showEdge(headers: Headers | null) {
	const set = (key: string, value: string) => setText(`[data-edge-value="${key}"]`, value);
	const cache = headers?.get('cf-cache-status');
	if (cache && /^[A-Z]+$/.test(cache)) set('cache', cache);

	let colo = '';
	try {
		const response = await fetch('/cdn-cgi/trace', { cache: 'no-store' });
		const text = response.ok ? await response.text() : '';
		const trace = Object.fromEntries(
			text
				.split('\n')
				.map((line) => line.split('='))
				.filter((pair) => pair.length === 2),
		) as Record<string, string>;
		if (/^[A-Z]{3}$/.test(trace.colo ?? '')) {
			colo = trace.colo;
			if (/^http\/[\d.]+$/.test(trace.http ?? '')) set('http', trace.http.toUpperCase());
			if (/^TLSv[\d.]+$/.test(trace.tls ?? '')) set('tls', trace.tls.replace('TLSv', 'TLS '));
		}
	} catch {
		// Not behind Cloudflare (local preview): fall back to the cf-ray header, if any.
	}
	if (!colo) colo = /-([A-Z]{3})$/.exec(headers?.get('cf-ray') ?? '')?.[1] ?? '';

	if (colo) {
		set('colo', coloName(colo));
		setText('[data-receipt="colo"]', coloName(colo));
	} else {
		document.querySelector<HTMLElement>('[data-edge-missing]')?.removeAttribute('hidden');
		setText('[data-receipt="colo"]', '—');
	}
}

showHeaders().then(showEdge);

// ---------- 2c. Latest deploy run ----------

interface Run {
	status: string;
	conclusion: string | null;
	started: string;
	updated: string;
	url: string;
}

const RUN_KEY = 'portfolio:deploy-run:v2';
const RUN_MS = 10 * 60 * 1000;

function validRun(raw: unknown): Run | null {
	const r = raw as Record<string, unknown> | null;
	if (!r || typeof r !== 'object') return null;
	const { status, conclusion, run_started_at: started, updated_at: updated, html_url: url } = r;
	if (typeof status !== 'string' || typeof started !== 'string' || typeof updated !== 'string') return null;
	if (typeof url !== 'string' || !url.startsWith(`https://github.com/${GITHUB_USER}/portfolio/actions/runs/`)) return null;
	if (Number.isNaN(Date.parse(started)) || Number.isNaN(Date.parse(updated))) return null;
	return { status, conclusion: typeof conclusion === 'string' ? conclusion : null, started, updated, url };
}

async function latestRun(): Promise<Run | null> {
	try {
		const cached = JSON.parse(localStorage.getItem(RUN_KEY) ?? 'null') as { at: number; run: unknown } | null;
		if (cached && Date.now() - cached.at < RUN_MS) return validRun(cached.run);
	} catch {
		// Storage unavailable or corrupt: ask GitHub instead.
	}
	try {
		const response = await fetch(
			`https://api.github.com/repos/${GITHUB_USER}/portfolio/actions/workflows/deploy.yml/runs?per_page=1`,
			{ headers: { Accept: 'application/vnd.github+json' } },
		);
		if (!response.ok) return null;
		const run = validRun(((await response.json()) as { workflow_runs?: unknown[] }).workflow_runs?.[0]);
		if (run) {
			try {
				// Stored in the API's own shape, so the cached copy goes through the same validation.
				const raw = {
					status: run.status,
					conclusion: run.conclusion,
					run_started_at: run.started,
					updated_at: run.updated,
					html_url: run.url,
				};
				localStorage.setItem(RUN_KEY, JSON.stringify({ at: Date.now(), run: raw }));
			} catch {
				// Not cached this time.
			}
		}
		return run;
	} catch {
		return null;
	}
}

function ago(date: Date) {
	const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
	const minutes = Math.round((date.getTime() - Date.now()) / 60000);
	if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 48) return rtf.format(hours, 'hour');
	return rtf.format(Math.round(hours / 24), 'day');
}

function duration(seconds: number) {
	const m = Math.floor(seconds / 60);
	const s = Math.round(seconds % 60);
	return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

latestRun().then((run) => {
	const box = document.querySelector<HTMLElement>('[data-run]');
	if (!run || !box) return;
	const state = run.status !== 'completed' ? 'running' : run.conclusion === 'success' ? 'ok' : 'fail';
	const parts = [box.dataset[state] ?? '', ago(new Date(run.started))];
	if (state !== 'running') {
		const seconds = (Date.parse(run.updated) - Date.parse(run.started)) / 1000;
		if (seconds > 0) parts.push((box.dataset.took ?? '{t}').replace('{t}', duration(seconds)));
	}
	box.dataset.state = state;
	const link = box.querySelector<HTMLAnchorElement>('[data-run-link]');
	if (link) link.href = run.url;
	setText('[data-run-text]', parts.join(' · '));
	box.hidden = false;
});
