import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultLinkPage, parseLinkPage, type LinkPage } from './link-page.ts';

export function getLinkPage(): LinkPage {
  const source = join(process.cwd(), 'src/data/link-page.json');
  if (!existsSync(source)) return defaultLinkPage;
  const page = parseLinkPage(JSON.parse(readFileSync(source, 'utf8')));
  if (!page) throw new Error('Invalid link page snapshot');
  return page;
}
