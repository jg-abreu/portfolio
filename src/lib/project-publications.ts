export type ProjectCopy = {
  title: string;
  tagline: string;
  problem: string;
  decisions: string;
  result: string;
  body: string;
  coverAlt: string;
};

export type ProjectRole = 'FEATURED' | 'SECONDARY' | 'SIGNAL';
export type ProjectProfile = { label: string; url: string };

export type PublicProject = {
  projectId: number;
  revision: string;
  slug: string;
  repositoryUrl: string;
  liveUrl: string;
  stack: string;
  displayOrder: number;
  en: ProjectCopy;
  pt: ProjectCopy;
  role: ProjectRole;
  inProgress: boolean;
  coverKey: string;
  profiles: ProjectProfile[];
};

export type ProjectSnapshot = { schemaVersion: 1; projects: PublicProject[] };

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function text(value: unknown, max: number, required = false): value is string {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
}

export function httpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

const roles: readonly ProjectRole[] = ['FEATURED', 'SECONDARY', 'SIGNAL'];

function copy(value: unknown, signal: boolean): value is ProjectCopy {
  return object(value) && text(value.title, 150, true) && text(value.tagline, 300, true)
    && text(value.problem, 5000, !signal) && text(value.decisions, 10000, !signal)
    && text(value.result, 5000, !signal) && text(value.body, 50000)
    && (value.coverAlt === undefined || value.coverAlt === null || text(value.coverAlt, 300));
}

function cleanCopy(value: ProjectCopy): ProjectCopy {
  const { title, tagline, problem, decisions, result, body } = value;
  return { title, tagline, problem, decisions, result, body, coverAlt: typeof value.coverAlt === 'string' ? value.coverAlt : '' };
}

function profiles(value: unknown): value is ProjectProfile[] {
  return value === undefined || value === null || (Array.isArray(value) && value.length <= 6
    && value.every(item => object(item) && text(item.label, 40, true) && text(item.url, 300, true) && httpsUrl(item.url)));
}

export function parseProjectSnapshot(value: unknown): ProjectSnapshot {
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.projects))
    throw new Error('Invalid project publication snapshot');
  const ids = new Set<number>();
  const slugs = new Set<string>();
  const projects: PublicProject[] = [];
  for (const project of value.projects) {
    if (!object(project) || !Number.isSafeInteger(project.projectId) || Number(project.projectId) <= 0
      || !text(project.revision, 36) || !/^[0-9a-f-]{36}$/.test(project.revision)
      || !text(project.slug, 100, true) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(project.slug)
      || !text(project.repositoryUrl, 300, true)
      || !/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9._-]+\/?$/.test(project.repositoryUrl)
      || !text(project.liveUrl, 500) || (project.liveUrl !== '' && !httpsUrl(project.liveUrl))
      || !text(project.stack, 1000, true) || !project.stack.split(',').some(item => item.trim())
      || !Number.isSafeInteger(project.displayOrder) || Number(project.displayOrder) < 0
      || (project.role !== undefined && project.role !== null && !roles.includes(project.role as ProjectRole))
      || (project.inProgress !== undefined && project.inProgress !== null && typeof project.inProgress !== 'boolean')
      || (project.coverKey !== undefined && project.coverKey !== null
        && !(text(project.coverKey, 68) && /^(|[0-9a-f]{64}\.png)$/.test(project.coverKey)))
      || !profiles(project.profiles)
      || !copy(project.en, project.role === 'SIGNAL') || !copy(project.pt, project.role === 'SIGNAL')
      || ids.has(Number(project.projectId)) || slugs.has(project.slug))
      throw new Error('Invalid or duplicate published project');
    ids.add(Number(project.projectId));
    slugs.add(project.slug);
    projects.push({ projectId: Number(project.projectId), revision: project.revision, slug: project.slug,
      repositoryUrl: project.repositoryUrl, liveUrl: project.liveUrl, stack: project.stack,
      displayOrder: Number(project.displayOrder), en: cleanCopy(project.en), pt: cleanCopy(project.pt),
      role: (project.role as ProjectRole | undefined) ?? 'SECONDARY', inProgress: project.inProgress === true,
      coverKey: typeof project.coverKey === 'string' ? project.coverKey : '',
      profiles: Array.isArray(project.profiles) ? project.profiles.map(item => ({ label: item.label, url: item.url })) : [] });
  }
  return { schemaVersion: 1, projects };
}
