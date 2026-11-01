---
title: Portfolio API
tagline: O back-end deste site em Spring Boot, para o contador de visitas e o formulário de contato.
problem: Este site é estático, então contar visitas e receber as mensagens do formulário de contato exigem um servidor próprio, sem entregar os dados de quem visita para um serviço de terceiros.
decisions:
  - O esquema PostgreSQL é versionado com Flyway, e as regras também ficam no banco, com restrições CHECK em tamanhos, status e no contador de linha única.
  - Os visitantes são guardados só como um hash de 32 bytes do IP, nunca o endereço em si.
  - As mensagens de contato são salvas antes de serem enviadas, como uma outbox com status, tentativas e horário da próxima tentativa, para que um e-mail que falhou seja reenviado em vez de perdido.
  - Os testes rodam contra um PostgreSQL de verdade, iniciado pelo Testcontainers, e não um banco em memória.
result: Em desenvolvimento. O esquema do banco e a estrutura de testes estão prontos; o contador de visitas, o endpoint do formulário de contato e o deploy em api.joaoabreu.dev vêm a seguir.
---
