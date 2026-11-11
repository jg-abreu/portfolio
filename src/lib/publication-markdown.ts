import { markdownToHast, type HastNode } from 'satteri';
import { httpsUrl } from './project-publications.ts';

const tags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'blockquote',
  'ul', 'ol', 'li', 'pre', 'code', 'hr', 'br', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);

function escape(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function render(node: HastNode): string {
  if (node.type === 'text') return escape(node.value);
  if (node.type === 'root') return node.children.map(render).join('');
  if (node.type !== 'element') return '';
  const content = node.children.map(render).join('');
  if (!tags.has(node.tagName)) return content;
  let attributes = '';
  if (node.tagName === 'a' && typeof node.properties?.href === 'string' && httpsUrl(node.properties.href))
    attributes = ` href="${escape(node.properties.href)}" rel="noopener noreferrer"`;
  if (node.tagName === 'hr' || node.tagName === 'br') return `<${node.tagName}>`;
  return `<${node.tagName}${attributes}>${content}</${node.tagName}>`;
}

export function renderPublicationMarkdown(markdown: string) {
  return render(markdownToHast(markdown, { features: { frontmatter: false, rawHtml: false } }));
}
