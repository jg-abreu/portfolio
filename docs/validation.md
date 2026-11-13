# V2 validation checkpoints

These are local checks, not production acceptance or approval to release. All V2 work remains on `feat/v2`.

## Publication preparation — 2026-11-13

The API's complete suite passed 131 tests with eight Flyway migrations in disposable PostgreSQL. GitHub workflow dispatch was simulated. The site passed 64 tests and built 29 pages; 15 focused session/editor/status tests passed after the status-polling adjustment. The receiving workflow and its credentials remain unconfigured. See [publication](publication.md) for the manual infrastructure handoff and the distinction between dispatch acceptance and served revision manifests.

## Lighthouse mobile checks — 2026-11-13

Lighthouse CLI 13.6.0 used its default mobile simulation in a fresh headless Chrome against a temporary server on `127.0.0.1:4323` serving the static `dist` directory. It did not use the person's signed-in Chrome profile, trigger assistant submission or exercise the backend. Contact and visits remained disabled in this normal build. Reports were stored locally under the ignored `.codex-stage` directory, not uploaded or published.

| Local route | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/pt/` | 98 | 100 | 100 | 100 |
| `/en/recommendations/` final label check | 97 | 100 | 100 | 100 |

Earlier recommendation runs scored 98–99 in performance. Performance scores vary; the final recommendation run above is the recorded result. The home run preceded the final recommendation-label ordering adjustment. These two routes exceed the ≥90 target but do not establish that every page, locale or device does so. The recommendation catalogue was empty during this check; no real cover-loaded catalogue was measured.

An additional label-content/name audit exposed the header's visible `JA` initials being omitted from its accessible name, and the compact `Picks` menu label differing from its full name. The brand now uses a bilingual label containing the visible initials. The recommendation accessible name starts with its visible compact label and retains the full section name. The final recommendation audit passed `label-content-name-mismatch` with no failing nodes. Other visual presentation was unchanged.

After these corrections, the real bilingual static-build integration test passed. Astro checking reported zero errors, warnings or hints, and the final static render produced 29 pages. These audits are not screen-reader testing, physical-device testing, authenticated admin-browser testing or production performance measurements. The simple local server lacks production caching and security-header configuration, so its cache/header suggestions must not be mistaken for verified production defects.

## Backup and timing follow-up — 2026-11-13

The API now includes `BackupRestoreTests`: a real custom-format `pg_dump` exported from one disposable PostgreSQL 18 container and restored with `pg_restore` into a second independent container. A synthetic image was backed up separately; the source image/message/counter were changed after capture. The restored data retained the captured values, bilingual recommendation record/revision, queue generations, valid identity sequence and foreign-key constraint. Flyway validated all eight restored migrations with no pending migration; the image passed the real storage integrity/decoding check.

The expanded suite exposed an intermittent delivery-test assumption about a just-created row already being due. A temporary 100-repeat probe reproduced 53 failures with zero SMTP attempts; making the fixture explicitly overdue produced 100 successful repeats. Temporary instrumentation was removed, and a separate future-schedule regression was added. Production delivery code did not change. The complete API suite then passed 133 tests, zero failures/errors/skips. API commits `a965d5c` and `310eaa5` were pushed to `feat/v2`.

The tested JAR was packaged and the verified older local review process was replaced. Review API PID 21784 started with a 30-minute session and intake, SMTP, retention, visits, publication dispatch and profile card disabled; health was UP. The isolated review database received V8, while the habitual database and VM were preserved. Anonymous publication-status access returned 401 and the public recommendation catalogue remained empty. Revalidate PID/runtime settings before future work.

This is not proof of an external production backup, remote disaster recovery or a configured backup schedule. No real contact archive, email, provider request or deployment was created. The API's `docs/backup-restore.md` records the manual external-backup acceptance checklist. Authenticated browser review of the new publication status remains pending at this checkpoint.

## Expanded public-template review — 2026-11-13

Nine additional default-mobile Lighthouse 13.6.0 runs covered the public templates on the same loopback static server. Contact and visits were disabled and no form or assistant question was submitted. The article contrast failure below was corrected, then the same article template was rechecked in both locales.

| Route/template | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/en/` | 98 | 100 | 100 | 100 |
| `/en/projects/` | 99 | 100 | 100 | 100 |
| `/pt/projects/portfolio-api/` | 99 | 100 | 100 | 100 |
| `/en/pipeline/` | 99 | 100 | 100 | 100 |
| `/pt/blog/` | 94 | 100 | 100 | 100 |
| EN article, after contrast correction | 97 | 100 | 100 | 100 |
| PT article, after contrast correction | 91 | 100 | 100 | 100 |
| `/pt/resume/` | 99 | 100 | 100 | 100 |
| `/en/contact/` | 99 | 100 | 100 | 100 |
| `/pt/recommendations/` | 99 | 100 | 100 | 100 |

