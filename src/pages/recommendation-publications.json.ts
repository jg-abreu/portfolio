import { getRecommendations } from '../lib/recommendation-data';
import { allRecommendations } from '../lib/recommendations';

export const GET = () => new Response(JSON.stringify({ schemaVersion: 1,
  recommendations: allRecommendations(getRecommendations()).map(({ recommendationId, revision, draftVersion }) => ({ recommendationId, revision, draftVersion })),
}), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
