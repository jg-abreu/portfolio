import { createHash } from 'node:crypto';
import { parseRecommendationSnapshot, type RecommendationSnapshot } from '../src/lib/recommendations.ts';

export function recommendationSource(value: string): URL {
  const url = new URL(value);
  if (url.username || url.password || url.hash || (url.protocol !== 'https:'
    && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))))
    throw new Error('RECOMMENDATIONS_API_URL must use credential-free HTTPS or local HTTP');
  return url;
}

async function bounded(response: Response, maximum: number): Promise<Uint8Array> {
  if (!response.ok) throw new Error(`Recommendations source unavailable (${response.status})`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Recommendations source returned no body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error('Recommendations source exceeded the size limit');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

export async function fetchRecommendations(source: URL, transport: typeof fetch = fetch): Promise<RecommendationSnapshot> {
  const response = await transport(source, { redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store' });
  const bytes = await bounded(response, 8 * 1024 * 1024);
  return parseRecommendationSnapshot(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}

export async function fetchRecommendationImage(source: URL, key: string, transport: typeof fetch = fetch): Promise<Uint8Array> {
  if (!/^[0-9a-f]{64}\.png$/.test(key)) throw new Error('Invalid recommendation image key');
  const url = new URL(`/api/recommendation-images/${key}`, source.origin);
  const response = await transport(url, { redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store' });
  const bytes = await bounded(response, 8 * 1024 * 1024);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => bytes[index] === byte)
    || createHash('sha256').update(bytes).digest('hex') !== key.slice(0, -4))
    throw new Error('Recommendation image failed integrity validation');
  return bytes;
}
