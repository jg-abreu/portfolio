type Options = {
  item: string;
  ignore?: string;
  handle?: string;
  handleOnly?: boolean;
  axis?: 'x' | 'y' | 'grid';
  canDrop?: (dragged: HTMLElement, target: HTMLElement) => boolean;
  onDrop: (dragged: HTMLElement, order: HTMLElement[]) => void;
};

export function sortable(container: HTMLElement, options: Options) {
  let suppressed = false;
  container.addEventListener('click', event => {
    if (!suppressed) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  container.addEventListener('pointerdown', event => {
    const target = event.target as Element;
    const dragged = target.closest<HTMLElement>(options.item);
    if (!dragged || !container.contains(dragged) || event.button !== 0) return;
    if (options.ignore && target.closest(options.ignore)) return;
    const onHandle = options.handle ? target.closest(options.handle) !== null : true;
    if ((options.handleOnly || event.pointerType !== 'mouse') && !onHandle) return;
    const parent = dragged.parentElement!;
    const startX = event.clientX, startY = event.clientY;
    let active = false;
    const move = (moveEvent: PointerEvent) => {
      if (!active && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 6) return;
      active = true;
      moveEvent.preventDefault();
      dragged.classList.add('dragging');
      const over = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>(options.item);
      if (!over || over === dragged || over.parentElement !== parent) return;
      if (options.canDrop && !options.canDrop(dragged, over)) return;
      const box = over.getBoundingClientRect();
      const after = options.axis === 'y' ? moveEvent.clientY > box.top + box.height / 2
        : options.axis === 'x' ? moveEvent.clientX > box.left + box.width / 2
        : moveEvent.clientY > box.bottom - box.height / 4 || (moveEvent.clientX > box.left + box.width / 2 && moveEvent.clientY > box.top + box.height / 4);
      parent.insertBefore(dragged, after ? over.nextElementSibling : over);
    };
    const end = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      dragged.classList.remove('dragging');
      if (!active) return;
      suppressed = true;
      window.setTimeout(() => { suppressed = false; }, 0);
      options.onDrop(dragged, [...parent.children].filter((child): child is HTMLElement => child instanceof HTMLElement && child.matches(options.item)));
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  });
}
