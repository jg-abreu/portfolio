import assert from 'node:assert/strict';
import test from 'node:test';
import { clearBuildStatus, updateBuildStatus } from '../src/lib/publication-status.ts';
import { publicationUi } from '../src/i18n/publication.ts';

function view() {
  const element = { textContent: '', hidden: true, dataset: { buildLabels: JSON.stringify(publicationUi.en) } };
  const workspace = { hidden: false };
  const root = { querySelector: (selector: string) => selector === '[data-build-status]' ? element : workspace } as unknown as HTMLElement;
  return { root, element, workspace };
}

test('build acknowledgment is distinct from deployment and malformed status is not rendered', async () => {
  const { root, element } = view();
  await updateBuildStatus(root, async () => ({ state: 'DISPATCHED', enabled: true, requestedGeneration: 3, dispatchedGeneration: 3 }));
  assert.equal(element.textContent, publicationUi.en.DISPATCHED);
  for (const result of [
    { state: '<script>unsafe()</script>', enabled: true, requestedGeneration: 1, dispatchedGeneration: 1 },
    { state: 'DISPATCHED', enabled: false, requestedGeneration: 1, dispatchedGeneration: 1 },
    { state: 'DISPATCHED', enabled: true, requestedGeneration: 1, dispatchedGeneration: 2 },
  ]) {
    await updateBuildStatus(root, async () => result);
    assert.equal(element.textContent, publicationUi.en.unavailable);
  }
});

test('hidden workspace never loads build status and late replies cannot restore it after logout', async () => {
  const { root, workspace, element } = view();
  let release: (value: unknown) => void = () => {};
  const pending = updateBuildStatus(root, () => new Promise(resolve => { release = resolve; }));
  workspace.hidden = true;
  clearBuildStatus(root);
  release({ state: 'PENDING', enabled: true, requestedGeneration: 4, dispatchedGeneration: 3 });
  await pending;
  assert.equal(element.textContent, '');
  assert.equal(element.hidden, true);
  await updateBuildStatus(root, async () => assert.fail('must not fetch while logged out'));
});
