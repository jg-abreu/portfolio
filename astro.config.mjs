// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://joaoabreu.dev',
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'pt'],
		routing: {
			// Every page lives under /en/ or /pt/; src/pages/index.astro redirects / to /en/.
			// Language detection by Accept-Language will move to nginx (stage 2).
			prefixDefaultLocale: true,
		},
	},
});
