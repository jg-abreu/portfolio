const en = {
  IDLE: 'No site updates have been requested yet.',
  DISABLED: 'Automatic updates are disabled. Selected changes wait for a build.',
  PENDING: 'A site update is queued.',
  DISPATCHING: 'Requesting a site update…',
  DISPATCHED: 'Build request accepted. Check each item to see what is online.',
  unavailable: 'Build status is unavailable. Check each item to see what is online.',
};

export const publicationUi = {
  en,
  pt: {
    IDLE: 'Nenhuma atualização do site foi solicitada ainda.',
    DISABLED: 'Atualizações automáticas desativadas. Alterações selecionadas aguardam um build.',
    PENDING: 'Uma atualização do site está na fila.',
    DISPATCHING: 'Solicitando uma atualização do site…',
    DISPATCHED: 'Pedido de build aceito. Confira em cada item o que está online.',
    unavailable: 'Status do build indisponível. Confira em cada item o que está online.',
  } satisfies typeof en,
};
