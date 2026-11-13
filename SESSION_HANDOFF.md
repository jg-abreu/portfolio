# Retomada — 2026-11-11

## Continuidade — dependências do frontend em 13/11

- npm audit --json consultou registry com sucesso: zero vulnerabilidades conhecidas em todas as severidades, 346 dependências reportadas. Não é auditoria Java, CodeQL ou certificação completa do código.
- Dependabot preparado somente na feat/v2: npm e Actions semanais, PRs de versão para feat/v2, limites3/2, minor/patch npm agrupados, sem automerge. GitHub lê configuração na branch padrão; ainda não ativo, nenhum run/PR criado. No lançamento autorizado revisar destino de manutenção; não copiar para main agora. Security updates têm configuração/branch padrão próprias, não alteradas.
- docs/dependency-security.md registra escopo, fontes oficiais e pendências Java/CodeQL. Inspeção pontual de DOM/Markdown/localStorage não encontrou nova falha confirmada. Nenhuma alteração de dependência/runtime/deploy.

## Continuidade — contador integrado isolado em 13/11

- Revisão real em Chrome/PT com API8081/Astro4324 separados, banco sintético portfolio_visits_review_20261113, DIRECT e chave HMAC temporária só em memória. Primeiro acesso expôs Visitas aproximadas:1 na árvore de acessibilidade; reload preservou total1 e uma linha de deduplicação no PostgreSQL.
- API temporária parada após conferir PID/JAR/porta; reload removeu contador da árvore e preservou conteúdo/rodapé. Capturas não mostraram a linha numérica: não declarar aprovação visual, largura móvel ou formato EN. Detalhes/limites em docs/visits.md. Sem mudança funcional ou testes de produção.
- Astro4324 encerrado via comando próprio; API8080 habitual healthUP. Aba voltou ao login PT4321. Banco sintético preservado, sem exclusão; chave temporária não persistida. Todos os demais recursos da API isolada desativados. Main, VM, dispatch, e-mails e Gemini intactos.

## Continuidade — status autenticado e layout em 13/11

- Login GitHub local chegou ao admin e confirmou atualizações automáticas desativadas. Encontrado bug real: PublicationStatus era terceiro filho direto do grid de duas colunas, deslocando sidebar e comprimindo título. Componente movido para dentro de studio-main.
- Chrome nativo: layout desktop EN corrigido, largura móvel 360×653 em EN/PT e temas claro/escuro inspecionados; status legível, sem overflow horizontal visível na área revista. Logout retornou ao login PT; DevTools fechado, tema claro restaurado. Nenhum rascunho, seleção pública, dispatch ou e-mail criado. Demais estados da fila só têm cobertura automatizada nesta rodada.
- Build/check aprovados, 29 páginas e zero diagnósticos Astro; avisos CSP/Shiki preexistentes. Main, VM e produção preservadas. Próximas pendências em docs/validation.md.

## Continuidade — templates públicos e fallback em 13/11

- Drive recuperou as evidências pendentes da restauração/133 testes e do bloqueio da revisão CUA; backup privado das notas enviado em 9068847. Histórico preservado.
- Lighthouse 13.6.0 ampliado para nove templates públicos: home EN 98, projetos EN 99, caso de estudo PT 99, Pipeline EN 99, blog PT 94, currículo PT 99, contato EN 99, Recomendações PT 99. Acessibilidade/boas práticas/SEO 100 nesses casos. Artigo teve contraste 3,56:1 e acessibilidade96; corrigidos links de --accent para --brand e mesmo padrão no eyebrow do assistente. Artigo EN final97 e PT91, demais três categorias100; contraste aprovado nos dois. Build/check final 29 páginas aprovado; sem testes novos para mudança CSS de duas linhas.
- Smoke combinado home PT: Chrome isolado headless com movimento reduzido forçado e APIs GitHub/contribuições bloqueadas, confirmado status-1/zero bytes. Captura completa inspecionada preservou headline, heatmap/estatísticas do snapshot, repositórios, tecnologias e rodapé. Notas99/100/100/100. Não é rede totalmente offline nem revisão de todo gesto/efeito. Relatórios locais ignorados; docs/validation.md detalha escopo e valores.
- Revisão autenticada do novo status de publicação continua pendente; última tentativa do controle nativo foi bloqueada por confiança na URL, sem contorno. Credenciais reais de assistente/card e infraestrutura manual continuam pendentes. Nenhum deploy, merge/main, e-mail ou chamada Gemini.

## Continuidade — restauração isolada e API atualizada em 13/11

