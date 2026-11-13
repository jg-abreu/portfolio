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
