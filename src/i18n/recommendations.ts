import type { Locale } from './ui';

const en = {
  title: 'Recommendations', nav: 'Picks',
  description: 'Books and tools I recommend, with my personal take on each one.',
  empty: 'I am preparing my recommendations. Come back soon.',
  openBook: 'View book', openItem: 'View item',
  bookSource: 'Covers from Google Books',
  poweredBy: 'Powered by Google',
  rating: '{n} of 5 stars',
  groups: { TECHNICAL: 'Technical', NON_TECHNICAL: 'Non-technical' },
};
type Labels = { [K in keyof typeof en]: K extends 'groups' ? Record<keyof typeof en.groups, string> : string };
const pt: Labels = {
  title: 'Recomendações', nav: 'Indicações',
  description: 'Livros e ferramentas que recomendo, com minha opinião sobre cada um.',
  empty: 'Estou preparando minhas recomendações. Volte em breve.',
  openBook: 'Ver livro', openItem: 'Ver item',
  bookSource: 'Capas do Google Books',
  poweredBy: 'Powered by Google',
  rating: '{n} de 5 estrelas',
  groups: { TECHNICAL: 'Técnicos', NON_TECHNICAL: 'Não técnicos' },
};
export const recommendationUi: Record<Locale, Labels> = { en, pt };
