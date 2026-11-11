import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseProjectSnapshot } from './project-publications';

export function getProjectPublications() {
  try {
    return parseProjectSnapshot(JSON.parse(readFileSync(resolve('src/data/project-publications.json'), 'utf8')));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return { schemaVersion: 1 as const, projects: [] };
    throw error;
  }
}
