import { mkdir, rename, writeFile } from 'node:fs/promises';
import { parseProjectSnapshot, type ProjectSnapshot } from '../src/lib/project-publications.ts';
import { fetchRecommendationImage } from './recommendation-source.ts';

const source = process.env.PROJECTS_API_URL;
let snapshot: ProjectSnapshot = { schemaVersion: 1, projects: [] };
if (source) {
  const url = new URL(source);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    throw new Error('PROJECTS_API_URL must use HTTPS or local HTTP');
  if (url.username || url.password) throw new Error('PROJECTS_API_URL must not contain credentials');
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok) throw new Error(`Project publications unavailable (${response.status})`);
  snapshot = parseProjectSnapshot(await response.json());
  const covers = new URL('../src/assets/projects-generated/', import.meta.url);
  await mkdir(covers, { recursive: true });
  for (const key of new Set(snapshot.projects.map(project => project.coverKey).filter(Boolean))) {
    const bytes = await fetchRecommendationImage(url, key);
    const temporary = new URL(`${key}.tmp`, covers);
    await writeFile(temporary, bytes);
    await rename(temporary, new URL(key, covers));
  }
}

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
const destination = new URL('../src/data/project-publications.json', import.meta.url);
const temporary = new URL('../src/data/project-publications.json.tmp', import.meta.url);
await writeFile(temporary, JSON.stringify(snapshot), 'utf8');
await rename(temporary, destination);
console.log(`Project publications: ${snapshot.projects.length}${source ? '' : ' (API not configured)'}`);
