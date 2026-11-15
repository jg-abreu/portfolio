import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emptyRecommendations, parseRecommendationSnapshot, type RecommendationSnapshot } from './recommendations';

export function getRecommendations(): RecommendationSnapshot {
  const source = join(process.cwd(), 'src/data/recommendations.json');
  if (!existsSync(source)) return emptyRecommendations();
  return parseRecommendationSnapshot(JSON.parse(readFileSync(source, 'utf8')));
}
