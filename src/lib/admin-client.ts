export class AdminRequestError extends Error {
  status: number;
  constructor(status: number) { super(`Admin request failed (${status})`); this.status = status; }
}

export class AdminClient {
  private generation = 0;
  private clear: () => void;
  private transport: typeof fetch;
  constructor(clear: () => void, transport: typeof fetch = fetch) { this.clear = clear; this.transport = transport; }

  invalidate() { this.generation++; this.clear(); }
  version() { return this.generation; }
  assertCurrent(version: number) { if (version !== this.generation) throw new AdminRequestError(401); }

  async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const version = this.generation;
    const transport = this.transport;
    const response = await transport(path, { ...options, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    this.assertCurrent(version);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.invalidate();
      throw new AdminRequestError(response.status);
    }
    const data: unknown = response.status === 204 ? null : await response.json();
    this.assertCurrent(version);
    return data;
  }

  async mutate(path: string, method: string, body?: unknown): Promise<unknown> {
    const version = this.generation;
    const csrf = await this.request('/api/auth/csrf');
    this.assertCurrent(version);
    if (!csrf || typeof csrf !== 'object' || !('headerName' in csrf) || csrf.headerName !== 'X-CSRF-TOKEN'
      || !('token' in csrf) || typeof csrf.token !== 'string' || !csrf.token) throw new Error('Invalid CSRF response');
    const multipart = body instanceof FormData;
    return this.request(path, { method, headers: { 'X-CSRF-TOKEN': csrf.token,
      ...(body === undefined || multipart ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }) });
  }
}
