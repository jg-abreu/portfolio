import { LoadSimulation, instanceFor, scheduleCount, type Instance, type Outcome } from '../lib/load-sim';

const section = document.querySelector<HTMLElement>('[data-loadsim]');
if (section) initialize(section);

function initialize(section: HTMLElement) {
  const q = <T extends Element>(selector: string) => section.querySelector<T>(selector)!;
  const form = q<HTMLFormElement>('[data-lb-form]');
  const stage = q<HTMLElement>('[data-lb-stage]');
  const toggle = q<HTMLButtonElement>('[data-lb-toggle]');
  const summary = q<HTMLElement>('[data-lb-summary]');
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = 100;
  const othersRate = 0.2;
  let you = 'you';
  let simulation: LoadSimulation;
  let counts: Record<'cache' | Instance | 'limited', number>;
  let elapsed = 0;
  let timer = 0;
  let alive = 0;
  let lastSummary = 0;
  let next = 0;

  const value = (name: string) => Number((form.elements.namedItem(name) as HTMLInputElement).value);
  const route = () => (form.querySelector<HTMLInputElement>('input[name="route"]:checked')?.value === 'page' ? 'page' : 'assistant');
  const down = () => new Set<Instance>((form.elements.namedItem('downB') as HTMLInputElement).checked ? ['B'] : []);

  function reset() {
    simulation = new LoadSimulation(route(), down());
    counts = { cache: 0, A: 0, B: 0, limited: 0 };
    elapsed = 0;
    next = 0;
    render(true);
    const offline = down().has('B');
    q<HTMLElement>('[data-lb-target="B"]').classList.toggle('off', offline);
    q<HTMLElement>('[data-lb-offline]').hidden = !offline;
  }

  function render(announce = false) {
    for (const key of Object.keys(counts) as (keyof typeof counts)[])
      q<HTMLElement>(`[data-lb-count="${key}"]`).textContent = counts[key].toLocaleString(document.documentElement.lang || undefined);
    const now = performance.now();
    if (!announce && now - lastSummary < 2000) return;
    lastSummary = now;
    const total = counts.cache + counts.A + counts.B + counts.limited;
    summary.textContent = (section.dataset.summary ?? '').replace('{total}', String(total)).replace('{cache}', String(counts.cache))
      .replace('{a}', String(counts.A)).replace('{b}', String(counts.B)).replace('{limited}', String(counts.limited));
  }

  function center(element: HTMLElement) {
    const box = element.getBoundingClientRect();
    const base = stage.getBoundingClientRect();
    return { x: box.left - base.left + box.width / 2, y: box.top - base.top + box.height / 2 };
  }

  function dot(outcome: Outcome) {
    if (!motion || alive >= 40 || document.visibilityState !== 'visible') return;
    const key = outcome === 'down' ? 'limited' : outcome;
    const from = center(q<HTMLElement>('[data-lb-target="source"]'));
    const to = center(q<HTMLElement>(`[data-lb-target="${key}"]`));
    const element = document.createElement('span');
    element.className = `dot ${key === 'cache' || key === 'limited' ? key : ''}`;
    stage.append(element);
    alive++;
    const jitter = (Math.random() - 0.5) * 18;
    const animation = element.animate([
      { transform: `translate(${from.x}px, ${from.y + jitter}px)`, opacity: 0 },
      { transform: `translate(${(from.x + to.x) / 2}px, ${(from.y + to.y) / 2 + jitter}px)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${to.x}px, ${to.y}px)`, opacity: 0 },
    ], { duration: 700, easing: 'ease-in-out' });
    animation.onfinish = animation.oncancel = () => { element.remove(); alive--; };
  }

  function record(outcome: Outcome) {
    const key = outcome === 'down' ? 'limited' : outcome;
    counts[key]++;
    dot(outcome);
  }

  function tick() {
    const now = elapsed;
    for (let i = scheduleCount(value('you'), elapsed, step); i > 0; i--) record(simulation.request(you, now));
    const visitors = value('others');
    for (let i = scheduleCount(visitors * othersRate, elapsed, step); i > 0; i--) {
      record(simulation.request(`visitor-${next % Math.max(1, visitors)}`, now));
      next++;
    }
    elapsed += step;
    render();
  }

  function start() {
    if (timer) return;
    timer = window.setInterval(tick, step);
    toggle.textContent = section.dataset.stop ?? '';
    toggle.setAttribute('aria-pressed', 'true');
  }

  function stop() {
    if (!timer) return;
    window.clearInterval(timer);
    timer = 0;
    toggle.textContent = section.dataset.start ?? '';
    toggle.setAttribute('aria-pressed', 'false');
    render(true);
  }

  toggle.addEventListener('click', () => (timer ? stop() : start()));
  q<HTMLButtonElement>('[data-lb-reset]').addEventListener('click', () => { stop(); reset(); });
  form.addEventListener('input', event => {
    const target = event.target as HTMLInputElement;
    const output = section.querySelector<HTMLOutputElement>(`[data-lb-out="${target.name}"]`);
    if (output) output.value = target.value;
    if (target.name === 'route' || target.name === 'downB') reset();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stop(); });
  window.addEventListener('pagehide', stop);

  void fetch('/api/instance', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    .then(response => (response.ok ? response.json() : null))
    .then((body: unknown) => {
      const name = body && typeof body === 'object' && 'instance' in body ? String(body.instance) : '';
      if (name !== 'A' && name !== 'B') throw new Error('unknown instance');
      q<HTMLElement>('[data-lb-instance]').textContent = (section.dataset.instance ?? '{name}').replace('{name}', name);
      q<HTMLElement>('[data-lb-standby]').hidden = false;
      q<HTMLElement>(`[data-lb-node="${name}"]`).classList.add('mine');
      for (let i = 0; i < 64 && instanceFor(you, new Set()) !== name; i++) you = `you-${i}`;
    })
    .catch(() => {
      q<HTMLElement>('[data-lb-instance]').textContent = '—';
      q<HTMLElement>('[data-lb-missing]').hidden = false;
    });

  reset();
}
