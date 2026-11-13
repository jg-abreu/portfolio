# Retomada — 2026-11-11

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
