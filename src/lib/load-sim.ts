export const limits = { perVisitor: 10, perInstance: 100, windowMs: 60_000 } as const;

export type Instance = 'A' | 'B';
export type Route = 'page' | 'assistant';
export type Outcome = 'cache' | Instance | 'limited' | 'down';
export const instances: readonly Instance[] = ['A', 'B'];

export function hashKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function instanceFor(key: string, down: ReadonlySet<Instance>): Instance | null {
  const preferred = instances[hashKey(key) % instances.length]!;
  if (!down.has(preferred)) return preferred;
  return instances.find(instance => !down.has(instance)) ?? null;
}

class Window {
  private readonly times: number[] = [];
  count(now: number) {
    while (this.times.length && this.times[0]! <= now - limits.windowMs) this.times.shift();
    return this.times.length;
  }
  add(now: number) { this.times.push(now); }
}

export class LoadSimulation {
  private readonly visitors = new Map<string, Window>();
  private readonly budgets = new Map<Instance, Window>(instances.map(instance => [instance, new Window()]));
  private cached = false;
  private readonly route: Route;
  private readonly down: ReadonlySet<Instance>;

  constructor(route: Route, down: ReadonlySet<Instance> = new Set()) {
    this.route = route;
    this.down = down;
  }

  request(visitor: string, now: number): Outcome {
    if (this.route === 'page') {
      if (this.cached) return 'cache';
      const target = instanceFor('page', this.down);
      if (!target) return 'down';
      this.cached = true;
      return target;
    }
    const target = instanceFor(visitor, this.down);
    if (!target) return 'down';
    const own = this.visitors.get(visitor) ?? new Window();
    this.visitors.set(visitor, own);
    const budget = this.budgets.get(target)!;
    if (own.count(now) >= limits.perVisitor || budget.count(now) >= limits.perInstance) return 'limited';
    own.add(now);
    budget.add(now);
    return target;
  }
}

export function scheduleCount(rate: number, elapsedMs: number, stepMs: number): number {
  const before = Math.floor((elapsedMs * rate) / 1000);
  const after = Math.floor(((elapsedMs + stepMs) * rate) / 1000);
  return Math.max(0, after - before);
}