- BackupRestoreTests exporta pg_dump real de um PostgreSQL descartável e restaura em outro, com imagem sintética copiada separadamente. Confere oito migrações/Flyway, dados capturados apesar de mudanças posteriores na origem, contrato EN/PT de recomendação, revisão/capa, contador/fila, identity e FK. Não é backup externo da VM; checklist manual em portfolio-api/docs/backup-restore.md.
- Falha intermitente em fixture de ContactDeliveryTests reproduzida 53/100 vezes com attempts=0; fixture explicitamente vencida passou 100/100. Removido diagnóstico temporário e adicionado teste de mensagem futura não elegível. Worker de produção intacto. Suíte completa final: 133 testes, zero falhas/erros/ignorados. API a965d5c e 310eaa5 enviados na feat/v2.
- JAR empacotado e processo local antigo PID4472 parado após verificar porta/JAR. Novo PID21784, timeout30m, banco isolado portfolio_e2e_20261113_0110 atualizado até V8; health UP. Intake/mail/retention/visits/publication/profile-card false, tokens de dispatch/card e Gemini esvaziados apenas no processo de revisão. GET público Recomendações vazio e publicação anônima 401. Banco habitual e VM intactos.
- Próximo imediato: revisão autenticada do status novo no navegador; ainda não registrar como validada. Depois demais checks locais, credenciais reais/infraestrutura manual e lançamento conjunto conforme autorização. Nenhuma alteração em main, e-mail novo, cota Gemini ou deploy.

## Continuidade — fila de publicação e Lighthouse em 13/11

- Publicação preparada na API 20330df e site f0aa667, ambos enviados à feat/v2. V8 registra geração na mesma transação de selecionar/retirar cópia; salvar/arquivar rascunho não dispara. Lease de 2 min, envio fora da transação, coalescência, falha espera 5 min, agendador 30 s; flag PORTFOLIO_PUBLICATION_ENABLED false por padrão. Destino fixo publication-v2.yml/ref feat/v2, nenhum token/run/workflow criado. Aceitação pelo GitHub não significa build/deploy concluído; manifestos continuam sendo a prova por item.
- API: suíte completa 131 testes, oito migrações somente em Testcontainers descartáveis, sem falhas/erros/ignorados. Site: 64 testes/build 29 páginas, depois 15 focados e integração bilíngue repetida após ajustes. Novo status privado PT/EN nos dois admins, limpeza no logout/respostas atrasadas; revisão autenticada do status no navegador ainda pendente. JAR/banco habitual não foram atualizados ou migrados.
- Lighthouse CLI 13.6.0 local/mobile, Chrome isolado: home PT 98/100/100/100; Recomendações EN final 97/100/100/100. Corrigidos nomes acessíveis do logotipo JA e menu compacto Picks; auditoria final de nomes aprovou sem nós problemáticos. Build/check finais aprovados; não representa todas as páginas, catálogo com capas, aparelho físico ou produção. Detalhes em docs/validation.md.
- Chave Gemini ausente nas fontes conferidas (ambiente usuário/processo e IntelliJ); token do card ausente no ambiente usuário/processo. Nenhum segredo exposto/configurado. Não simular como auditoria real. GitHub exige workflow registrado na branch padrão: conexão real continua aguardando lançamento autorizado e execução manual de infraestrutura pelo João; instruções concretas em docs/publication.md. Main, VM e produção intactas.

## Continuidade — card SVG e README da API em 13/11

- API ganhou GET /api/profile-card.svg, desativado por padrão: consulta GraphQL fixa para contribuições do último ano e último repositório público do próprio jg-abreu. Refresh em segundo plano a cada 15 min; leitura pública só usa cache. Falha mantém última leitura e data; sem leitura mostra indisponível. Cache em memória por processo, perdido no restart.
- SVG com textos escapados, sem recursos externos, ETag/304 e cache HTTP de 5 min; token PROFILE_CARD_GITHUB_TOKEN só no servidor. Nenhum token real configurado ou consulta real feita. Flag PORTFOLIO_PROFILE_CARD_ENABLED ausente mantém rota sem controller; admin/CSRF preservados.
- Dez testes focados aprovados; suíte completa da API passou 122 testes, zero falhas/erros/ignorados. Prévia pelo renderer real, com número/repositório sintéticos, rasterizada e inspecionada localmente; não é aprovação visual do João. Commit API 560b81f enviado à feat/v2. docs/profile-card.md registra configuração e limitações.
- README da API criado com stack, execução local, contratos, flags, documentação e limitações verificadas. JAR da API local não foi substituído/reiniciado; banco habitual, infraestrutura, main, produção e README público do perfil intactos. Ainda faltam teste GraphQL real, aprovação visual e integração no perfil no lançamento. Próxima implementação: publicação automática, dentro da regra de infraestrutura manual.

