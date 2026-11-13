# Admin validation

Run `npm test` for the browser-script regression checks and `npm run build` for type checking and the static EN/PT output.

`scripts/admin-session.test.ts` executes the actual admin script with controlled HTTP responses and a minimal document harness. It checks that logout clears private form values, closes dialogs and removes the username; an expired session clears the workspace; and responses started before logout cannot render afterward. It does not replace a real browser or PostgreSQL integration test.

With Docker Desktop and the local API running on port 8080, start the Astro development server and review `/en/admin/` and `/pt/admin/`:

1. Sign in through GitHub and confirm only the allowed account can enter.
2. Create a disposable bilingual project, edit it, archive it and restore it.
3. Open the same draft in two tabs and confirm an outdated save reports a conflict.
4. Prepare a publication, edit the draft and confirm the selected public copy stays unchanged.
5. Sign out, confirm the editor and project list are cleared, and confirm private API requests return 401.
6. Repeat at phone width and in both themes.

Use only the local database for disposable projects. These checks do not require deployment, changes to `main`, or changes to the V2 server.

The Inbox view lists private contact messages in pages of 20. It opens message details as plain text and offers read/unread, archive and restore actions. Its API uses independently versioned read/archive state, so inbox actions do not change email delivery. Contact submission and SMTP delivery are not enabled by this view.

Inbox regression tests additionally check plain text rendering, clearing visitor data on logout or session expiry, rejecting late responses and using updated versions for successive mutations. The 2026-11-13 integrated local check covered the real EN/PT inbox, opening a synthetic message, marking read, archiving, restoring and logout followed by reload; see contact.md. A later 360 CSS-pixel emulation check covered EN/PT lists and details in light/dark appearances, followed by logout and restoration of the desktop view.

## Concurrent changes and expiry — 2026-11-13

Two real browser tabs opened synthetic row 2. A successful read-state change in one tab made the other version stale. The first attempt exposed a server bug: Tomcat's internal ERROR dispatch was denied by security, turning the expected 409 into 403 and causing the browser to clear its workspace. MockMvc-only checks had not exercised that dispatch.

The API now permits only the internal ERROR dispatcher before applying its normal route rules. ContactHttpErrorTests reproduces the complete embedded-Tomcat HTTP path with a test-only session fixture and disposable PostgreSQL. The stale update returns 409, missing records return 404, invalid CSRF and direct /error remain forbidden, and anonymous access to private records still returns 401. The fixture is under src/test and is not packaged into the application.

After rebuilding, the two-tab test showed the correct conflict message in EN/PT without returning to login. Reopening the message loaded its current version and allowed a subsequent read-state change. The synthetic row remained unarchived; email delivery was not enabled.

For real idle expiry, only the local API process used a one-minute timeout. Both inbox tabs were placed in the background on a public page. Returning after inactivity caused the session check to show login and remove the synthetic message body and sender email from the accessibility tree. A later reload was interrupted by the computer-control URL policy, so that extra reload is not claimed as verified. The normal 30-minute process setting was restored afterward.

Validation: all 86 API tests and 35 frontend tests passed. Contact intake, SMTP and retention remained disabled; no deployment occurred. Cross-tab project-draft saves and a disconnected-network browser check remain separate release checks.
