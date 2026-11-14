import type { Locale } from './ui';

const en = {
  title: 'Recommendations', nav: 'Picks',
  description: 'Books, courses, videos and tools I recommend, with my personal take on each one.',
  empty: 'I am preparing my recommendations. Come back soon.',
  open: 'View recommendation',
  bookSource: 'Cover from Google Books',
  poweredBy: 'Powered by Google',
  categories: { BOOKS: 'Books', COURSES: 'Courses', VIDEOS: 'Videos', SETUP: 'Setup', TOOLS: 'Tools' },
};
type Labels = { [K in keyof typeof en]: K extends 'categories' ? Record<keyof typeof en.categories, string> : string };
const pt: Labels = {
  title: 'Recomendações', nav: 'Indicações',
  description: 'Livros, cursos, vídeos e ferramentas que recomendo, com minha opinião sobre cada um.',
  empty: 'Estou preparando minhas recomendações. Volte em breve.',
  open: 'Ver recomendação',
  bookSource: 'Capa do Google Books',
  poweredBy: 'Powered by Google',
  categories: { BOOKS: 'Livros', COURSES: 'Cursos', VIDEOS: 'Vídeos', SETUP: 'Setup', TOOLS: 'Ferramentas' },
};
export const recommendationUi: Record<Locale, Labels> = { en, pt };