## Continuidade — assistente claro e teclado em 13/11

- Chrome local 4321, 360×653 CSS px, PT/EN: diálogo claro legível, controles dentro da largura e rolagem vertical disponível. Nenhuma pergunta enviada, chamada Gemini ou alteração funcional.
- PT: foco inicial no campo, Tab com indicador visível em envio e contato; botão de fechar devolve foco ao gatilho e Enter reabre; Escape fecha. EN: diálogo claro e Escape com foco restaurado conferidos. Não equivale a auditoria completa de tabulação/leitor de tela, resposta clara ou aparelho físico.
- Continuam pendentes auditoria real de respostas/fontes/fallback, revisão ampla de acessibilidade e preparação da publicação dentro da regra de infraestrutura manual. Registro detalhado em docs/assistant.md.

## Continuidade — upload manual validado em 13/11

- Chrome PT em 360 CSS px: PNG sintético 1×1 escolhido pelo seletor nativo, upload aceito, rascunho EN/PT salvo, página recarregada e item reaberto com imagem e textos persistidos. Não equivale à avaliação visual de uma capa real.
- Fixture `synthetic-manual-cover-upload` arquivada no banco isolado, sem cópia pública selecionada. GET /api/recommendations confirmou catálogo vazio. Nenhum código funcional, deploy, e-mail ou chamada Gemini nesta revisão.
- Mantidas branches feat/v2, main e produção intactas. Próximo: pendências da revisão final e preparação da publicação; infraestrutura continua sendo executada manualmente pelo João.

## Continuidade — contador implementado em 13/11

- API ganhou módulo visits, condicionado a PORTFOLIO_VISITS_ENABLED=true (padrão false): GET total e POST com CSRF retornando total/counted, no-store. HMAC-SHA256 dos bytes canônicos do IP, janela de 30 min sem reiniciar a espera, UPSERT e incremento do total na mesma transação. Limpeza a cada minuto de hashes vencidos, sem zerar total; tabelas V2 reutilizadas.
- DIRECT ignora headers; CLOUDFLARE_PROXY exige CIDRs explícitos do peer nginx/Docker e da Cloudflare, valida X-Real-IP sobrescrito e CF-Connecting-IP literal. Exige server.forward-headers-strategy=NONE quando ligado. Não habilitar atrás do proxy sem conferir a cadeia real. Chave privada >=32 caracteres, sem valor real criado/gravado nesta etapa. Bots óbvios ignorados por heurística; visitas não equivalem a pessoas únicas.
- Site: rodapé opcional PUBLIC_VISITS_ENABLED=true, só páginas públicas, exclui admin/404. Espera load, usa CSRF, valida total real e localiza número; erros deixam contador oculto. Nenhum identificador/path enviado ou localStorage usado pelo contador. Padrão continua false.
- API verify completo aprovado com 93 testes; depois adicionada verificação HTTP real com cookie/CSRF e repetição sem duplicação, e suíte focada do contador passou 8 testes. Não chamar de execução completa de 94 testes: a rodada final de 8 foi focada. Um teste antigo de outbox agora marca a fixture explicitamente vencida antes de testar reenvio; comportamento do worker intacto.
- Site 42 testes aprovados e build 25 páginas, astro check sem erros/avisos/dicas. Integração do build liga flag para conferir marcador em artigos e ausência em admin/404; build normal restaurado desligado. Rodapé numérico habilitado ainda sem revisão visual específica.
- API local restaurada PID 22824 (revalidar), JAR contém contador, sessão 30 min, visitas/intake/SMTP/retenção false. Health UP e GET /api/visits=404 confirmados com feature desligada. Astro PID 24868, contato/contador desligados. Nenhuma modificação na VM/main, envio de e-mail ou deploy.
- Próxima etapa grande: Recomendações com imagens fora do banco, rascunhos/cópias públicas EN/PT e controle no admin. Depois publicação automática, revisão do assistente e verificações finais (inclui carga/balanceamento só local), backup/restauração e configuração de proxy/retenção/segredos antes do lançamento. João pediu execução contínua, parando somente em ponto seguro próximo do limite; não pedir nova autorização para o trabalho já autorizado.

## Continuidade — blog interno concluído em 13/11

