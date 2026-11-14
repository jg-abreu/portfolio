import { getProjectPublications } from '../lib/publication-content';

export function GET() {
  return new Response(JSON.stringify({
    schemaVersion: 1,
    projects: getProjectPublications().projects.map(({ projectId, revision }) => ({ projectId, revision })),
  }), { headers: { 'Content-Type': 'application/json' } });
}
