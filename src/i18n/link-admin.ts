import type { Locale } from './ui';

const en = {
  title: 'Links page', nav: 'Links page', back: 'Projects and inbox', login: 'Sign in with GitHub',
  loginBody: 'Only your authorized GitHub account can access this workspace.', checking: 'Checking your session…',
  retry: 'Retry', logout: 'Sign out',
  intro: 'The buttons on joaoabreu.dev/links. Drafts stay private; publishing rebuilds the site in about a minute.',
  links: 'Links', linkTitle: 'Title', linkUrl: 'Link', linkIcon: 'Icon',
  urlHelp: 'https:// address or mailto:. Links to joaoabreu.dev/en/… open in the visitor’s language.',
  chooseIcon: 'Choose icon for {title}', searchIcons: 'Search icons', noIcons: 'No icon matches.',
  addLink: 'Add link', remove: 'Remove {title}', moveUp: 'Move up', moveDown: 'Move down', drag: 'Drag to reorder',
  untitled: 'Untitled link', limit: 'The page holds up to twenty links.', lastLink: 'The page needs at least one link.',
  moved: '{title} moved to position {position}.', removed: '{title} removed.', added: 'Link added.',
  preview: 'Preview', open: 'Open the public page',
  save: 'Save draft', publish: 'Publish links', revert: 'Discard draft changes', defaults: 'Restore defaults',
  saved: 'Draft saved.', published: 'Links published. The site rebuilds in about a minute.',
  pending: 'The saved draft differs from the published links.', live: 'The published links match the saved draft.',
  neverPublished: 'Nothing published yet: the public page uses the defaults.',
  publishedAt: 'Last published', unsaved: 'Save the draft before publishing.',
  error: 'The request failed. Please try again.', expired: 'Your session ended. Sign in again.',
  conflict: 'The links changed in another tab. Your text was kept; reload to see the latest version before saving.',
  invalid: 'Check the highlighted field: titles need 1 to 40 characters and links an https:// or mailto: address.',
  reload: 'Reload latest version',
  discardTitle: 'Discard unsaved changes?', discard: 'Discard changes', keep: 'Keep editing',
};

export type LinkAdminLabels = { [K in keyof typeof en]: string };

const pt: LinkAdminLabels = {
  title: 'Página de links', nav: 'Página de links', back: 'Projetos e caixa de entrada', login: 'Entrar com GitHub',
  loginBody: 'Somente sua conta autorizada do GitHub acessa este espaço.', checking: 'Verificando sua sessão…',
  retry: 'Tentar novamente', logout: 'Sair',
  intro: 'Os botões de joaoabreu.dev/links. Rascunhos ficam privados; publicar reconstrói o site em cerca de um minuto.',
  links: 'Links', linkTitle: 'Título', linkUrl: 'Link', linkIcon: 'Ícone',
  urlHelp: 'Endereço https:// ou mailto:. Links para joaoabreu.dev/en/… abrem no idioma do visitante.',
  chooseIcon: 'Escolher ícone de {title}', searchIcons: 'Buscar ícones', noIcons: 'Nenhum ícone encontrado.',
  addLink: 'Adicionar link', remove: 'Remover {title}', moveUp: 'Mover para cima', moveDown: 'Mover para baixo',
  drag: 'Arraste para reordenar',
  untitled: 'Link sem título', limit: 'A página comporta até vinte links.', lastLink: 'A página precisa de pelo menos um link.',
  moved: '{title} foi para a posição {position}.', removed: '{title} removido.', added: 'Link adicionado.',
  preview: 'Prévia', open: 'Abrir a página pública',
  save: 'Salvar rascunho', publish: 'Publicar links', revert: 'Descartar alterações do rascunho', defaults: 'Restaurar o padrão',
  saved: 'Rascunho salvo.', published: 'Links publicados. O site é reconstruído em cerca de um minuto.',
  pending: 'O rascunho salvo é diferente dos links publicados.', live: 'Os links publicados são iguais ao rascunho salvo.',
  neverPublished: 'Nada publicado ainda: a página pública usa o padrão.',
  publishedAt: 'Última publicação', unsaved: 'Salve o rascunho antes de publicar.',
  error: 'A solicitação falhou. Tente novamente.', expired: 'Sua sessão terminou. Entre novamente.',
  conflict: 'Os links foram alterados em outra aba. Seu texto foi mantido; recarregue para ver a versão mais recente antes de salvar.',
  invalid: 'Confira o campo destacado: o título precisa de 1 a 40 caracteres e o link de um endereço https:// ou mailto:.',
  reload: 'Recarregar versão mais recente',
  discardTitle: 'Descartar alterações não salvas?', discard: 'Descartar alterações', keep: 'Continuar editando',
};

export const linkAdminUi: Record<Locale, LinkAdminLabels> = { en, pt };
