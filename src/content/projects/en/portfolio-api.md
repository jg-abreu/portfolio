---
title: Portfolio API
tagline: The Spring Boot back end of this site, for the visit counter and the contact form.
problem: This site is static, so counting visits and receiving messages from the contact form need a server of my own, without handing visitors' data to a third-party service.
decisions:
  - The PostgreSQL schema is versioned with Flyway, and the rules live in the database too, with CHECK constraints on lengths, statuses and the single-row counter.
  - Visitors are stored only as a 32-byte hash of the IP address, never the address itself.
  - Contact messages are saved before being sent, as an outbox with status, attempts and the next attempt time, so a failed e-mail can be retried instead of lost.
  - Tests run against a real PostgreSQL started by Testcontainers, not an in-memory database.
result: In development. The database schema and the test setup are done; the visit counter, the contact form endpoint and the deploy to api.joaoabreu.dev come next.
---
