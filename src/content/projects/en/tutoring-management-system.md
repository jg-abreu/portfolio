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
coverAlt: A Calculus I session with capacity 2, two students confirmed and a third on the waitlist at position 1.
---

## The problem

Study groups and tutoring programs at universities usually run on spreadsheets and group chats. There is no real control over who is allowed to tutor a subject, how many students fit in a session, or what happens to enrolled students when a tutor drops out. This system turns that informal process into explicit rules that the code and the database enforce.

## What it does

- **Approval workflows.** Anyone can suggest a subject or ask to tutor one; an admin approves or rejects each request.
- **Capacity and waitlist.** Sessions have a fixed number of spots; once full, students join an optional waitlist with a queue position.
- **Automatic promotion.** When a confirmed student cancels, the first waitlisted student is promoted, the queue is renumbered without gaps and the promoted student is notified.
- **Revocation cascade.** Revoking a tutor's bond cancels all of their future sessions.
- **Context-based permissions.** There is no fixed "tutor" role: what a user can do depends on their relationship to the record. For example, only the admin who approved a bond can cancel its sessions.
- **Predictable errors.** Domain exceptions map to `400`, `403`, `404` and `409`; unexpected errors return a generic `500` without leaking internals.

## Domain model

Every status change goes through a service method that checks the current state first, so an invalid transition returns `409 Conflict` instead of corrupting data.

```text
Tutoring bond   requested ──► PENDING ──admin approves──► APPROVED ──admin revokes──► REVOKED
                                 └────admin rejects───► REJECTED       (cancels future sessions)

Enrollment      spot available ──────────────► CONFIRMED ──student cancels──► CANCELLED
                session full, waitlist on ───► WAITLISTED ─promoted─► CONFIRMED
                                               WAITLISTED ─student cancels──► CANCELLED
```

The schema (users, subjects, tutoring bonds, sessions, enrollments and notifications) was designed and documented before any Java code: UUID keys, native enums, and `CHECK` constraints such as `spots >= 1` and `end_time > start_time`.

## Design decisions

### Roles are derived, not stored

A user is a tutor *of a subject* while they hold an approved bond for it. The same person can tutor one subject and be a student in another, with no role table to keep in sync.

### Sessions belong to the bond, not the user

Because every session points to the bond that originated it, the revocation cascade is a single query on `bond_id` instead of cross-referencing users and subjects.

### Nothing is physically deleted

Cancelling, rejecting and revoking are status changes, so the history is preserved.

### The database enforces what it can

Besides keys and enums, a partial unique index blocks two live bonds for the same tutor and subject, even if two requests arrive at once.

### Business logic lives in the services

Enrollment status has no database default, because confirming or waitlisting depends on counting the spots already taken. The service decides inside a transaction.

## Waitlist promotion, in one transaction

```text
cancel(enrollment)
  mark it CANCELLED
  if it was CONFIRMED and the session has a waitlist
    promote the first WAITLISTED student to CONFIRMED
    renumber the remaining queue without gaps
    notify the promoted student
  all of it commits together, or none of it does
```

## Testing and CI

The suite has **61 tests**: unit tests for every service (JUnit 5 and Mockito, named `should…When…`) covering success paths, permission checks and invalid transitions, plus a Spring context test that validates the JPA mappings against the real schema. Each service got its tests right after it was written, not at the end.

GitHub Actions runs the back-end suite against a PostgreSQL service, and lints and builds the front end, on every push and pull request.

## Known trade-offs

- Until authentication lands, the acting user's UUID is sent in the request body; the front end has an "Acting as" switcher to choose who performs each action.
- Admin-only endpoints accept any existing user until user roles arrive.
- There are no `GET` endpoints yet.

## What's next (v2.0)

- Authentication, with the acting user taken from the token instead of the request body
- User roles, so admin-only actions are actually restricted
- `GET` endpoints for subjects, bonds, sessions and enrollments
- Response DTOs instead of serialized JPA entities
- Cancelling a session or revoking a bond also cancels its enrollments and notifies the students
- Database locking so two students can't take the last spot at the same time

## Run it

The only requirement is Docker:

```bash
git clone https://github.com/jg-abreu/tutoring-management-system.git
cd tutoring-management-system
docker compose up --build
```

Then open `http://localhost:3000`. Compose starts PostgreSQL with the schema and sample data, the API and the front end. To see the waitlist in action, act as the tutor, create a session with one spot and the waitlist on, enroll three students and cancel the first one.