- Cards do blog abrem páginas próprias em /en/blog/{slug}/ e /pt/blog/{slug}/. Corpo completo importado automaticamente do DEV no build, com texto original EN/PT dos dois artigos existentes. Sem requisição da API DEV no navegador; imagens continuam no CDN existente.
- Novo scripts/blog-snapshot.ts após snapshot de metadados: valida autor/URL/corpo, baixa com limites e grava snapshot público ignorado pelo Git. Falha mantém cópia anterior completa; ausência de corpo/cópia no primeiro carregamento bloqueia o build para preservar o release atual. CI novo não tem cache entre execuções configurado; ver docs/blog.md.
- Renderização usa o parser já existente: HTML executável e embeds não executados, links HTTPS, imagens de hosts permitidos e repositórios raw do próprio João pelo proxy DEV. Blocos de código e tabelas rolam dentro do conteúdo; diagrama real visível.
- 39 testes do site aprovados, incluindo geração real das páginas EN/PT em fixture; astro check 0 erros/avisos/dicas e build final 25 páginas, quatro de artigos. Avisos de CSP/Shiki já existentes. Nenhuma mudança no deploy.
- Chrome: card abriu artigo local, leitura de texto/diagrama/código, 360 px nos dois temas, idioma manteve o mesmo slug. Espaçamento superior ajustado. DevTools fechado e tema claro restaurado; CUA encerrou normalmente.
- API segue correção 2d3f975, sessão normal 30 min, PID 29712 (revalidar); intake/SMTP/retenção false. Próxima etapa: contador, regra já confirmada na issue #4 e no Drive: uma visita por IP a cada 30 min, sem reiniciar espera nos acessos intermediários, todas páginas públicas menos 404. Recomendações/publicação automática e preparação do lançamento continuam pendentes.

## Continuidade — conflitos e expiração do inbox em 13/11

- Conflito real entre abas revelou bug da API: despacho ERROR do Tomcat era negado pela segurança, transformando 409 em 403 e levando o front ao login. Corrigido permitindo apenas DispatcherType.ERROR; rotas normais, ADMIN e CSRF preservados. Novo ContactHttpErrorTests com HTTP/Tomcat real ficou vermelho (409 esperado, 403 recebido), depois verde; fixture de sessão somente em src/test.
- API verify completo aprovado: 86 testes. Site: 35 testes, incluindo novo caso que remove corpo/e-mail/lista do inbox após sessão expirada. Repetição real em duas abas exibiu conflitos EN/PT sem logout e permitiu salvar após reabrir a versão atual.
- Expiração real local com timeout temporário de 1 minuto e abas do inbox em segundo plano: ao voltar, login visível, corpo e e-mail sintéticos ausentes. Reload posterior interrompido pela política de URL do controle do navegador, sem contorno. CUA encerrado. Prazo normal restaurado para 30 minutos, API PID 29712; revalidar PID.
- Banco isolado preservado com id=1 sent/attempts=1 e id=2 pending/attempts=0, lida, não arquivada, versão 3. Nenhum envio novo, contato/SMTP/retenção false, sem deploy/main. Continuar por funcionalidades pendentes; não depender do navegador para salvar a correção.

## Continuidade — celular e agendador validados em 13/11

- Complementa os registros anteriores: formulário e inbox inspecionados no Chrome em 360 CSS px, EN/PT e temas claro/escuro. Lista, detalhe, ações, campos e feedback legíveis; sem ajuste funcional necessário. Emulação de navegador, não aparelho físico.
- Com recebimento da API desligado, os formulários EN/PT exibiram erro real e preservaram nome, e-mail e mensagem. Com apenas o recebimento local ligado, formulário EN confirmou aceite e limpou campos. Nova linha sintética id=2 no banco `portfolio_e2e_20261113_0110`, pending/attempts=0. Linha id=1 continua sent/attempts=1. Não ligar SMTP nesse banco sem revisar a fila; nenhum novo e-mail enviado.
- Novo ContactSchedulerTests da API aprovado (1 teste): Spring dispara o worker real automaticamente, PostgreSQL Testcontainers e JavaMailSender simulado; observa sending e sent com uma tentativa. Nenhuma chamada manual ao worker no teste. Código funcional e polling padrão inalterados; suítes completas anteriores não foram repetidas.
- Logout móvel concluído; DevTools/emulação fechados. API restaurada PID 23868 em loopback:8080, mesmo banco isolado, recebimento/SMTP/retenção false; Astro PID 24868 com PUBLIC_CONTACT_ENABLED=false. Revalidar PIDs antes de usar. Sem deploy ou mudanças na main.
- Restam revisão de expiração com inbox aberto, conflito entre abas, rede desconectada e preparação de proxy/retenção/backup antes do lançamento. Publicação automática e Recomendações seguem pendentes.

## Continuidade — fluxo local integrado validado em 13/11

