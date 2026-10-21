---
title: ScreenSound
tagline: Command-line music catalog that stores artists and songs in PostgreSQL and fetches artist biographies from Wikipedia.
problem: Keep a catalog of artists and their songs that can be searched by artist and enriched with each artist's biography.
decisions:
  - Artist and Song are JPA entities with a bidirectional one-to-many relationship, and saving an artist cascades to its songs.
  - A custom JPQL query with LOWER(...) LIKE gives partial, case-insensitive search by artist.
  - Biographies come from the Wikipedia REST API in real time, through Java's native HttpClient.
result: A menu-driven app backed by PostgreSQL, built for an Alura challenge on Java and Spring Data JPA. The implementation is my own.
---