The article route was `why-my-gets-worked-but-every-post-got-a-403-a-cors-bug-behind-nginx-in-docker-2io`. Before correction, its links used the button accent `#2563eb` on dark `#11141b`, measured at 3.56:1 and accessibility 96. Article links now use the existing theme-aware brand token. The assistant eyebrow used the same accent-as-text pattern and was updated too; the rest of the interface and button backgrounds are unchanged. Calculated text ratios are 7.25:1 on the dark page, 6.71:1 on the dark assistant surface and 5.17:1 on white. Final EN/PT article contrast audits passed. The closed-dialog page audits do not independently verify the opened assistant panel.

The other template measurements preceded these two text-color changes; the article reruns and final build used the corrected source. These are representative templates, not every route/language/content state. Scores are individual runs, not a statistical performance guarantee. The empty recommendation catalogue and current resume state do not certify performance with real cover lists or an uploaded PDF. Astro check/build passed with 29 pages after the CSS correction; no unrelated test suite was rerun for the two-line color change.

## Blocked providers and reduced-motion smoke — 2026-11-13

A separate home PT run used a fresh isolated headless Chrome with `--force-prefers-reduced-motion` and blocked URL patterns for `api.github.com` and `github-contributions-api.jogruber.de`. The report confirmed both contribution/practice requests failed with status -1 and zero transferred bytes. The full-page audit screenshot was inspected: headline, snapshot contribution count/heatmap, practice statistics, repository cards, technologies and footer remained rendered. No fresh GitHub values were inferred from this check.

This combined smoke scored 99/100/100/100. It is evidence for this home viewport with two providers blocked, not a fully disconnected browser, all interactive flows or every animation on all routes. Reduced-motion guards were also inspected in the bootstrap, theme, popup, card-glow and contribution scripts. Reports and extracted public-page screenshots remain in ignored local staging; none was uploaded. The flag comes from the [Chromium graphics switches](https://chromium.googlesource.com/chromium/src/+/master/ui/gfx/switches.cc).

## Remaining acceptance work

- Real assistant responses, source fidelity and exact fallback: Gemini key is absent from the inspected Windows user/process environment and existing IntelliJ run configuration. No key was created or exposed.
- Real profile-card data and final visual approval: its token is absent from the inspected user/process environment; no profile README integration was performed.
- New publication-status UI against an upgraded review API, including authenticated phone-width display. Its cleanup and late-response behavior are covered by automated tests.
- Enabled visit-footer browser review, disconnected-network behavior, cross-tab project edits and remaining interaction/reduced-motion/provider-failure checks beyond the combined home smoke above.
- Real-content/PDF/cover states, remaining accessibility review and final approval by João; representative public templates now have recorded Lighthouse results above the target.
- Local two-instance load-balancer exercise, scanning setup, persistent image storage, external backup/restore, trusted production proxy, provider quota/cost checks and authorized release. Infrastructure remains manual work by João under current project rules.

Reference: [official Lighthouse CLI](https://github.com/GoogleChrome/lighthouse/blob/main/readme.md).