- João confirmou recebimento do teste SMTP #0 nos dois destinos e autorizou seguir com o fluxo completo local. Usado banco separado `portfolio_e2e_20261113_0110`, criado sem tocar no banco habitual `portfolio`; seis migrações aplicadas.
- Formulário PT habilitado somente no processo de dev, preenchido e enviado pelo Chrome/CUA com uma mensagem sintética. Confirmação real recebida e campos limpos; banco tinha exatamente uma linha pending, attempts=0, id=1.
- Login GitHub real e inbox EN/PT conferidos: listagem, detalhe, leitura, arquivamento e restauração. Versão 3, read_at preenchido, archived_at vazio, entrega ainda pending e attempts=0 após ações do inbox.
- Worker real invocado manualmente uma única vez, com guardas para banco/linha/destinatários sintéticos esperados; não foi habilitado scheduler. Banco passou a sent, attempts=1, sent_at preenchido. Gmail dev confirmou `Portfolio contact #1` na INBOX; João confirmou chegada no pessoal.
- Logout removeu conteúdo privado e, após reload, navegador continuou na tela de login. Consulta anônima independente ao inbox respondeu 401. CUA finalizado normalmente, sem o bloqueio de URL anterior nesta verificação.
- Restauração concluída: Astro PID 10552 em localhost:4321, PUBLIC_CONTACT_ENABLED=false; API PID 20552, loopback:8080, ligada ao banco isolado para revisão com recebimento/SMTP/retenção false. Arquivo privado SMTP continua com flags false. Health UP; formulário HTML desabilitado confirmado. Nenhuma alteração no servidor/main, nenhum deploy.
- Mensagem sintética preservada no banco isolado. Documentação detalha limites: largura de celular, envio pelo formulário EN, falha real de serviço na UI, conflitos entre abas e disparo autônomo do scheduler ainda pendentes. Suítes anteriores 84/34 aprovadas; sem novo código funcional ou reexecução dessas suítes neste teste manual.

## Continuidade — autenticação SMTP local em 13/11

- João criou uma senha de app e a inseriu pessoalmente em `.env.smtp.local` da API. Arquivo confirmado como ignorado pelo Git, com acesso local restrito ao usuário e SYSTEM; senha não exibida nem versionada. Espaços de agrupamento removidos localmente.
- Teste de conexão via JavaMailSenderImpl.testConnection aprovado com STARTTLS obrigatório, sem envio de mensagem. Flags de entrega, recebimento e retenção continuam false nesse arquivo; nada alterado na VM.
- João autorizou um único teste sintético pelo adaptador real SmtpContactNotifier, assunto `Portfolio contact #0`, para pessoal + dev. SMTP aceitou o envio em 13/11, aproximadamente 00:58 no Rio. Gmail conectado à conta dev confirmou a mensagem com labels INBOX e SENT. Recebimento no pessoal ainda depende de confirmação; não reenviar automaticamente.
- Teste foi do transporte real com dados sintéticos, fora da fila/banco, não do formulário completo. Flags locais continuam desativadas. Nenhum deploy ou envio adicional realizado.

## Continuidade — contato e fila preparados em 13/11

- João aprovou SMTP/JavaMailSender com conta dev remetente, os dois e-mails destinatários e retenção de 90 dias. Aprendizado do fluxo combinado para o fim do projeto.
- Recebimento `/api/contact` implementado, condicionado a `portfolio.contact.submission.enabled=true` (padrão desligado). Mantém CSRF, valida campos, limita JSON a 16 KiB e aceita no máximo 5 tentativas por endereço/10 min e 100 globais/10 min. Limitador local limitado em memória, sem logs de dados dos visitantes. Revisar origem confiável do endereço de cliente antes da exposição pública.
- Migração V6 acrescenta submission_key UUID única. Repetição da mesma chave e conteúdo retorna 202 sem duplicar; conteúdo diferente com a mesma chave retorna 409. A resposta accepted significa persistência, não entrega por e-mail.
- Worker SMTP preparado e desligado por padrão: captura atômica de uma mensagem por vez com trava de 5 minutos, até 5 tentativas e recuo de 1/2/4/8 minutos. Falhas não perdem a mensagem. SMTP é pelo menos uma vez: falha após entrega ou entrega parcial pode causar repetição, documentada para revisão antes de ativar.
- Retenção em tarefa separada, habilitada por `portfolio.contact.retention.enabled=true`, remove mensagens com mais de 90 dias e preserva travas de envio ainda ativas. Nenhuma flag ativada fora dos testes; nenhuma exclusão na VM.
- Formulário EN/PT integrado atrás de `PUBLIC_CONTACT_ENABLED=true`, padrão desativado. Mantém texto nas falhas e chave nas repetições, limpa apenas após 202 confirmado. UI nova ainda depende de revisão real no navegador.
- Validação final desta implementação: API 84 testes sem falhas, verify aprovado; site 34 testes aprovados. SMTP simulado; sem credenciais de Gmail e sem e-mail real. Próximo bloqueio para entrega real: configurar autenticação SMTP privadamente (senha de app da conta dev, quando disponível), depois testar explicitamente uma mensagem sintética aos dois destinos. Nenhum deploy.

