import type { Locale } from './ui';

const en = {
  title: 'Profile card', nav: 'Profile card', back: 'Projects and inbox', login: 'Sign in with GitHub',
  loginBody: 'Only your authorized GitHub account can access this workspace.', checking: 'Checking your session…',
  retry: 'Retry', logout: 'Sign out',
  intro: 'Build the card shown on your GitHub profile. Drafts stay private; publishing updates the public image, and GitHub refreshes its cached copy within minutes to a few hours.',
  look: 'Look', theme: 'Theme', accent: 'Accent colour', identity: 'Identity', blocks: 'Blocks', content: 'Block content',
  blocksHelp: 'Choose which blocks appear and their order. Blocks fill the shorter of two columns; the stack block spans the full width.',
  show: 'Show', up: 'Move up', down: 'Move down',
  name: 'Name', role: 'Role', monogram: 'Monogram', headline: 'Headline',
  stack: 'Technologies', stackHelp: 'Up to six, separated by commas.',
  educationTitle: 'Education', educationDetail: 'Education detail', projectTitle: 'Project', projectStack: 'Project stack',
  projectNote: 'Project note', focus: 'Current focus', opportunity: 'Open to',
  preview: 'Preview', previewHelp: 'Unsaved changes are previewed with the latest GitHub data cached by the API.',
  previewAlt: 'Preview of the profile card', previewError: 'The preview could not be drawn. Check the highlighted field.',
  save: 'Save draft', publish: 'Publish card', revert: 'Discard draft changes', defaults: 'Restore approved defaults',
  saved: 'Draft saved.', published: 'Card published. The public image now uses this version.',
  pending: 'The saved draft differs from the published card.', live: 'The published card matches the saved draft.',
  neverPublished: 'Nothing published yet: the public image uses the approved defaults.',
  publishedAt: 'Last published', unsaved: 'Save the draft before publishing.',
  error: 'The request failed. Please try again.', expired: 'Your session ended. Sign in again.',
  conflict: 'The card changed in another tab. Your text was kept; reload to see the latest version before saving.',
  invalid: 'Check the highlighted field: it is empty or too long for the card.', reload: 'Reload latest version',
  discardTitle: 'Discard unsaved changes?', discard: 'Discard changes', keep: 'Keep editing',
  themes: { DARK: 'Dark', LIGHT: 'Light' },
  accents: { BLUE: 'Blue', GREEN: 'Green', VIOLET: 'Violet', ORANGE: 'Orange' },
  blockNames: { CONTRIBUTIONS: 'Contributions', LATEST_REPOSITORY: 'Latest repository', STACK: 'Tech stack',
    EDUCATION: 'Education and project', FOCUS: 'Current focus', OPPORTUNITY: 'Open to opportunities' },
};

type Nested<T> = { [K in keyof T]: T[K] extends string ? string : Nested<T[K]> };
export type CardAdminLabels = Nested<typeof en>;

const pt: CardAdminLabels = {
  title: 'Card do perfil', nav: 'Card do perfil', back: 'Projetos e caixa de entrada', login: 'Entrar com GitHub',
  loginBody: 'Somente sua conta autorizada do GitHub acessa este espaço.', checking: 'Verificando sua sessão…',
  retry: 'Tentar novamente', logout: 'Sair',
  intro: 'Monte o card exibido no seu perfil do GitHub. Rascunhos ficam privados; publicar atualiza a imagem pública, e o GitHub renova a cópia em cache entre alguns minutos e algumas horas.',
  look: 'Aparência', theme: 'Tema', accent: 'Cor de destaque', identity: 'Identidade', blocks: 'Blocos', content: 'Conteúdo dos blocos',
  blocksHelp: 'Escolha quais blocos aparecem e em que ordem. Os blocos ocupam a coluna mais curta; o bloco de tecnologias ocupa a largura toda.',
  show: 'Mostrar', up: 'Mover para cima', down: 'Mover para baixo',
  name: 'Nome', role: 'Cargo', monogram: 'Monograma', headline: 'Frase de apresentação',
  stack: 'Tecnologias', stackHelp: 'Até seis, separadas por vírgulas.',
  educationTitle: 'Formação', educationDetail: 'Detalhe da formação', projectTitle: 'Projeto', projectStack: 'Tecnologias do projeto',
  projectNote: 'Observação do projeto', focus: 'Foco atual', opportunity: 'Aberto a',
  preview: 'Prévia', previewHelp: 'Alterações não salvas aparecem com os últimos dados do GitHub em cache na API.',
  previewAlt: 'Prévia do card do perfil', previewError: 'Não foi possível desenhar a prévia. Confira o campo destacado.',
  save: 'Salvar rascunho', publish: 'Publicar card', revert: 'Descartar alterações do rascunho', defaults: 'Restaurar o padrão aprovado',
  saved: 'Rascunho salvo.', published: 'Card publicado. A imagem pública agora usa esta versão.',
  pending: 'O rascunho salvo é diferente do card publicado.', live: 'O card publicado é igual ao rascunho salvo.',
  neverPublished: 'Nada publicado ainda: a imagem pública usa o padrão aprovado.',
  publishedAt: 'Última publicação', unsaved: 'Salve o rascunho antes de publicar.',
  error: 'A solicitação falhou. Tente novamente.', expired: 'Sua sessão terminou. Entre novamente.',
  conflict: 'O card foi alterado em outra aba. Seu texto foi mantido; recarregue para ver a versão mais recente antes de salvar.',
  invalid: 'Confira o campo destacado: ele está vazio ou longo demais para o card.', reload: 'Recarregar versão mais recente',
  discardTitle: 'Descartar alterações não salvas?', discard: 'Descartar alterações', keep: 'Continuar editando',
  themes: { DARK: 'Escuro', LIGHT: 'Claro' },
  accents: { BLUE: 'Azul', GREEN: 'Verde', VIOLET: 'Violeta', ORANGE: 'Laranja' },
  blockNames: { CONTRIBUTIONS: 'Contribuições', LATEST_REPOSITORY: 'Último repositório', STACK: 'Tecnologias',
    EDUCATION: 'Formação e projeto', FOCUS: 'Foco atual', OPPORTUNITY: 'Aberto a oportunidades' },
};

export const cardAdminUi: Record<Locale, CardAdminLabels> = { en, pt };
