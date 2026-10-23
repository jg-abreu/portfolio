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
	coverAlt?: string;
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
	const bodyByLocale = new Map(copies.map((c) => [c.id, (c.body ?? '').trim()]));

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
			// A case study needs its page text, and alt text for its cover, in every locale.
			if (data.caseStudy && !bodyByLocale.get(`${l}/${id}`)) {
				problems.push(`src/content/projects/${l}/${id}.md needs a Markdown body (caseStudy: true)`);
			}
			if (data.cover && copy && !copy.coverAlt) {
				problems.push(`src/content/projects/${l}/${id}.md needs coverAlt (cover: ${data.cover})`);
			}
		}
		if (data.cover && !existsSync(join(process.cwd(), 'src/assets/case-studies', data.cover))) {
			problems.push(`src/assets/case-studies/${data.cover} does not exist (cover of ${id})`);
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

/** The text entry of a project in a locale, for rendering its case study body. */
export async function getProjectEntry(locale: Locale, id: string): Promise<CollectionEntry<'projectCopy'>> {
	const entry = (await getCollection('projectCopy')).find((c) => c.id === `${locale}/${id}`);
	if (!entry) throw new Error(`missing src/content/projects/${locale}/${id}.md`);
	return entry;
}

/** About text in the given locale; throws (failing the build) if any locale is missing its file. */
export async function getAbout(locale: Locale): Promise<CollectionEntry<'about'>['data']> {
	const entries = await getCollection('about');
	const missing = locales.filter((l) => !entries.some((e) => e.id === l));
	if (missing.length > 0) throw new Error(`About text missing: ${missing.map((l) => `src/content/about/${l}.md`).join(', ')}`);
	return entries.find((e) => e.id === locale)!.data;
}

export type StackGroup = CollectionEntry<'stack'>['data'] & { id: string };

export async function getStack(): Promise<StackGroup[]> {
	const groups = await getCollection('stack');
	return groups.map(({ id, data }) => ({ ...data, id })).sort((a, b) => a.order - b.order);
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
export function obfuscatedMailto(address: string, className?: string): string {
	const encoded = [...address].map((ch) => `&#${ch.codePointAt(0)};`).join('');
	// className comes from our own templates, never from content, so it is safe in the attribute.
	const cls = className ? ` class="${className}"` : '';
	return `<a${cls} title="${encoded}" href="&#109;&#97;&#105;&#108;&#116;&#111;&#58;${encoded}">${encoded}</a>`;
}
