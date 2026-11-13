import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRecommendationSnapshot, type RecommendationSnapshot } from './recommendations';

export function getRecommendations(): RecommendationSnapshot {
  const source = join(process.cwd(), 'src/data/recommendations.json');
  if (!existsSync(source)) return { schemaVersion: 1, recommendations: [] };
  return parseRecommendationSnapshot(JSON.parse(readFileSync(source, 'utf8')));
}
