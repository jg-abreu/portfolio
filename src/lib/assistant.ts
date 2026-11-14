export type AssistantLocale = 'pt' | 'en';
export const errorCodes = ['INVALID_REQUEST', 'REQUEST_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'RATE_LIMITED', 'ASSISTANT_UNAVAILABLE', 'ASSISTANT_TIMEOUT', 'INVALID_ASSISTANT_RESPONSE', 'INTERNAL_ERROR'] as const;
export type ErrorCode = (typeof errorCodes)[number];
export interface AssistantResponse {
	status: 'answered' | 'insufficient_knowledge';
	answer: string;
	locale: AssistantLocale;
	sources: { id: string; title: string; url: string | null }[];
	knowledgeVersion: string;
}
export class AssistantError extends Error {
	code: ErrorCode | 'NETWORK_ERROR';
	retryAfter: number;
	constructor(code: ErrorCode | 'NETWORK_ERROR', retryAfter = 0) {
		super(code);
		this.code = code;
		this.retryAfter = retryAfter;
	}
}
const object = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function safeSourceUrl(value: string, origin: string): string | null {
	try {
		if (value !== value.trim() || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
		const url = new URL(value, origin);
		const internal = value.startsWith('/') && !value.startsWith('//') && url.origin === origin;
		if (!internal && !/^https:\/\//i.test(value)) return null;
		if (url.username || url.password) return null;
		return internal ? url.pathname + url.search + url.hash : url.href;
	} catch { return null; }
}
export function parseAssistantResponse(value: unknown, locale: AssistantLocale): AssistantResponse {
	if (!object(value) || !['answered', 'insufficient_knowledge'].includes(String(value.status))
		|| !nonempty(value.answer) || value.locale !== locale || !nonempty(value.knowledgeVersion)
		|| !Array.isArray(value.sources)
		|| !value.sources.every(s => object(s) && nonempty(s.id) && nonempty(s.title)
			&& (s.url === null || typeof s.url === 'string'))
		|| (value.status === 'insufficient_knowledge' && value.sources.length !== 0)) {
		throw new AssistantError('INVALID_ASSISTANT_RESPONSE');
	}
	return value as unknown as AssistantResponse;
}
export async function sendQuestion(question: string, locale: AssistantLocale, signal: AbortSignal,
	fetcher: typeof fetch = fetch): Promise<AssistantResponse> {
	const trimmed = question.trim();
	if (!trimmed || [...trimmed].length > 2000) throw new AssistantError('INVALID_REQUEST');
	let response: Response;
	try {
		response = await fetcher('/api/assistant/messages', {
			method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, application/problem+json' },
			body: JSON.stringify({ question: trimmed, locale }), signal, credentials: 'omit', cache: 'no-store',
		});
	} catch {
		throw new AssistantError(signal.aborted ? 'ASSISTANT_TIMEOUT' : 'NETWORK_ERROR');
	}
	if (!response.ok) {
		const fallback: Record<number, ErrorCode> = { 400: 'INVALID_REQUEST', 413: 'REQUEST_TOO_LARGE',
			415: 'UNSUPPORTED_MEDIA_TYPE', 429: 'RATE_LIMITED', 503: 'ASSISTANT_UNAVAILABLE',
			504: 'ASSISTANT_TIMEOUT', 502: 'INVALID_ASSISTANT_RESPONSE', 500: 'INTERNAL_ERROR' };
		let code = fallback[response.status] ?? 'INTERNAL_ERROR';
		try {
			const problem: unknown = await response.json();
			if (object(problem) && errorCodes.some(c => c === problem.code)) code = problem.code as ErrorCode;
		} catch {  }
		const retry = response.headers.get('Retry-After');
		const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : retry ? (Date.parse(retry) - Date.now()) / 1000 : 0;
		throw new AssistantError(code, response.status === 429 && Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0);
	}
	try { return parseAssistantResponse(await response.json(), locale); }
	catch { throw new AssistantError(signal.aborted ? 'ASSISTANT_TIMEOUT' : 'INVALID_ASSISTANT_RESPONSE'); }
}
