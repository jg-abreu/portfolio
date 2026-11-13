# Contact form

The contact form remains disabled by default. A future approved build can enable it with `PUBLIC_CONTACT_ENABLED=true`; enabling a build flag is separate from deploying the site.

When enabled, the browser obtains the same-origin CSRF token and posts JSON to `/api/contact` with credentials, `X-CSRF-TOKEN` and a UUID `Idempotency-Key`. Fields are name, email, message and an empty website trap. The server independently validates them. The retry key stays the same while retrying unchanged text, including after a network timeout; changing the text creates a new key.

A 202 response with `status: accepted` confirms persistence in the inbox, not email delivery. Only then is the form cleared. Errors preserve the text, disable duplicate submissions while busy and provide EN/PT feedback for invalid requests, rate limiting and unavailable service. Visitor text is never saved in localStorage.

The API has separate, disabled-by-default flags for contact submission, SMTP delivery and 90-day retention. Before enabling public contact, enable and verify retention, validate the trusted proxy/client address configuration, configure SMTP privately and test real delivery. See `portfolio-api/docs/contact-delivery.md` and `portfolio-api/docs/contact-smtp.md` in the sibling API repository.

Automated client tests simulate HTTP responses; backend integration tests use PostgreSQL Testcontainers and simulated SMTP. Real browser validation of the enabled form and inbox, real email delivery and the unavailable-service experience remain release checks. No V2 release or server modification is included in this implementation.
