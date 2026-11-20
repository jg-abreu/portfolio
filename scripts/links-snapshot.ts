import { mkdir, rename, writeFile } from 'node:fs/promises';
import { fetchLinkPage } from './link-source.ts';
import { recommendationSource } from './recommendation-source.ts';
import { defaultLinkPage } from '../src/lib/link-page.ts';

const configured = process.env.LINKS_API_URL;
const page = configured ? await fetchLinkPage(recommendationSource(configured, 'LINKS_API_URL')) : defaultLinkPage;
const data = new URL('../src/data/', import.meta.url);
await mkdir(data, { recursive: true });
const temporary = new URL('link-page.json.tmp', data);
await writeFile(temporary, JSON.stringify(page), 'utf8');
await rename(temporary, new URL('link-page.json', data));
console.log(`Links: ${page.links.length}${configured ? '' : ' (API not configured, defaults)'}`);
