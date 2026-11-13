import { getRecommendations } from '../lib/recommendation-data';

export const GET = () => new Response(JSON.stringify({ schemaVersion: 1,
  recommendations: getRecommendations().recommendations.map(({ recommendationId, revision, draftVersion }) => ({ recommendationId, revision, draftVersion })),
}), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
