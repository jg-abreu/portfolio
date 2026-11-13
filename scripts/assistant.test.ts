import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AssistantError, errorCodes, parseAssistantResponse, safeSourceUrl, sendQuestion } from '../src/lib/assistant.ts';

const response = { status: 'answered', answer: 'Authorized answer.', locale: 'en', sources: [{ id: 'profile', title: 'Profile', url: '/en/' }], knowledgeVersion: 'v1' };
const signal = () => new AbortController().signal;
test('accepts both v1 statuses and rejects mismatched language, missing fields and invented status', () => {
	assert.equal(parseAssistantResponse(response, 'en').status, 'answered');
	assert.equal(parseAssistantResponse({ ...response, status: 'insufficient_knowledge', sources: [] }, 'en').status, 'insufficient_knowledge');
	for (const invalid of [{ ...response, locale: 'pt' }, { ...response, status: 'partial' }, { ...response, sources: [{}] }, { ...response, answer: '' }, { ...response, status: 'insufficient_knowledge' }]) {
		assert.throws(() => parseAssistantResponse(invalid, 'en'), AssistantError);
	}
});
test('source links reject script, HTTP, credentials and protocol-relative or escaped URLs', () => {
	assert.equal(safeSourceUrl('/pt/projects/?a=1', 'https://joaoabreu.dev'), '/pt/projects/?a=1');
	assert.equal(safeSourceUrl('https://github.com/jg-abreu', 'https://joaoabreu.dev'), 'https://github.com/jg-abreu');
	for (const url of ['javascript:alert(1)', 'http://example.com', '//example.com', '/\\example.com', 'https://user:password@example.com', 'data:text/html,test', 'https://example.com/\n']) {
		assert.equal(safeSourceUrl(url, 'https://joaoabreu.dev'), null);
	}
});
test('sends only trimmed question and locale, without conversation or cookies', async () => {
	const fake = (async (url, init) => {
		assert.equal(url, '/api/assistant/messages');
		assert.deepEqual(JSON.parse(init!.body as string), { question: 'Hello', locale: 'en' });
		assert.equal(init!.credentials, 'omit');
		return Response.json(response);
	}) as typeof fetch;
	assert.equal((await sendQuestion(' Hello ', 'en', signal(), fake)).answer, response.answer);
});
test('handles every contract error code and Retry-After', async () => {
	for (const code of errorCodes) {
		const fake = (async () => Response.json({ code }, { status: code === 'RATE_LIMITED' ? 429 : 500, headers: { 'Retry-After': '12' } })) as typeof fetch;
		await assert.rejects(sendQuestion('Hello', 'en', signal(), fake), error =>
			error instanceof AssistantError && error.code === code && error.retryAfter === (code === 'RATE_LIMITED' ? 12 : 0));
	}
});
test('handles malformed JSON, proxy errors, network failures and cancellation', async () => {
	await assert.rejects(sendQuestion('Hi', 'en', signal(), (async () => new Response('bad')) as typeof fetch), { code: 'INVALID_ASSISTANT_RESPONSE' });
	await assert.rejects(sendQuestion('Hi', 'en', signal(), (async () => new Response('bad', { status: 503 })) as typeof fetch), { code: 'ASSISTANT_UNAVAILABLE' });
	const offline = (async () => { throw new TypeError('offline'); }) as typeof fetch;
	await assert.rejects(sendQuestion('Hi', 'en', signal(), offline), { code: 'NETWORK_ERROR' });
	const controller = new AbortController(); controller.abort();
	await assert.rejects(sendQuestion('Hi', 'en', controller.signal, offline), { code: 'ASSISTANT_TIMEOUT' });
});
test('rejects empty and excessive questions before requesting', async () => {
	const fake = (async () => { assert.fail('must not fetch'); }) as typeof fetch;
	for (const question of ['   ', 'a'.repeat(2001)]) await assert.rejects(sendQuestion(question, 'pt', signal(), fake), { code: 'INVALID_REQUEST' });
});

test('classifies timeout while reading a successful response body', async () => {
 const controller = new AbortController();
 const fake = (async () => ({
  ok: true,
  json: async () => { controller.abort(); throw new DOMException('Aborted', 'AbortError'); }
 })) as unknown as typeof fetch;
 await assert.rejects(sendQuestion('Hello', 'en', controller.signal, fake), { code: 'ASSISTANT_TIMEOUT' });
});
test('accepts the contract limit of 2,000 Unicode code points', async () => {
 const question = '\u{1f600}'.repeat(2000);
 const fake = (async (_url, init) => {
  assert.equal(JSON.parse(init!.body as string).question, question);
  return Response.json(response);
 }) as typeof fetch;
 await sendQuestion(question, 'en', signal(), fake);
});
