import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminClient, AdminRequestError } from '../src/lib/admin-client.ts';

test('admin transport is called without an incompatible object receiver', async () => {
  const transport = async function(this: unknown) {
    if (this !== undefined) throw new TypeError('Illegal invocation');
    return Response.json({ username: 'synthetic' });
  };
  const client = new AdminClient(() => {}, transport as typeof fetch);
  assert.deepEqual(await client.request('/api/admin/session'), { username: 'synthetic' });
});

test('private admin mutations use same-origin CSRF and preserve multipart boundaries', async () => {
  const calls: { path: string; options?: RequestInit }[] = [];
  const client = new AdminClient(() => {}, (async (path, options) => {
    calls.push({ path: String(path), options });
    return calls.length % 2 ? Response.json({ headerName: 'X-CSRF-TOKEN', token: 'synthetic-token' }) : Response.json({ key: 'test' });
  }) as typeof fetch);
  const form = new FormData(); form.append('image', new Blob(['synthetic']), 'test.png');
  await client.mutate('/api/admin/recommendation-images', 'POST', form);
  assert.equal(calls[1].options?.body, form);
  assert.equal(new Headers(calls[1].options?.headers).has('Content-Type'), false);
  assert.equal(new Headers(calls[1].options?.headers).get('X-CSRF-TOKEN'), 'synthetic-token');
  await client.mutate('/api/admin/recommendations', 'POST', { version: 0 });
  assert.equal(new Headers(calls[3].options?.headers).get('Content-Type'), 'application/json');
  for (const call of calls) {
    assert.equal(call.options?.credentials, 'same-origin');
    assert.equal(call.options?.cache, 'no-store');
  }
});

test('session expiry synchronously clears private state and rejects the response', async () => {
  for (const status of [401, 403]) {
    let cleared = 0;
    const client = new AdminClient(() => { cleared++; }, (async () => new Response(null, { status })) as typeof fetch);
    await assert.rejects(client.request('/api/admin/recommendations'), (error: unknown) => error instanceof AdminRequestError && error.status === status);
    assert.equal(cleared, 1);
  }
});

test('logout invalidation rejects late responses and prevents a late CSRF token from starting a mutation', async () => {
  let resolve: (response: Response) => void = () => {};
  let calls = 0;
  const client = new AdminClient(() => {}, (async () => {
    calls++;
    return new Promise<Response>(done => { resolve = done; });
  }) as typeof fetch);
  const pending = client.mutate('/api/admin/recommendations', 'POST', { privateText: 'synthetic' });
  client.invalidate();
  resolve(Response.json({ headerName: 'X-CSRF-TOKEN', token: 'late-token' }));
  await assert.rejects(pending, AdminRequestError);
  assert.equal(calls, 1);
});

test('logout while JSON is being read also prevents private results from returning', async () => {
  let resolve: (data: unknown) => void = () => {};
  const response = Response.json([]);
  response.json = () => new Promise(done => { resolve = done; });
  const client = new AdminClient(() => {}, (async () => response) as typeof fetch);
  const pending = client.request('/api/admin/recommendations');
  await Promise.resolve();
  client.invalidate(); resolve([{ privateText: 'synthetic' }]);
  await assert.rejects(pending, AdminRequestError);
});

test('invalid CSRF contracts never send private form data', async () => {
  let calls = 0;
  const client = new AdminClient(() => {}, (async () => {
    calls++; return Response.json({ headerName: 'Other-Header', token: 'synthetic' });
  }) as typeof fetch);
  await assert.rejects(client.mutate('/api/admin/recommendations', 'POST', { privateText: 'synthetic' }));
  assert.equal(calls, 1);
});
