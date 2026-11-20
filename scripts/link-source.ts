import { bounded } from './recommendation-source.ts';
import { parseLinkPage, type LinkPage } from '../src/lib/link-page.ts';

export async function fetchLinkPage(source: URL, transport: typeof fetch = fetch): Promise<LinkPage> {
  const response = await transport(source, { redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store' });
  const bytes = await bounded(response, 256 * 1024);
  const page = parseLinkPage(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  if (!page) throw new Error('Invalid link page from LINKS_API_URL');
  return page;
}
