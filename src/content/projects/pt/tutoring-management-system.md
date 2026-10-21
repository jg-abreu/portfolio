---
title: Sistema de Gestão de Monitorias
tagline: Plataforma de monitoria acadêmica com aprovação de admin, sessões com vagas limitadas e lista de espera automática.
problem: Programas de monitoria nas universidades costumam funcionar com planilhas e grupos de mensagem, sem controle real de quem pode ser monitor de uma disciplina, de quantos alunos cabem numa sessão ou do que acontece com os inscritos quando um monitor desiste.
decisions:
  - Regras de negócio como máquinas de estado. Toda mudança de status confere o estado atual antes, e transições inválidas retornam 409 Conflict.
  - Papéis são derivados, não armazenados. Um usuário só é monitor de uma disciplina enquanto tiver um vínculo aprovado nela, então a mesma pessoa pode ser monitora numa disciplina e aluna em outra.
  - As sessões pertencem ao vínculo de monitoria, então revogar um monitor cancela todas as sessões futuras dele com uma única consulta.
  - O esquema PostgreSQL veio antes de qualquer código Java, com enums nativos, restrições CHECK e um índice único parcial que impede vínculos ativos duplicados.
  - A promoção da lista de espera acontece numa única transação, que promove o próximo aluno, renumera a fila sem buracos e envia uma notificação.
result: Uma API REST em Spring Boot, um front-end em React e um banco PostgreSQL que sobem com um único docker compose, com testes unitários em JUnit 5 e Mockito e CI no GitHub Actions.
coverAlt: Uma sessão de Cálculo I com capacidade 2, dois alunos confirmados e um terceiro na lista de espera, na posição 1.
---

## O problema

Grupos de estudo e programas de monitoria nas universidades costumam funcionar com planilhas e grupos de mensagem. Não há controle real de quem pode ser monitor de uma disciplina, de quantos alunos cabem numa sessão ou do que acontece com os inscritos quando um monitor desiste. Este sistema transforma esse processo informal em regras explícitas, garantidas pelo código e pelo banco de dados.

## O que ele faz

- **Fluxos de aprovação.** Qualquer pessoa pode sugerir uma disciplina ou pedir para ser monitor de uma; um admin aprova ou rejeita cada pedido.
- **Vagas e lista de espera.** As sessões têm um número fixo de vagas; quando lotam, os alunos entram numa lista de espera opcional, com posição na fila.
- **Promoção automática.** Quando um aluno confirmado cancela, o primeiro da lista de espera é promovido, a fila é renumerada sem buracos e o aluno promovido é notificado.
- **Revogação em cascata.** Revogar o vínculo de um monitor cancela todas as sessões futuras dele.
- **Permissões por contexto.** Não existe um papel fixo de "monitor": o que cada usuário pode fazer depende da relação dele com o registro. Por exemplo, só o admin que aprovou um vínculo pode cancelar as sessões dele.
- **Erros previsíveis.** As exceções de domínio viram `400`, `403`, `404` e `409`; erros inesperados retornam um `500` genérico, sem expor detalhes internos.

## Modelo de domínio

Toda mudança de status passa por um método de serviço que confere o estado atual antes, então uma transição inválida retorna `409 Conflict` em vez de corromper os dados.

```text
Vínculo de monitoria   pedido ──► PENDING ──admin aprova──► APPROVED ──admin revoga──► REVOKED
                                     └────admin rejeita───► REJECTED   (cancela as sessões futuras)

Inscrição              vaga disponível ─────────────────► CONFIRMED ──aluno cancela──► CANCELLED
                       sessão cheia, lista de espera ───► WAITLISTED ─promovido─► CONFIRMED
                                                          WAITLISTED ─aluno cancela──► CANCELLED
```

O esquema (usuários, disciplinas, vínculos de monitoria, sessões, inscrições e notificações) foi desenhado e documentado antes de qualquer código Java: chaves UUID, enums nativos e restrições `CHECK` como `spots >= 1` e `end_time > start_time`.

## Decisões de projeto

### Papéis são derivados, não armazenados

Um usuário é monitor *de uma disciplina* enquanto tiver um vínculo aprovado nela. A mesma pessoa pode ser monitora numa disciplina e aluna em outra, sem uma tabela de papéis para manter sincronizada.

### As sessões pertencem ao vínculo, não ao usuário

Como cada sessão aponta para o vínculo que a originou, a revogação em cascata é uma única consulta por `bond_id`, em vez de cruzar usuários e disciplinas.

### Nada é apagado fisicamente

Cancelar, rejeitar e revogar são mudanças de status, então o histórico fica preservado.

### O banco garante o que puder

Além das chaves e dos enums, um índice único parcial impede dois vínculos ativos para o mesmo monitor e a mesma disciplina, mesmo que dois pedidos cheguem ao mesmo tempo.

### A lógica de negócio fica nos serviços

O status da inscrição não tem valor padrão no banco, porque confirmar ou mandar para a lista de espera depende de contar as vagas já ocupadas. Quem decide é o serviço, dentro de uma transação.

## Promoção da lista de espera, numa única transação

```text
cancelar(inscrição)
  marca como CANCELLED
  se ela estava CONFIRMED e a sessão tem lista de espera
    promove o primeiro aluno WAITLISTED para CONFIRMED
    renumera o resto da fila sem buracos
    notifica o aluno promovido
  tudo é gravado junto, ou nada é
```

## Testes e CI

A suíte tem **61 testes**: testes unitários de todos os serviços (JUnit 5 e Mockito, com nomes `should…When…`) cobrindo os caminhos de sucesso, as checagens de permissão e as transições inválidas, mais um teste de contexto do Spring que valida os mapeamentos JPA contra o esquema real. Cada serviço ganhou os testes logo depois de ser escrito, e não no final.

O GitHub Actions roda a suíte do back-end contra um serviço PostgreSQL, e faz o lint e o build do front-end, a cada push e pull request.

## Trade-offs conhecidos

- Até a autenticação chegar, o UUID do usuário que está agindo vai no corpo da requisição; o front-end tem um seletor "Acting as" para escolher quem faz cada ação.
- Os endpoints de admin aceitam qualquer usuário existente até os papéis de usuário chegarem.
- Ainda não há endpoints `GET`.

## Próximos passos (v2.0)

- Autenticação, com o usuário vindo do token em vez do corpo da requisição
- Papéis de usuário, para que as ações de admin sejam de fato restritas
- Endpoints `GET` para disciplinas, vínculos, sessões e inscrições
- DTOs de resposta em vez de entidades JPA serializadas
- Cancelar uma sessão ou revogar um vínculo também cancela as inscrições e notifica os alunos
- Travamento no banco para que dois alunos não peguem a última vaga ao mesmo tempo

## Como rodar

O único requisito é o Docker:

```bash
git clone https://github.com/jg-abreu/tutoring-management-system.git
cd tutoring-management-system
docker compose up --build
```

Depois abra `http://localhost:3000`. O Compose sobe o PostgreSQL com o esquema e dados de exemplo, a API e o front-end. Para ver a lista de espera funcionando, aja como o monitor, crie uma sessão com uma vaga e lista de espera ligada, inscreva três alunos e cancele o primeiro.
