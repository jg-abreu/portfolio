const panel = document.querySelector<HTMLElement>('[data-mobile-menu]');
const toggle = document.querySelector<HTMLButtonElement>('[data-mobile-menu-toggle]');

if (panel && toggle && typeof panel.hidePopover === 'function') {
  const phone = matchMedia('(max-width: 40rem)');
  const close = () => {
    if (panel.matches(':popover-open')) panel.hidePopover();
  };
  const sync = () => toggle.setAttribute('aria-expanded', String(panel.matches(':popover-open')));
  panel.addEventListener('toggle', sync);
  panel.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  phone.addEventListener('change', () => { if (!phone.matches) close(); });
  addEventListener('pagehide', close);
  sync();
}

export {};
