export async function recordVisit(transport: typeof fetch = fetch): Promise<number> {
  const csrfResponse = await transport('/api/auth/csrf', {
    credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (!csrfResponse.ok) throw new Error('Visit CSRF unavailable');
  const csrf: unknown = await csrfResponse.json();
  if (!csrf || typeof csrf !== 'object' || !('headerName' in csrf) || csrf.headerName !== 'X-CSRF-TOKEN'
    || !('token' in csrf) || typeof csrf.token !== 'string' || !csrf.token || csrf.token.length > 512)
    throw new Error('Invalid visit CSRF');
  const response = await transport('/api/visits', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { [csrf.headerName]: csrf.token }, signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Visit registration unavailable');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('total' in data) || !Number.isSafeInteger(data.total)
    || Number(data.total) < 0 || !('counted' in data) || typeof data.counted !== 'boolean')
    throw new Error('Invalid visit receipt');
  return Number(data.total);
}
