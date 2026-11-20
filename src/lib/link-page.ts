export type PageLink = { title: string; url: string; icon: string };
export type LinkPage = { links: PageLink[] };
export type LinkPageView = {
  version: number; draft: LinkPage; published: LinkPage | null; defaults: LinkPage; pending: boolean;
  publishedAt: string | null; updatedAt: string | null;
};

export const maxLinks = 20;
export const maxTitle = 40;
export const maxUrl = 300;

const site = 'joaoabreu.dev';
const iconPattern = /^[a-z0-9-]{1,32}$/;
const emailPattern = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const hostPattern = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export const defaultLinkPage: LinkPage = {
  links: [
    { title: 'Portfolio', url: `https://${site}/en/`, icon: 'house' },
    { title: 'Projects', url: `https://${site}/en/projects/`, icon: 'folder' },
    { title: 'Résumé', url: `https://${site}/en/resume/`, icon: 'file-user' },
    { title: 'Blog', url: `https://${site}/en/blog/`, icon: 'newspaper' },
    { title: 'Recommendations', url: `https://${site}/en/recommendations/`, icon: 'bookmark' },
    { title: 'LinkedIn', url: 'https://www.linkedin.com/in/jo%C3%A3o-abreuuu/', icon: 'linkedin' },
    { title: 'GitHub', url: 'https://github.com/jg-abreu', icon: 'github' },
    { title: 'Email', url: 'mailto:jgabreudev@gmail.com', icon: 'mail' },
  ],
};

export function linkTitleError(value: string): boolean {
  const title = value.trim();
  return !title || [...title].length > maxTitle || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(title);
}

export function linkUrlError(value: string): boolean {
  const url = value.trim();
  if (!url || url.length > maxUrl || !/^[\x21-\x7e]+$/.test(url)) return true;
  if (url.startsWith('mailto:')) return !emailPattern.test(url.slice(7));
  try {
    const parsed = new URL(url);
    return parsed.protocol !== 'https:' || !!parsed.username || !!parsed.password || !!parsed.port
      || !hostPattern.test(parsed.hostname) || !url.toLowerCase().startsWith('https://');
  } catch {
    return true;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLink(value: unknown): PageLink | null {
  if (!record(value) || typeof value.title !== 'string' || typeof value.url !== 'string' || typeof value.icon !== 'string')
    return null;
  if (linkTitleError(value.title) || linkUrlError(value.url) || !iconPattern.test(value.icon)) return null;
  return { title: value.title.trim(), url: value.url.trim(), icon: value.icon };
}

export function parseLinkPage(value: unknown): LinkPage | null {
  if (!record(value) || !Array.isArray(value.links) || value.links.length === 0 || value.links.length > maxLinks) return null;
  const links = value.links.map(parseLink);
  return links.every((link): link is PageLink => link !== null) ? { links } : null;
}

export function isLinkPageView(value: unknown): value is LinkPageView {
  return record(value) && Number.isSafeInteger(value.version) && (value.version as number) >= 0
    && parseLinkPage(value.draft) !== null && parseLinkPage(value.defaults) !== null
    && (value.published === null || parseLinkPage(value.published) !== null) && typeof value.pending === 'boolean'
    && (value.publishedAt === null || typeof value.publishedAt === 'string')
    && (value.updatedAt === null || typeof value.updatedAt === 'string');
}

export function localizedHref(url: string, locale: 'en' | 'pt'): string {
  if (!url.startsWith('https://')) return url;
  const parsed = new URL(url);
  if (parsed.hostname !== site) return url;
  const path = parsed.pathname.replace(/^\/(en|pt)(?=\/|$)/, `/${locale}`);
  return `${path}${parsed.search}${parsed.hash}`;
}
