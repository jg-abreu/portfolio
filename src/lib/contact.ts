export type ContactSubmission = { name: string; email: string; message: string; website: string };

export class ContactError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Contact request failed (${status})`);
    this.status = status;
  }
}

export async function submitContact(body: ContactSubmission, key: string,
  transport: typeof fetch = fetch): Promise<void> {
  const options = { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) } as const;
  const csrf = await transport('/api/auth/csrf', options);
  if (!csrf.ok) throw new ContactError(csrf.status);
  const token: unknown = await csrf.json();
  if (typeof token !== 'object' || token === null || !('headerName' in token)
    || token.headerName !== 'X-CSRF-TOKEN' || !('token' in token) || typeof token.token !== 'string' || !token.token)
    throw new ContactError(502);
  const response = await transport('/api/contact', {
    ...options, signal: AbortSignal.timeout(15000), method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token.token, 'Idempotency-Key': key },
    body: JSON.stringify(body),
  });
  if (response.status !== 202) throw new ContactError(response.status);
  const receipt: unknown = await response.json();
  if (typeof receipt !== 'object' || receipt === null || !('status' in receipt) || receipt.status !== 'accepted')
    throw new ContactError(502);
}
