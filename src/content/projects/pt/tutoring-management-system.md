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
---
