import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Only https links leave the site; repo names must be valid GitHub repository names.
const httpsUrl = z.url({ protocol: /^https$/ });
const repoName = z.string().regex(/^[A-Za-z0-9._-]+$/);

/** Language-neutral project data: which repo, where it appears and what it is built with. */
const projects = defineCollection({
	loader: file('src/content/projects.yaml'),
	schema: z.object({
		repo: repoName,
		// featured: full case study; secondary: project card; signal: consistency strip, not a project.
		role: z.enum(['featured', 'secondary', 'signal']),
		order: z.int().nonnegative(),
		stack: z.array(z.string().min(1)).min(1),
		homepage: httpsUrl.optional(),
	}),
});

/**
 * Project text per locale: src/content/projects/<locale>/<project id>.md.
 * The Markdown body is reserved for the case study pages (stage 10).
 */
const projectCopy = defineCollection({
	loader: glob({ pattern: '*/*.md', base: 'src/content/projects' }),
	schema: z.object({
		title: z.string().min(1),
		tagline: z.string().min(1),
		// Required for featured and secondary projects; src/lib/content.ts enforces it.
		problem: z.string().min(1).optional(),
		decisions: z.array(z.string().min(1)).min(1).optional(),
		result: z.string().min(1).optional(),
	}),
});

const contacts = defineCollection({
	loader: file('src/content/contacts.yaml'),
	schema: z.discriminatedUnion('kind', [
		z.object({
			kind: z.literal('email'),
			address: z.email(),
			primary: z.boolean(),
			order: z.int().nonnegative(),
		}),
		z.object({
			kind: z.enum(['linkedin', 'github', 'devto', 'x', 'instagram']),
			label: z.string().min(1),
			url: httpsUrl,
			primary: z.boolean(),
			order: z.int().nonnegative(),
		}),
	]),
});

/** About text per locale: src/content/about/<locale>.md. */
const about = defineCollection({
	loader: glob({ pattern: '*.md', base: 'src/content/about' }),
	schema: z.object({
		paragraphs: z.array(z.string().min(1)).min(1),
		now: z.array(z.string().min(1)).min(1),
	}),
});

/** Stack groups; their names are UI strings (stack.<id>), so the ids are fixed. */
const stack = defineCollection({
	loader: file('src/content/stack.yaml'),
	schema: z.object({
		order: z.int().nonnegative(),
		items: z.array(z.string().min(1)).min(1),
	}),
});

export const collections = { projects, projectCopy, contacts, about, stack };
