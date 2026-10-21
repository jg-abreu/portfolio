---
title: ScreenSound
tagline: Catálogo de músicas em linha de comando que guarda artistas e músicas no PostgreSQL e busca a biografia dos artistas na Wikipedia.
problem: Manter um catálogo de artistas e suas músicas que possa ser pesquisado por artista e enriquecido com a biografia de cada um.
decisions:
  - Artista e Música são entidades JPA com um relacionamento um-para-muitos bidirecional, e salvar um artista salva as músicas dele em cascata.
  - Uma consulta JPQL própria com LOWER(...) LIKE faz a busca por artista com parte do nome, sem diferenciar maiúsculas.
  - As biografias vêm da API REST da Wikipedia em tempo real, pelo HttpClient nativo do Java.
result: Uma aplicação com menu no terminal e banco PostgreSQL, feita para um desafio da Alura sobre Java e Spring Data JPA. A implementação é minha.
---
