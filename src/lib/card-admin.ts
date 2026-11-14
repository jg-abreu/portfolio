export const cardThemes = ['DARK', 'LIGHT'] as const;
export const cardAccents = ['BLUE', 'GREEN', 'VIOLET', 'ORANGE'] as const;
export const cardBlocks = ['CONTRIBUTIONS', 'LATEST_REPOSITORY', 'STACK', 'EDUCATION', 'FOCUS', 'OPPORTUNITY'] as const;
export const cardTextFields = [
  { name: 'name', max: 30 }, { name: 'role', max: 40 }, { name: 'monogram', max: 3 }, { name: 'headline', max: 70 },
  { name: 'educationTitle', max: 40 }, { name: 'educationDetail', max: 40 }, { name: 'projectTitle', max: 40 },
  { name: 'projectStack', max: 40 }, { name: 'projectNote', max: 40 }, { name: 'focus', max: 40 }, { name: 'opportunity', max: 40 },
] as const;
export const maxStack = 6;

export type CardTheme = typeof cardThemes[number];
export type CardAccent = typeof cardAccents[number];
export type CardBlock = typeof cardBlocks[number];
export type CardTextField = typeof cardTextFields[number]['name'];
export type CardSettings = { theme: CardTheme; accent: CardAccent; blocks: CardBlock[]; stack: string[] } & Record<CardTextField, string>;
export type CardView = { version: number; draft: CardSettings; published: CardSettings | null; defaults: CardSettings;
  pending: boolean; publishedAt: string | null; updatedAt: string };

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.length > 0 && [...value].length <= max; }
function date(value: unknown): value is string { return typeof value === 'string' && value.length <= 50 && Number.isFinite(Date.parse(value)); }

export function isCardSettings(value: unknown): value is CardSettings {
  if (!record(value)) return false;
  const { theme, accent, blocks, stack } = value;
  return cardThemes.includes(theme as CardTheme) && cardAccents.includes(accent as CardAccent)
    && Array.isArray(blocks) && blocks.length >= 1 && blocks.length <= cardBlocks.length
    && new Set(blocks).size === blocks.length && blocks.every(block => cardBlocks.includes(block as CardBlock))
    && Array.isArray(stack) && stack.length >= 1 && stack.length <= maxStack && stack.every(chip => text(chip, 16))
    && cardTextFields.every(field => text(value[field.name], field.max));
}

export function isCardView(value: unknown): value is CardView {
  return record(value) && Number.isSafeInteger(value.version) && Number(value.version) >= 0
    && isCardSettings(value.draft) && isCardSettings(value.defaults)
    && (value.published === null || isCardSettings(value.published))
    && typeof value.pending === 'boolean' && (value.publishedAt === null || date(value.publishedAt)) && date(value.updatedAt);
}

export function encodeCardSettings(settings: CardSettings): string {
  const bytes = new TextEncoder().encode(JSON.stringify(settings));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function moveBlock(blocks: readonly CardBlock[], block: CardBlock, offset: -1 | 1): CardBlock[] {
  const next = [...blocks];
  const index = next.indexOf(block);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function parseStack(value: string): string[] {
  return value.split(',').map(chip => chip.trim()).filter(Boolean);
}
