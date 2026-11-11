# Retomada — 2026-11-11

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

As regras atuais fornecidas por João reservam infraestrutura e back-end para implementação manual dele; esta sessão teve autorização específica para criar a VM pela interface. Seguir as instruções vigentes na retomada.

## Recomendações

- Decidida uma aba Recomendações: livros, cursos, vídeos, setup e ferramentas.
- Cadastro e edição pelo admin; dados no banco via API; o build gera a página estática pública em EN/PT, sem consulta ao banco por visita.
- Imagens fora do banco, guardando somente o caminho. Categorias vazias ficam ocultas. Evitar players de vídeo carregados automaticamente.
- Nenhum arquivo de implementação foi alterado: o trabalho foi adiado para preservar o limite da sessão.
- Referência consultada: https://www.augustogalego.com/books (capa, título, autor, opinião curta e link).

## Git e contexto

- Front-end em `feat/v2`, atualizado com `git pull --ff-only` antes desta atividade. V2 permanece fora de `main`.
- Última implementação anterior: front-end `52d1d0c`; API `7a39873`. Publicações de projetos têm cópias separadas dos rascunhos e integração com build; disparo automático do deploy continua pendente.
- Usar somente o Drive, conforme orientação anterior do João. A pasta do Drive indicada em `CLAUDE.local.md` não foi encontrada nesta sessão; este registro fica no repositório.
