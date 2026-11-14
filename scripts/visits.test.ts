import assert from 'node:assert/strict';
import test from 'node:test';
import { recordVisit } from '../src/lib/visits.ts';

test('visits register through same-origin CSRF without transmitting page paths or visitor identifiers', async () => {
  const calls: { path: string; options?: RequestInit }[] = [];
  const transport = (async (path, options) => {
    calls.push({ path: String(path), options });
    return calls.length === 1 ? Response.json({ headerName: 'X-CSRF-TOKEN', token: 'synthetic-csrf' })
      : Response.json({ total: 1234, counted: true });
  }) as typeof fetch;
  assert.equal(await recordVisit(transport), 1234);
  assert.deepEqual(calls.map(call => call.path), ['/api/auth/csrf', '/api/visits']);
  assert.equal(calls[1]?.options?.method, 'POST');
  assert.equal(calls[1]?.options?.credentials, 'same-origin');
  assert.equal(calls[1]?.options?.cache, 'no-store');
  assert.equal(calls[1]?.options?.body, undefined);
  assert.equal(new Headers(calls[1]?.options?.headers).get('X-CSRF-TOKEN'), 'synthetic-csrf');
});

test('visits never invent a total from errors or malformed acknowledgements', async () => {
  for (const body of [{ total: -1, counted: true }, { total: 1.5, counted: false }, { total: '15', counted: true },
    { total: 4 }, { total: Number.MAX_SAFE_INTEGER + 1, counted: true }]) {
    let count = 0;
    await assert.rejects(recordVisit((async () => ++count === 1
      ? Response.json({ headerName: 'X-CSRF-TOKEN', token: 'synthetic-csrf' }) : Response.json(body)) as typeof fetch));
  }
  await assert.rejects(recordVisit((async () => new Response(null, { status: 503 })) as typeof fetch));
  await assert.rejects(recordVisit((async () => { throw new TypeError('offline'); }) as typeof fetch));
});

test('visits send nothing when the CSRF contract is invalid', async () => {
  let count = 0;
  await assert.rejects(recordVisit((async () => {
    count++;
    return Response.json({ headerName: 'Wrong-Header', token: 'synthetic-csrf' });
  }) as typeof fetch));
  assert.equal(count, 1);
});
