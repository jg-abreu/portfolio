import { recordVisit } from '../lib/visits';

if (import.meta.env.PUBLIC_VISITS_ENABLED === 'true') {
  const counters = [...document.querySelectorAll<HTMLElement>('[data-visits]')];
  if (counters.length) {
    const update = async () => {
      try {
        const value = await recordVisit();
        for (const counter of counters) {
          const total = counter.querySelector<HTMLElement>('[data-visits-total]');
          if (!total) continue;
          total.textContent = new Intl.NumberFormat(counter.dataset.locale === 'pt' ? 'pt-BR' : 'en-US').format(value);
          counter.hidden = false;
          counter.dataset.visitsReady = '';
        }
      } catch {
        for (const counter of counters) if (!('visitsReserve' in counter.dataset)) counter.hidden = true;
      }
    };
    if (document.readyState === 'complete') void update();
    else window.addEventListener('load', () => void update(), { once: true });
  }
}
