# Contact form

The contact form remains disabled by default. A future approved build can enable it with `PUBLIC_CONTACT_ENABLED=true`; enabling a build flag is separate from deploying the site.

When enabled, the browser obtains the same-origin CSRF token and posts JSON to `/api/contact` with credentials, `X-CSRF-TOKEN` and a UUID `Idempotency-Key`. Fields are name, email, message and an empty website trap. The server independently validates them. The retry key stays the same while retrying unchanged text, including after a network timeout; changing the text creates a new key.

A 202 response with `status: accepted` confirms persistence in the inbox, not email delivery. Only then is the form cleared. Errors preserve the text, disable duplicate submissions while busy and provide EN/PT feedback for invalid requests, rate limiting and unavailable service. Visitor text is never saved in localStorage.

The API has separate, disabled-by-default flags for contact submission, SMTP delivery and 90-day retention. Before enabling public contact, enable and verify retention, validate the trusted proxy/client address configuration, configure SMTP privately and test real delivery. See `portfolio-api/docs/contact-delivery.md` and `portfolio-api/docs/contact-smtp.md` in the sibling API repository.

Automated client tests simulate HTTP responses; backend integration tests use PostgreSQL Testcontainers and simulated SMTP. No V2 release or server modification is included in this implementation.

## Integrated local check — 2026-11-13

The enabled PT contact form was exercised in Chrome against a separate PostgreSQL database, `portfolio_e2e_20261113_0110`, with six Flyway migrations. The existing development database was preserved. One explicitly synthetic message was accepted, the form reset after acknowledgement, and the database contained one pending row with zero delivery attempts.

The real GitHub admin session displayed the message in the EN and PT inbox. Opening it, marking it read, archiving it and restoring it worked; the inbox version reached 3 while delivery stayed pending with zero attempts. The real delivery worker was then invoked once explicitly against only that isolated row, using the private local SMTP configuration. It recorded sent, one attempt and a non-null sent timestamp. The scheduled trigger was deliberately not enabled during this check.

Gmail dev confirmed the matching `Portfolio contact #1` notification in INBOX/SENT; João confirmed receipt in his personal account too. Logout removed the private content and a browser reload still showed the login screen. An independent anonymous HTTP request to the admin inbox returned 401.

After the check, the development server was restarted with PUBLIC_CONTACT_ENABLED=false, and the API was restarted on loopback with submission, delivery and retention disabled. The isolated database and synthetic row remain for review. Neither the SMTP password file nor normal repository defaults were changed to enable delivery.

Phone-width layout, EN contact-form submission, the real browser unavailable-service experience and the autonomous scheduler still need their own release checks. The automated suites previously passed 84 backend tests and 34 frontend tests; they were not rerun for this documentation-only result.