## Continuidade — inbox privado em 13/11

- Mantido o bloqueio de deploy: trabalho somente na feat/v2. Nenhum servidor foi alterado nesta etapa.
- Validação real do admin local concluída anteriormente: login GitHub, criação bilíngue, edição, preparação/retirada de cópia pública, arquivamento e restauração. Rascunho `admin-check-20261112` deixado arquivado, sem cópia pública; projeto preexistente preservado. Logout voltou ao login; consulta adicional do 401 no mesmo navegador interrompida pela política da ferramenta ao perder a identificação da URL.
- Implementado inbox: API privada `/api/admin/messages` com paginação, detalhe, leitura/não leitura e arquivo/restauração. Migração V5 adiciona read_at, archived_at e version sem alterar V1. Campos de envio/conteúdo mapeados somente para leitura pelo inbox; alterações usam versão e CSRF.
- Interface EN/PT no mesmo admin, conteúdo sempre textContent; cleanup de sessão e proteção contra respostas atrasadas estendidos ao inbox. Testes de script cobrem rendering, limpeza e encadeamento correto de versões. Revisão real do novo inbox no navegador ainda pendente.
- API: 74 testes aprovados com PostgreSQL Testcontainers. Empacotamento repetido sem testes após encerrar o processo local 8312 que mantinha o JAR aberto; artefato gerado. API local precisa ser iniciada novamente; não presumir que o processo antigo continua ativo.
- João autorizou SMTP/JavaMailSender mesmo sem conhecer ainda; pediu para aprender no fim. Escolheu a conta dev como remetente; destinatários continuam pessoal e dev. Transporte SMTP preparado na API, desativado por padrão e sem credenciais: texto simples, Reply-To validado, falha propagada sem marcar entrega. Não há worker chamando esse transporte nem envio real; formulário público continua desativado. Exemplos privados de configuração em docs/contact-smtp.md. Prazo de retenção perguntado, aguardando decisão.
- Validação final: API 77 testes sem falhas e verify aprovado; site 30 testes e build aprovados, com avisos de CSP/Shiki já existentes. API local permanece parada após o empacotamento; nova migração validada apenas nos bancos isolados de teste, sem alteração da VM.

## Continuidade — revisão local do admin em 12/11

- João reafirmou: não publicar o front-end nem fazer novos deploys agora; lançamento conjunto da V2 quando pronta. Trabalho continua em `feat/v2`, sem PR para main. As instruções históricas abaixo sobre publicar o build são próximas etapas futuras, não autorização vigente.
- Pull trouxe o assistente: front-end `0422e90` e API `8d8fb77`; alterações preservadas. Nenhuma mudança no servidor nesta etapa.
- Corrigida limpeza local de sessão no admin: logout e respostas 401/403 apagam campos do editor, dados carregados e usuário, fecham diálogos e voltam ao login. Uma versão de sessão impede respostas anteriores ao logout de atualizarem a tela; erros de sessão no manifesto opcional não são mais ignorados.
- Quatro regressões reproduzidas antes da correção e aprovadas depois, executando o script real com HTTP/DOM controlados. Oito testes do assistente também aprovados. `npm test` executa ambos. Procedimento manual em `docs/admin-testing.md`.
- Testes atuais de autenticação da API: 14 aprovados (login, identidade, state/PKCE, CSRF, repetição do callback e logout). Docker e serviços locais não encontrados nesta verificação; criação/edição/arquivamento com PostgreSQL e revisão visual real ainda pendentes. Não confundir o harness com teste completo no navegador.

## Continuidade — API e login da V2 validados

