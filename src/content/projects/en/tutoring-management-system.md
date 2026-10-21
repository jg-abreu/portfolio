---
title: Tutoring Management System
tagline: Academic tutoring platform with admin approvals, sessions with limited spots and an automatic waitlist.
problem: University tutoring programs usually run on spreadsheets and group chats, with no real control over who may tutor a subject, how many students fit in a session, or what happens to enrolled students when a tutor drops out.
decisions:
  - Business rules as state machines. Every status change checks the current state first, and invalid transitions return 409 Conflict.
  - Roles are derived, not stored. A user tutors a subject only while holding an approved bond for it, so the same person can tutor one subject and study another.
  - Sessions belong to the tutoring bond, so revoking a tutor cancels all of their future sessions with a single query.
  - The PostgreSQL schema came before any Java code, with native enums, CHECK constraints and a partial unique index that blocks duplicate live bonds.
  - Waitlist promotion runs in one transaction that promotes the next student, renumbers the queue without gaps and sends a notification.
result: A Spring Boot REST API, a React front end and a PostgreSQL database that start with a single docker compose command, with unit tests in JUnit 5 and Mockito and CI on GitHub Actions.
---
