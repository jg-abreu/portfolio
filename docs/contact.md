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

At this point phone layout, EN submission, browser failure feedback and the autonomous scheduler were still pending. The follow-up below records their later verification. The automated suites previously passed 84 backend tests and 34 frontend tests.

## Mobile and scheduling follow-up — 2026-11-13

Chrome device emulation at 360 CSS pixels was visually checked for the contact form and private inbox in EN/PT and light/dark appearances. Fields, feedback, message text and inbox actions stayed readable within the viewport. This was browser emulation, not a physical-phone or exhaustive accessibility audit.

With server intake disabled, submitting synthetic EN and PT forms displayed the localized failure feedback and retained all three fields. This exercised a real unavailable intake endpoint, not a disconnected network or every HTTP error. After enabling only local intake, the EN mobile form acknowledged receipt and cleared its fields. The isolated database now also contains synthetic row 2, pending with zero attempts; SMTP and retention stayed disabled throughout this follow-up. Do not enable delivery on this review database without inspecting its synthetic queue.

The EN/PT mobile inbox displayed both rows and the new message detail. Logout returned to login; device emulation and DevTools were then closed. API intake and the frontend form flag were restored to false. No additional email or deployment occurred.

The new API ContactSchedulerTests integration test passed against a disposable PostgreSQL Testcontainer. Spring scheduled the real worker with a shortened test-only polling delay; the real notifier used a mocked JavaMailSender. Without invoking the worker from the test, the row moved through sending to sent with one attempt and a timestamp. This verifies scheduling wiring with simulated transport; the earlier check separately verified real SMTP. Normal polling defaults and application code did not change.

Remaining release checks include session expiry while an inbox is open, conflicts between tabs, disconnected-network behavior and the production proxy/retention/backup configuration. These local checks do not authorize public intake or deployment.