- Aplicativo GitHub OAuth separado `Portfolio Admin V2` criado pelo João; homepage e callback em `v2.joaoabreu.dev`. João gerou o segredo e autorizou o aplicativo com acesso limitado aos dados públicos.
- Credenciais inseridas diretamente no `.env` privado da VM, preservando `POSTGRES_PASSWORD`; modo 600 mantido. Nenhum segredo incluído neste registro. JAR ajustado para modo 644 para leitura pelo usuário do container.
- Compose validado e perfil `api` iniciado. PostgreSQL healthy; API acessível somente em `127.0.0.1:8080` pelo host. Health local respondeu `UP`; logs confirmaram inicialização completa.
- Verificação pública: `/api/projects` respondeu 200 com lista vazia; `/api/admin/projects` sem sessão respondeu 401. OAuth redirecionou ao GitHub com callback correto, state e PKCE S256; cookie de sessão Secure, HttpOnly e SameSite=Lax.
- Após autorização do João, navegador retornou a `/en/admin/`; a página está em 404 porque o build atual do front-end ainda não foi publicado. Sessão validada diretamente no mesmo navegador por `/api/admin/session`: identidade `jg-abreu`, GitHub ID `265870608`. Login completo confirmado; logout ainda não testado neste ambiente.
- Próximo passo: publicar o build atual da feat/v2 somente no diretório da V2 e testar interface/admin/logout. Depois conectar publicação automática e validar backup externo/restauração. Não alterar main, VM antiga ou IP de produção.

## Continuidade — DNS, HTTPS e nginx da V2

- JAR transferido por João com SCP e SHA-256 confirmado na captura do terminal: `8a6eacba96b2a7447e26e7a1d399aa07723b91c5b8314f34b5bf66bd143603b8`. Relatórios recuperados em 11/11 confirmam 31 testes sem falhas. A chave SSH local exige senha; usar o terminal do Lightsail enquanto não houver agente desbloqueado.
- DNS Cloudflare criado: registro A `v2` para `18.118.163.208`, proxy ativado. Registros do domínio principal preservados.
- Certificado Origin CA existente na nova VM cobre `*.joaoabreu.dev` e `joaoabreu.dev`; não foi preciso emitir outro.
- Erro 522 diagnosticado: nginx escutava 443, UFW inativo, mas Lightsail só liberava 80 e 22. Após confirmação explícita do João, adicionada regra TCP 443 restrita às 15 faixas IPv4 oficiais de https://www.cloudflare.com/ips-v4. Regras de HTTP e SSH mantidas. HTTPS público voltou a responder.
- Novo nginx `deploy/nginx/portfolio-v2.conf`, commit `9bb0b7a` na feat/v2, instalado como `/etc/nginx/sites-available/portfolio-v2` e habilitado por symlink. `nginx -t` aprovado e reload concluído; serviço ativo.
- Host `v2.joaoabreu.dev` usa `/var/www/portfolio-v2`, inicialmente preenchido com cópia dos arquivos estáticos do snapshot. Ainda não foi publicado o build atual da feat/v2.
- Proxy de `/api/`, `/oauth2/`, `/login/oauth2/` e `/admin` exato para `127.0.0.1:8080`, com sobrescrita dos headers encaminhados e cache desativado. `/admin/` continua sendo a entrada estática do front-end.
- Testes públicos em 11/11: V2 `/en/` 200 com `X-Robots-Tag: noindex, nofollow` e `X-Frame-Options: SAMEORIGIN`; produção original `/en/` 200 com configuração anterior. `/api/auth/csrf` na V2 retorna 502 enquanto a API permanece parada.
- Próximo passo: criar/configurar OAuth separado para V2, colocar credenciais diretamente no `.env` da VM sem expor no chat, iniciar API e validar migrações/health/login/logout. Depois publicar build atual do front-end, conectar publicação automática e validar backup/restauração antes do corte definitivo.

## Continuidade — banco preparado em 11/11

- VM validada pelo terminal do Lightsail: 1,9 GiB de RAM total, 1,5 GiB disponíveis e 55 GB livres naquele momento; nginx ativo, `nginx -t` aprovado, HTTP local com redirecionamento 301 para HTTPS e nenhum serviço em falha.
- SSH pelo PowerShell ainda apresenta resets e não concluiu a autenticação. O navegador da AWS funciona; não presumir causa confirmada para a falha local.
- João instalou Docker e Compose; `hello-world` aprovado e Compose 5.7.1 na VM.
- Diretório `/opt/portfolio-api`, dono `ubuntu:ubuntu`, modo 750, criado com autorização explícita para sudo.
- API `feat/v2`: commit `625c17f29383ce4afb9591b3d97f0e63d9080ecf` enviado. Inclui `compose.production.yaml`, `.env.production.example`, `PRODUCTION.md` e exclusão de ambientes reais no Git. Validação local do Compose com senha fictícia aprovada nos perfis padrão e api.
- Compose dessa versão transferido via HTTPS para `/opt/portfolio-api/compose.production.yaml`; validação remota `config --quiet` aprovada.
- `/opt/portfolio-api/.env` criado na VM com modo 600, contendo uma senha aleatória do PostgreSQL gerada ali, sem exibição. Preservar esse arquivo; nenhuma credencial real foi salva no Git ou nas notas. OAuth ainda não preenchido.
- `sudo docker compose -f compose.production.yaml up -d postgres` executado; `ps` confirmou `portfolio-production-postgres-1` healthy, porta apenas interna `5432/tcp`, volume `portfolio-production_postgres-data`.
- A API ainda não foi iniciada. Faltam JAR testado e transferido, OAuth do ambiente, DNS/TLS/nginx da V2 e backup externo com restauração validada. O volume local não substitui backup.
- Próximo passo: preparar o artefato Java fora da VM e definir o OAuth de `v2.joaoabreu.dev`. A máquina antiga e o IP de produção seguem intactos.

