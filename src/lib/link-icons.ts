import * as lucide from 'lucide-static';
import {
  siDevdotto, siDiscord, siGithub, siGitlab, siInstagram, siLeetcode, siMedium, siSpotify, siTelegram, siTiktok,
  siTwitch, siWhatsapp, siX, siYoutube, type SimpleIcon,
} from 'simple-icons';

export type LinkIcon = { id: string; kind: 'line' | 'brand'; body: string };

const lineIds = [
  'house', 'folder', 'folder-open', 'file-text', 'file-user', 'briefcase', 'graduation-cap', 'book-open', 'library',
  'bookmark', 'newspaper', 'notebook-pen', 'pen-line', 'award', 'trophy', 'star', 'heart', 'sparkles', 'rocket',
  'lightbulb', 'target', 'flag', 'compass', 'map-pin', 'globe', 'link', 'external-link', 'mail', 'send',
  'message-circle', 'phone', 'calendar', 'clock', 'user', 'users', 'contact', 'id-card', 'handshake', 'code',
  'code-xml', 'terminal', 'git-branch', 'git-pull-request', 'database', 'server', 'cloud', 'cpu', 'laptop', 'monitor',
  'smartphone', 'keyboard', 'bug', 'wrench', 'settings', 'layers', 'package', 'puzzle', 'braces', 'binary',
  'workflow', 'chart-line', 'chart-bar', 'activity', 'gauge', 'shield-check', 'lock', 'key-round', 'camera', 'image',
  'video', 'film', 'music', 'headphones', 'mic', 'podcast', 'radio', 'gamepad-2', 'coffee', 'pizza', 'dumbbell',
  'bike', 'plane', 'mountain', 'sun', 'moon', 'leaf', 'dog', 'cat', 'shopping-bag', 'gift', 'ticket', 'play',
  'download', 'rss', 'at-sign', 'qr-code',
] as const;

const brands: [string, SimpleIcon][] = [
  ['github', siGithub], ['instagram', siInstagram], ['x', siX], ['youtube', siYoutube], ['spotify', siSpotify],
  ['devto', siDevdotto], ['whatsapp', siWhatsapp], ['discord', siDiscord], ['tiktok', siTiktok], ['twitch', siTwitch],
  ['telegram', siTelegram], ['medium', siMedium], ['leetcode', siLeetcode], ['gitlab', siGitlab],
];

const pascal = (id: string) => id.split('-').map(part => part[0]!.toUpperCase() + part.slice(1)).join('');

function lineBody(id: string): string {
  const svg = (lucide as Record<string, unknown>)[pascal(id)];
  const inner = typeof svg === 'string' ? /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1] : undefined;
  if (!inner) throw new Error(`Missing Lucide icon: ${id}`);
  return inner.replace(/\s+/g, ' ').trim();
}

export const linkIcons: LinkIcon[] = [
  ...lineIds.map(id => ({ id, kind: 'line' as const, body: lineBody(id) })),
  {
    id: 'linkedin', kind: 'line',
    body: '<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M11 17v-7m0 3c0-4 6-4 6 0v4" /><circle cx="7" cy="7" r=".7" fill="currentColor" stroke="none" />',
  },
  ...brands.map(([id, icon]) => ({ id, kind: 'brand' as const, body: `<path d="${icon.path}" />` })),
];

const byId = new Map(linkIcons.map(icon => [icon.id, icon]));

export function linkIcon(id: string): LinkIcon {
  return byId.get(id) ?? byId.get('link')!;
}
