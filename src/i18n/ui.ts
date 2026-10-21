export const locales = ['en', 'pt'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** BCP 47 tags used for <html lang>, hreflang, Open Graph and Intl formatting. */
export const localeTags = {
	en: 'en-US',
	pt: 'pt-BR',
} as const satisfies Record<Locale, string>;

/** Label shown on the language switch, in the language itself. */
export const localeNames = {
	en: 'English',
	pt: 'Português',
} as const satisfies Record<Locale, string>;

// English defines the shape; Portuguese must match it or `astro check` fails the build.
const en = {
	'site.title': 'João Abreu — Back-end Developer',
	'site.description':
		'Portfolio of João Abreu, back-end developer (Java, Spring Boot) and Computer Science student in Rio de Janeiro.',
	'nav.language': 'Language',
	'nav.sections': 'Sections',
	'nav.skip': 'Skip to content',
	'nav.projects': 'Projects',
	'nav.signals': 'Consistency',
	'nav.contact': 'Contact',
	'panel.status': 'SONAR · STANDBY',
	'panel.position': '22°54′S 43°10′W · RIO DE JANEIRO',
	'home.status': 'SIGNAL ACQUIRED · BUILDING',
	'home.heading': 'João Abreu',
	'home.role': 'Back-end developer · Java & Spring Boot',
	'home.body': 'This portfolio is under construction. Check back soon.',
	'projects.heading': 'Projects',
	'projects.featured': 'Featured',
	'projects.problem': 'Problem',
	'projects.decisions': 'Technical decisions',
	'projects.result': 'Result',
	'projects.repo': 'Repository',
	'projects.stack': 'Technologies',
	'signals.heading': 'Consistency signals',
	'contact.heading': 'Contact',
	'contact.resume': 'Résumé (PDF)',
};

const pt: Record<keyof typeof en, string> = {
	'site.title': 'João Abreu — Desenvolvedor Back-end',
	'site.description':
		'Portfólio de João Abreu, desenvolvedor back-end (Java, Spring Boot) e estudante de Ciência da Computação no Rio de Janeiro.',
	'nav.language': 'Idioma',
	'nav.sections': 'Seções',
	'nav.skip': 'Pular para o conteúdo',
	'nav.projects': 'Projetos',
	'nav.signals': 'Constância',
	'nav.contact': 'Contato',
	'panel.status': 'SONAR · EM ESPERA',
	'panel.position': '22°54′S 43°10′O · RIO DE JANEIRO',
	'home.status': 'SINAL CAPTADO · EM CONSTRUÇÃO',
	'home.heading': 'João Abreu',
	'home.role': 'Desenvolvedor back-end · Java e Spring Boot',
	'home.body': 'Este portfólio está em construção. Volte em breve.',
	'projects.heading': 'Projetos',
	'projects.featured': 'Destaque',
	'projects.problem': 'Problema',
	'projects.decisions': 'Decisões técnicas',
	'projects.result': 'Resultado',
	'projects.repo': 'Repositório',
	'projects.stack': 'Tecnologias',
	'signals.heading': 'Sinais de constância',
	'contact.heading': 'Contato',
	'contact.resume': 'Currículo (PDF)',
};

export const ui = { en, pt } as const satisfies Record<Locale, Record<keyof typeof en, string>>;

export type UiKey = keyof typeof en;

export function useTranslations(locale: Locale) {
	return (key: UiKey) => ui[locale][key];
}

export function isLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale);
}
