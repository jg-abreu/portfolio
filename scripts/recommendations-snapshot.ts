import { mkdir, rename, writeFile } from 'node:fs/promises';
import { fetchRecommendationImage, fetchRecommendations, recommendationSource } from './recommendation-source.ts';
import type { RecommendationSnapshot } from '../src/lib/recommendations.ts';

const configured = process.env.RECOMMENDATIONS_API_URL;
const source = configured ? recommendationSource(configured) : null;
const snapshot: RecommendationSnapshot = source ? await fetchRecommendations(source) : { schemaVersion: 1, recommendations: [] };
const assets = new URL('../src/assets/recommendations-generated/', import.meta.url);
const data = new URL('../src/data/', import.meta.url);
await mkdir(assets, { recursive: true });
await mkdir(data, { recursive: true });
if (source) {
  for (const key of new Set(snapshot.recommendations.map(item => item.data.imageKey))) {
    const bytes = await fetchRecommendationImage(source, key);
    const temporary = new URL(`${key}.tmp`, assets);
    await writeFile(temporary, bytes);
    await rename(temporary, new URL(key, assets));
  }
}
const temporary = new URL('recommendations.json.tmp', data);
await writeFile(temporary, JSON.stringify(snapshot), 'utf8');
await rename(temporary, new URL('recommendations.json', data));
console.log(`Recommendations: ${snapshot.recommendations.length}${source ? '' : ' (API not configured)'}`);
