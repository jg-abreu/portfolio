import { markdownToHast, type HastNode } from 'satteri';
import { httpsUrl } from './project-publications.ts';

const tags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'blockquote',
  'ul', 'ol', 'li', 'pre', 'code', 'hr', 'br', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);

function escape(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function render(node: HastNode, article = false): string {
  if (node.type === 'text') return escape(node.value);
  if (node.type === 'root') return node.children.map(child => render(child, article)).join('');
  if (node.type !== 'element') return '';
  const content = node.children.map(child => render(child, article)).join('');
  if (article && node.tagName === 'img') {
    const source = node.properties?.src;
    const alt = typeof node.properties?.alt === 'string' ? node.properties.alt : '';
    if (typeof source !== 'string' || !httpsUrl(source)) return escape(alt);
    const url = new URL(source);
    const hosts = ['media2.dev.to', 'dev-to-uploads.s3.amazonaws.com',
      'dev-to-uploads.s3.us-east-2.amazonaws.com', 'user-images.githubusercontent.com', 'images.unsplash.com'];
    const ownRepositoryImage = url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith('/jg-abreu/');
    if ((!hosts.includes(url.hostname) && !ownRepositoryImage) || url.port) return escape(alt);
    const proxy = url.hostname === 'media2.dev.to' ? source
      : `https://media2.dev.to/dynamic/image/width=1200,fit=limit,format=auto/${encodeURIComponent(source)}`;
    return `<img src="${escape(proxy)}" alt="${escape(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  }
  if (!tags.has(node.tagName)) return content;
  let attributes = '';
  if (node.tagName === 'a' && typeof node.properties?.href === 'string' && httpsUrl(node.properties.href))
    attributes = ` href="${escape(node.properties.href)}" rel="noopener noreferrer"`;
  if (node.tagName === 'hr' || node.tagName === 'br') return `<${node.tagName}>`;
  const tag = article && node.tagName === 'h1' ? 'h2' : node.tagName;
  return `<${tag}${attributes}>${content}</${tag}>`;
}

export function renderPublicationMarkdown(markdown: string) {
  return render(markdownToHast(markdown, { features: { frontmatter: false, rawHtml: false } }));
}

export function renderArticleMarkdown(markdown: string) {
  return render(markdownToHast(markdown, { features: { frontmatter: false, rawHtml: false } }), true);
}
