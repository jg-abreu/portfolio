import assert from 'node:assert/strict';
import test from 'node:test';
import { LoadSimulation, instanceFor, limits, scheduleCount, type Instance } from '../src/lib/load-sim.ts';

test('each visitor always reaches the same instance and fails over when it is down', () => {
  const seen = new Set<Instance>();
  for (let i = 0; i < 50; i++) {
    const first = instanceFor(`visitor-${i}`, new Set());
    assert.equal(instanceFor(`visitor-${i}`, new Set()), first);
    seen.add(first!);
  }
  assert.deepEqual([...seen].sort(), ['A', 'B']);
  for (let i = 0; i < 20; i++) assert.equal(instanceFor(`visitor-${i}`, new Set(['B'])), 'A');
  assert.equal(instanceFor('visitor', new Set(['A', 'B'])), null);
});

test('pages are served from the Cloudflare cache after the first request', () => {
  const simulation = new LoadSimulation('page');
  const outcomes = Array.from({ length: 100 }, (_, i) => simulation.request(`v${i}`, i));
  assert.ok(outcomes[0] === 'A' || outcomes[0] === 'B');
  assert.ok(outcomes.slice(1).every(outcome => outcome === 'cache'));
});

test('one visitor gets 429 after the per-visitor limit until the window slides', () => {
  const simulation = new LoadSimulation('assistant');
  const outcomes = Array.from({ length: limits.perVisitor + 5 }, (_, i) => simulation.request('you', i * 10));
  assert.equal(outcomes.filter(outcome => outcome === 'limited').length, 5);
  assert.notEqual(simulation.request('you', limits.windowMs + 1), 'limited');
});

test('an instance stops answering past its own budget while the other keeps going', () => {
  const simulation = new LoadSimulation('assistant');
  const counts = { A: 0, B: 0, limited: 0 } as Record<string, number>;
  for (let i = 0; i < 400; i++) {
    const outcome = simulation.request(`visitor-${i}`, i);
    counts[outcome] = (counts[outcome] ?? 0) + 1;
  }
  assert.equal(counts.A, limits.perInstance);
  assert.equal(counts.B, limits.perInstance);
  assert.equal(counts.limited, 200);
  const alone = new LoadSimulation('assistant', new Set(['B']));
  let served = 0;
  for (let i = 0; i < 400; i++) if (alone.request(`visitor-${i}`, i) === 'A') served++;
  assert.equal(served, limits.perInstance);
});

test('requests are spread evenly across simulation steps', () => {
  let total = 0;
  for (let elapsed = 0; elapsed < 1000; elapsed += 100) total += scheduleCount(25, elapsed, 100);
  assert.equal(total, 25);
  assert.equal(scheduleCount(0, 500, 100), 0);
});
