import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBlogSnapshot, type BlogArticle } from './blog.ts';

export function getBlogArticles(): BlogArticle[] {
  const source = join(process.cwd(), 'src/data/blog-snapshot.json');
  if (!existsSync(source)) return [];
  const snapshot = parseBlogSnapshot(JSON.parse(readFileSync(source, 'utf8')));
  if (!snapshot) throw new Error('Invalid blog snapshot');
  return snapshot.articles;
}
