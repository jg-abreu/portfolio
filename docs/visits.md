# Approximate visit counter

PUBLIC_VISITS_ENABLED=true includes the counter on public pages, including article and project pages. Admin and 404 pages do not register visits. The flag is false by default. The browser waits for page load, obtains the same-origin CSRF token, then posts an empty request to /api/visits. It sends no page path or visitor identifier and stores no visit data in localStorage.

A validated response supplies the real total. Numbers use en-US or pt-BR formatting and are labeled approximate visits, not unique people. The counter stays hidden without JavaScript or when registration fails; it never substitutes a fabricated total. The content of the site remains readable when the API is unavailable.

The server independently requires PORTFOLIO_VISITS_ENABLED=true and a private HMAC key. It counts an IP at most once every 30 minutes since its last counted access. Intermediate requests do not restart that window. IPv6 spellings are normalized before hashing. The hash and the total update in one PostgreSQL transaction, with concurrent requests covered by integration tests. Existing V2 tables are reused without changing migrations.

Before enabling this feature on the VM, follow portfolio-api/docs/visits.md: configure the actual trusted nginx/Docker peer, verify current Cloudflare network ranges and overwritten headers, preserve the HMAC key across instances/restarts and verify cleanup. Direct mode intentionally ignores forwarded headers and is suitable for direct local testing; it must not be left behind nginx or every visitor would share the proxy address. No production routing or credentials were changed here.

Tests cover the CSRF wire contract, malformed responses and transport failure. The static-build integration enables the flag and verifies that article pages include its marker while admin and 404 do not. The full site suite passed 42 tests and the build passed. The enabled numeric footer has not yet received a separate real-browser review; normal local settings remain disabled.

## Isolated browser integration — 2026-11-13

A separate local API on 8081 and Astro on 4324 used the disposable review database `portfolio_visits_review_20261113`, DIRECT mode and a temporary in-memory HMAC key. Contact intake/mail/retention, publication dispatch and the profile card remained disabled. No real OAuth or provider credentials were supplied to this API.

Native Chrome on PT registered a first visit and exposed “Visitas aproximadas: 1” in its accessibility tree. Reload kept both the database singleton total and the number of deduplication rows at 1. After stopping only the isolated API and reloading, the counter was absent from the accessibility tree while the main content and footer remained present. This exercises the real browser/CSRF/API/PostgreSQL path and failure handling, not a mock transport.

The captured screenshots did not visibly show the numeric line, so exact placement, phone-width appearance and EN number formatting remain unverified; the semantic tree is not a substitute for visual approval. Early temporary-root content-loader errors were resolved by copying the current source/public assets into the isolated root and restarting it before the final reload checks. No tracked product change was needed. Both temporary processes were stopped, the habitual API remained UP and the browser returned to the logged-out local admin. The synthetic database was retained, with no production data or configuration touched.
