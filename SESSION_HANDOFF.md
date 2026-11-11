# Retomada — 2026-11-11

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
