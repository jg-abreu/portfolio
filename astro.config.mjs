// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = 'https://joaoabreu.dev';

// https://astro.build/config
export default defineConfig({
	site,
	security: {
		csp: {
			directives: [
				"default-src 'self'",
				"base-uri 'none'",
				"object-src 'none'",
				"form-action 'none'",
				"img-src 'self'",
				"font-src 'self'",
				"connect-src 'self' https://api.github.com https://github-contributions-api.jogruber.de",
			],
			// Sonar timing, reveals and syntax highlighting use inline style attributes.
			styleDirective: {
				resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
			},
		},
	},
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'pt'],
		routing: {
			// Every page lives under /en/ or /pt/, and / always goes to /en/ (English is the default for
			// everyone; no browser-language detection). nginx should answer / with a 301 to /en/;
			// src/pages/index.astro is the static fallback.
			prefixDefaultLocale: true,
		},
	},
	integrations: [
		sitemap({
			// Each URL lists its other-language version as an hreflang alternate.
			i18n: { defaultLocale: 'en', locales: { en: 'en-US', pt: 'pt-BR' } },
			// The root only redirects and the 404 page is not content.
			filter: (page) => page !== `${site}/` && !page.includes('/404'),
		}),
	],
});
