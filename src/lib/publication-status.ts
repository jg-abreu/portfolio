const states = ['IDLE', 'DISABLED', 'PENDING', 'DISPATCHING', 'DISPATCHED'] as const;
type State = typeof states[number];

export function clearBuildStatus(root: HTMLElement) {
  const element = root.querySelector<HTMLElement>('[data-build-status]');
  if (element) { element.textContent = ''; element.hidden = true; }
}

export async function updateBuildStatus(root: HTMLElement, request: (path: string) => Promise<unknown>) {
  const element = root.querySelector<HTMLElement>('[data-build-status]');
  if (!element) return;
  const workspace = root.querySelector<HTMLElement>('[data-workspace]');
  if (!workspace || workspace.hidden) { clearBuildStatus(root); return; }
  const labels = JSON.parse(element.dataset.buildLabels ?? '{}') as Record<string, string>;
  let text = labels.unavailable;
  try {
    const value = await request('/api/admin/publication-status');
    if (value && typeof value === 'object' && 'state' in value && typeof value.state === 'string'
      && states.includes(value.state as State) && 'enabled' in value && typeof value.enabled === 'boolean'
      && ((value.state === 'DISABLED') === !value.enabled)
      && 'requestedGeneration' in value && Number.isSafeInteger(value.requestedGeneration)
      && typeof value.requestedGeneration === 'number' && value.requestedGeneration >= 0
      && 'dispatchedGeneration' in value && Number.isSafeInteger(value.dispatchedGeneration)
      && typeof value.dispatchedGeneration === 'number' && value.dispatchedGeneration >= 0
      && value.dispatchedGeneration <= value.requestedGeneration) text = labels[value.state];
  } catch {
    if (workspace.hidden) { clearBuildStatus(root); return; }
  }
  if (workspace.hidden) { clearBuildStatus(root); return; }
  element.textContent = text ?? '';
  element.hidden = !text;
}
