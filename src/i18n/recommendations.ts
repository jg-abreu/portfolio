import type { Locale } from './ui';

const en = {
  title: 'Recommendations', nav: 'Picks',
  description: 'Books and tools I recommend, with my personal take on each one.',
  empty: 'I am preparing my recommendations. Come back soon.',
  openBook: 'View book', openItem: 'View item', buyAmazon: 'Buy on Amazon',
  bookSource: 'Covers from Google Books',
  poweredBy: 'Powered by Google',
  rating: '{n} of 5 stars',
  back: 'All recommendations',
  explore: 'See the list',
  external: 'Opens {host} in a new tab',
  booksOne: '1 book', booksMany: '{n} books', itemsOne: '1 item', itemsMany: '{n} items',
  groups: { TECHNICAL: 'Technical', NON_TECHNICAL: 'Non-technical' },
  readIn: { PT: 'Read in Portuguese', EN: 'Read in English' },
};
type Labels = { [K in keyof typeof en]: K extends 'groups' ? Record<keyof typeof en.groups, string>
  : K extends 'readIn' ? Record<keyof typeof en.readIn, string> : string };
const pt: Labels = {
  title: 'Recomendações', nav: 'Indicações',
  description: 'Livros e ferramentas que recomendo, com minha opinião sobre cada um.',
  empty: 'Estou preparando minhas recomendações. Volte em breve.',
  openBook: 'Ver livro', openItem: 'Ver item', buyAmazon: 'Comprar na Amazon',
  bookSource: 'Capas do Google Books',
  poweredBy: 'Powered by Google',
  rating: '{n} de 5 estrelas',
  back: 'Todas as recomendações',
  explore: 'Ver a lista',
  external: 'Abre {host} em nova aba',
  booksOne: '1 livro', booksMany: '{n} livros', itemsOne: '1 item', itemsMany: '{n} itens',
  groups: { TECHNICAL: 'Técnicos', NON_TECHNICAL: 'Não técnicos' },
  readIn: { PT: 'Lido em português', EN: 'Lido em inglês' },
};
export const recommendationUi: Record<Locale, Labels> = { en, pt };
