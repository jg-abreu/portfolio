export const cardThemes = ['DARK', 'LIGHT'] as const;
export const cardAccents = ['BLUE', 'GREEN', 'VIOLET', 'ORANGE'] as const;
export const cardKinds = ['TEXT', 'STACK', 'CONTRIBUTIONS', 'LATEST_REPOSITORY'] as const;
export const cardWidths = ['THIRD', 'HALF', 'FULL'] as const;
export const cardEmphases = ['STRONG', 'NORMAL'] as const;
export const cardIdentityFields = [
  { name: 'name', max: 30 }, { name: 'role', max: 40 }, { name: 'monogram', max: 3 }, { name: 'headline', max: 70 },
] as const;
export const maxBlocks = 9;
export const maxLines = 4;
export const maxStack = 8;
export const columns = 6;
export const widthSpan: Record<CardWidth, number> = { THIRD: 2, HALF: 3, FULL: 6 };

export type CardTheme = typeof cardThemes[number];
export type CardAccent = typeof cardAccents[number];
export type CardKind = typeof cardKinds[number];
export type CardWidth = typeof cardWidths[number];
export type CardEmphasis = typeof cardEmphases[number];
export type CardLine = { text: string; emphasis: CardEmphasis };
export type CardBlock = { id: string; kind: CardKind; title: string; width: CardWidth; lines: CardLine[]; stack: string[] };
export type CardSettings = { theme: CardTheme; accent: CardAccent; name: string; role: string; monogram: string;
  headline: string; blocks: CardBlock[] };
export type CardView = { version: number; draft: CardSettings; published: CardSettings | null; defaults: CardSettings;
  pending: boolean; publishedAt: string | null; updatedAt: string };

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.length > 0 && [...value].length <= max; }
function date(value: unknown): value is string { return typeof value === 'string' && value.length <= 50 && Number.isFinite(Date.parse(value)); }
function oneOf<T extends string>(values: readonly T[], value: unknown): value is T { return values.includes(value as T); }

export function isCardLine(value: unknown): value is CardLine {
  return record(value) && text(value.text, 60) && oneOf(cardEmphases, value.emphasis);
}

export function isCardBlock(value: unknown): value is CardBlock {
  if (!record(value) || typeof value.id !== 'string' || !/^[a-z0-9-]{1,24}$/.test(value.id)) return false;
  if (!oneOf(cardKinds, value.kind) || !oneOf(cardWidths, value.width) || !text(value.title, 40)) return false;
  if (!Array.isArray(value.lines) || !Array.isArray(value.stack)) return false;
  if (value.kind === 'TEXT' && (value.lines.length < 1 || value.lines.length > maxLines || !value.lines.every(isCardLine))) return false;
  if (value.kind === 'STACK' && (value.stack.length < 1 || value.stack.length > maxStack || !value.stack.every(chip => text(chip, 16)))) return false;
  return true;
}

export function isCardSettings(value: unknown): value is CardSettings {
  if (!record(value) || !oneOf(cardThemes, value.theme) || !oneOf(cardAccents, value.accent)) return false;
  if (!cardIdentityFields.every(field => text(value[field.name], field.max))) return false;
  const { blocks } = value;
  return Array.isArray(blocks) && blocks.length >= 1 && blocks.length <= maxBlocks && blocks.every(isCardBlock)
    && new Set(blocks.map(block => (block as CardBlock).id)).size === blocks.length;
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

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item!);
  return next;
}

export function stepWidth(width: CardWidth, step: -1 | 1): CardWidth {
  const index = cardWidths.indexOf(width) + step;
  return cardWidths[Math.max(0, Math.min(cardWidths.length - 1, index))]!;
}

export function nearestWidth(span: number): CardWidth {
  return cardWidths.reduce((best, width) =>
    Math.abs(widthSpan[width] - span) < Math.abs(widthSpan[best] - span) ? width : best, cardWidths[0]);
}

export function effectiveSpans(blocks: readonly CardBlock[]): number[] {
  const spans: number[] = [];
  let used = 0;
  blocks.forEach((block, index) => {
    const span = widthSpan[block.width];
    if (used + span > columns) {
      spans[index - 1] = spans[index - 1]! + columns - used;
      used = 0;
    }
    spans.push(span);
    used += span;
  });
  if (spans.length) spans[spans.length - 1] = spans[spans.length - 1]! + columns - used;
  return spans;
}

export function spanFraction(span: number): string {
  return ({ 2: '1/3', 3: '1/2', 4: '2/3', 5: '5/6', 6: '1/1' } as Record<number, string>)[span] ?? `${span}/6`;
}

export function newBlock(kind: CardKind, existing: readonly CardBlock[], title: string): CardBlock {
  let index = existing.length + 1;
  const ids = new Set(existing.map(block => block.id));
  while (ids.has(`block-${index}`)) index++;
  return { id: `block-${index}`, kind, title, width: kind === 'STACK' ? 'FULL' : 'HALF',
    lines: kind === 'TEXT' ? [{ text: title, emphasis: 'STRONG' }] : [], stack: kind === 'STACK' ? ['Java'] : [] };
}

export function parseStack(value: string): string[] {
  return value.split(',').map(chip => chip.trim()).filter(Boolean);
}
