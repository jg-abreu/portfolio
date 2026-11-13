# Approximate visit counter

PUBLIC_VISITS_ENABLED=true includes the counter on public pages, including article and project pages. Admin and 404 pages do not register visits. The flag is false by default. The browser waits for page load, obtains the same-origin CSRF token, then posts an empty request to /api/visits. It sends no page path or visitor identifier and stores no visit data in localStorage.

A validated response supplies the real total. Numbers use en-US or pt-BR formatting and are labeled approximate visits, not unique people. The counter stays hidden without JavaScript or when registration fails; it never substitutes a fabricated total. The content of the site remains readable when the API is unavailable.

The server independently requires PORTFOLIO_VISITS_ENABLED=true and a private HMAC key. It counts an IP at most once every 30 minutes since its last counted access. Intermediate requests do not restart that window. IPv6 spellings are normalized before hashing. The hash and the total update in one PostgreSQL transaction, with concurrent requests covered by integration tests. Existing V2 tables are reused without changing migrations.

Before enabling this feature on the VM, follow portfolio-api/docs/visits.md: configure the actual trusted nginx/Docker peer, verify current Cloudflare network ranges and overwritten headers, preserve the HMAC key across instances/restarts and verify cleanup. Direct mode intentionally ignores forwarded headers and is suitable for direct local testing; it must not be left behind nginx or every visitor would share the proxy address. No production routing or credentials were changed here.

Tests cover the CSRF wire contract, malformed responses and transport failure. The static-build integration enables the flag and verifies that article pages include its marker while admin and 404 do not. The full site suite passed 42 tests and the build passed. The enabled numeric footer has not yet received a separate real-browser review; normal local settings remain disabled.
