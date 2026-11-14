import assert from 'node:assert/strict';
import test from 'node:test';
import { ContactError, submitContact } from '../src/lib/contact.ts';

const body = { name: 'Test sender', email: 'sender@example.com', message: 'Synthetic message', website: '' };
const csrf = () => Response.json({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf' });

test('contact uses same-origin CSRF and the supplied retry key before accepting receipt', async () => {
  const calls: { url: string; options?: RequestInit }[] = [];
  const transport = (async (url: string | URL | Request, options?: RequestInit) => {
    calls.push({ url: String(url), options });
    return calls.length === 1 ? csrf() : Response.json({ status: 'accepted' }, { status: 202 });
  }) as typeof fetch;
  await submitContact(body, 'retry-key', transport);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, '/api/auth/csrf');
  assert.equal(calls[1].url, '/api/contact');
  assert.equal(calls[1].options?.credentials, 'same-origin');
  const headers = new Headers(calls[1].options?.headers);
  assert.equal(headers.get('X-CSRF-TOKEN'), 'test-csrf');
  assert.equal(headers.get('Idempotency-Key'), 'retry-key');
  assert.deepEqual(JSON.parse(String(calls[1].options?.body)), body);
});

test('contact never treats rate limits or server failures as success', async () => {
  for (const status of [400, 403, 409, 413, 415, 429, 503]) {
    let count = 0;
    const transport = (async () => ++count === 1 ? csrf() : new Response(null, { status })) as typeof fetch;
    await assert.rejects(submitContact(body, 'same-retry-key', transport),
      error => error instanceof ContactError && error.status === status);
  }
});

test('contact rejects malformed acknowledgement and CSRF contract', async () => {
  let count = 0;
  await assert.rejects(submitContact(body, 'retry-key', (async () => ++count === 1 ? csrf()
    : Response.json({ status: 'sent' }, { status: 202 })) as typeof fetch), ContactError);
  count = 0;
  await assert.rejects(submitContact(body, 'retry-key', (async () => {
    count++;
    return Response.json({ headerName: 'Wrong-Header', token: 'test-csrf' });
  }) as typeof fetch), ContactError);
  assert.equal(count, 1);
});

test('contact does not send private fields when CSRF cannot be obtained', async () => {
  const urls: string[] = [];
  await assert.rejects(submitContact(body, 'retry-key', (async url => {
    urls.push(String(url));
    return new Response(null, { status: 503 });
  }) as typeof fetch), ContactError);
  assert.deepEqual(urls, ['/api/auth/csrf']);
});