## Encerramento do dia

João encerrou a sessão após a criação e verificação da VM.

- [x] Concluir o snapshot da instância original.
- [x] Criar a instância de 2 GB e confirmar os dois checks da AWS.
- [x] Salvar e enviar o registro para `feat/v2`.
- [ ] Validar os serviços restaurados e preparar API, banco e backups na nova VM.
- [ ] Validar a V2 antes de migrar o IP de produção.
- [ ] Implementar a aba Recomendações e seu controle no admin.

Onde estamos: a nova VM está pronta para configuração; a antiga continua atendendo o site. Retomar pela validação da nova VM.

Log de 2026-11-11: criada `portfolio-v2-2gb` a partir do snapshot, com ambos os checks aprovados; definida a aba Recomendações, ainda sem implementação.

## Infraestrutura

- João autorizou o controle do PC para criar a VM a partir do snapshot e verificar a inicialização.
- Snapshot concluído: `portfolio-before-2gb-2026-11-11`, origem `portfolio`.
- Instância criada no Lightsail: `portfolio-v2-2gb`, Ubuntu, Ohio / us-east-2a, General purpose, Dual-stack.
- Plano selecionado: 2 GB RAM, 2 vCPUs, SSD de 60 GB, transferência de 3 TB, US$ 12/mês.
- IPv4 público atual da nova VM: `18.118.163.208` (não estático).
- Estado verificado no console: Running; System status check Passed; Instance status check Passed.
- Mantida a chave SSH existente `oracle_portfolio`; snapshots automáticos desativados.
- A instância antiga `portfolio` e o IP estático `portfolio-ip` continuam em produção. DNS e IP não foram migrados.
- API, banco e funcionamento do site na nova VM ainda precisam de validação. Os checks aprovados são de infraestrutura.
- Plano Free e US$ 100 de créditos foram verificados anteriormente na conta; o crédito inclui Lightsail. As duas VMs e o snapshot consomem créditos enquanto existirem. Reconsultar saldo e validade antes de continuar.

## Próxima etapa

1. Conferir na nova VM os serviços restaurados, atualizações de segurança, regras de rede e acesso SSH. O console exibe avisos genéricos de atualização de segurança; a aplicabilidade ainda não foi investigada.
2. Preparar e validar API Spring Boot, PostgreSQL, nginx, backups externos e publicação da V2. Builds e testes devem rodar no GitHub Actions, mantendo a VM para execução.
3. Após validar o ambiente novo e obter autorização para o corte, mover o IP estático. A retirada da instância antiga exige decisão explícita de João.

As regras atuais permitem à IA implementar e testar o back-end com revisão do João; infraestrutura segue orientação manual, salvo autorização explícita no escopo da sessão. A criação desta VM teve autorização específica pela interface. Seguir as instruções vigentes na retomada.

## Recomendações

- Decidida uma aba Recomendações: livros, cursos, vídeos, setup e ferramentas.
- Cadastro e edição pelo admin; dados no banco via API; o build gera a página estática pública em EN/PT, sem consulta ao banco por visita.
- Imagens fora do banco, guardando somente o caminho. Categorias vazias ficam ocultas. Evitar players de vídeo carregados automaticamente.
- Nenhum arquivo de implementação foi alterado: o trabalho foi adiado para preservar o limite da sessão.
- Referência consultada: https://www.augustogalego.com/books (capa, título, autor, opinião curta e link).

## Git e contexto

- Front-end em `feat/v2`, atualizado com `git pull --ff-only` antes desta atividade. V2 permanece fora de `main`.
- Última implementação anterior: front-end `52d1d0c`; API `7a39873`. Publicações de projetos têm cópias separadas dos rascunhos e integração com build; disparo automático do deploy continua pendente.
- Usar somente o Drive: caminho ativo confirmado em 11/11 na retomada, `H:\My Drive\Second Brain`. Instruções globais e locais corrigidas; Status, Log e Transição atualizados no Drive. O caminho antigo em C: estava desatualizado.
