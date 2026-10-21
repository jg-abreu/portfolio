import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import { locales, type Locale } from '../i18n/ui';

type ProjectData = CollectionEntry<'projects'>['data'];
type CopyData = CollectionEntry<'projectCopy'>['data'];

export type Project = ProjectData & {
	id: string;
	repoUrl: string;
	title: string;
	tagline: string;
	problem?: string;
	decisions?: string[];
	result?: string;
};

export type Contact = CollectionEntry<'contacts'>['data'] & { id: string };

const GITHUB_USER = 'jg-abreu';

/**
 * Projects merged with their text in the given locale, sorted by `order`.
 * Throws (and so fails the build) when a locale is missing a project's text, has text for
 * an unknown project, or a featured/secondary project lacks problem, decisions or result.
 */
export async function getProjects(locale: Locale): Promise<Project[]> {
	const [projects, copies] = await Promise.all([getCollection('projects'), getCollection('projectCopy')]);
	const ids = new Set(projects.map((p) => p.id));
	const copyByLocale = new Map<string, CopyData>(copies.map((c) => [c.id, c.data]));

	const problems: string[] = [];
	for (const l of locales) {
		for (const id of ids) {
			if (!copyByLocale.has(`${l}/${id}`)) problems.push(`missing src/content/projects/${l}/${id}.md`);
		}
	}
	for (const key of copyByLocale.keys()) {
		const [l, id] = key.split('/');
		if (!locales.includes(l as Locale) || !ids.has(id)) {
			problems.push(`src/content/projects/${key}.md has no matching locale or entry in projects.yaml`);
		}
	}
	for (const { id, data } of projects) {
		if (data.role === 'signal') continue;
		for (const l of locales) {
			const copy = copyByLocale.get(`${l}/${id}`);
			if (copy && (!copy.problem || !copy.decisions || !copy.result)) {
				problems.push(`src/content/projects/${l}/${id}.md needs problem, decisions and result (${data.role})`);
			}
		}
	}
	if (problems.length > 0) throw new Error(`Project content is inconsistent:\n- ${problems.join('\n- ')}`);

	return projects
		.map(({ id, data }) => ({
			...data,
			...copyByLocale.get(`${locale}/${id}`)!,
			id,
			repoUrl: `https://github.com/${GITHUB_USER}/${data.repo}`,
		}))
		.sort((a, b) => a.order - b.order);
}

export async function getContacts(): Promise<Contact[]> {
	const contacts = await getCollection('contacts');
	return contacts.map(({ id, data }) => ({ ...data, id })).sort((a, b) => a.order - b.order);
}

/**
 * Public path of the résumé PDF for a locale, or undefined until the file exists,
 * so the site never links to a missing file.
 */
export function getResumePath(locale: Locale): string | undefined {
	const path = `/cv/joao-abreu-cv-${locale}.pdf`;
	return existsSync(join(process.cwd(), 'public', path)) ? path : undefined;
}

/**
 * HTML for a mailto link with every character as a numeric entity: browsers show and
 * open it normally, but naive scrapers don't find the address in plain text.
 * Only call it with an address already validated by the contacts schema.
 */
export function obfuscatedMailto(address: string): string {
	const encoded = [...address].map((ch) => `&#${ch.codePointAt(0)};`).join('');
	return `<a href="&#109;&#97;&#105;&#108;&#116;&#111;&#58;${encoded}">${encoded}</a>`;
}
