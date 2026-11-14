import { recordVisit } from '../lib/visits';

if (import.meta.env.PUBLIC_VISITS_ENABLED === 'true') {
  const counter = document.querySelector<HTMLElement>('[data-visits]');
  const total = counter?.querySelector<HTMLElement>('[data-visits-total]');
  if (counter && total) {
    const update = async () => {
      try {
        const value = await recordVisit();
        total.textContent = new Intl.NumberFormat(counter.dataset.locale === 'pt' ? 'pt-BR' : 'en-US').format(value);
        counter.hidden = false;
      } catch { counter.hidden = true; }
    };
    if (document.readyState === 'complete') void update();
    else window.addEventListener('load', () => void update(), { once: true });
  }
}
