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

## Authenticated publication status and layout — 2026-11-13

The local GitHub login reached the authenticated admin and displayed the disabled automatic-update state. This exposed a layout regression: the status paragraph was a third direct child of the two-column workspace grid, displacing the sidebar and squeezing the project heading. The status now lives inside the main content column.

Native Chrome review confirmed the corrected English desktop layout and 360 × 653 CSS-pixel mobile layout in English/Portuguese, with light/dark states inspected. The disabled status remained readable without visible horizontal overflow in the inspected viewport. Logout returned to the Portuguese login screen; DevTools was closed and the light theme restored. No draft, publication selection, email or workflow dispatch was created. Other queue states remain covered by automated tests rather than this browser review. The build passed with 29 pages and zero Astro diagnostics; existing CSP/Shiki build warnings remain.

## Project-editor browser failure states — 2026-11-13

Two isolated headless Chrome tabs loaded the actual local Astro admin in each locale at 360 × 653 and reduced motion. HTTP interception supplied a synthetic session, draft, CSRF token and shared versioned store; all external requests were blocked and no real admin mutations or OAuth credentials were used. Tab A saved version 0 once. Tab B submitted its stale version, received 409 and kept its unsaved text and open editor without returning to login. Aborting its next API request produced the localized transport-error message while preserving input. A subsequent synthetic 401 closed the editor, reset its fields, removed the private project list/username and displayed login.

Each locale completed one accepted write and one rejected stale write in the synthetic store. Keyboard traversal started at the slug input, exercised 30 Tab iterations and did not focus background document controls. Chrome's native cycle briefly exposed the document body while entering browser chrome; the next Tab returned to the modal. EN/PT network-error screenshots were inspected: feedback and save/cancel controls remained readable at phone width. A first harness attempt stalled on a background tab; explicit tab activation and bounded polling resolved the harness issue without product changes.

This verifies actual frontend behavior against controlled responses, not the real backend's optimistic-lock transaction, authenticated cross-tab OAuth behavior, a fully disconnected browser, a physical phone or assistive technology. Existing real HTTP/session and backend tests remain separate evidence. Reports/screenshots are ignored local artifacts. No mail, provider call, publication selection, workflow dispatch or deploy occurred.

## Built public routes with integrations blocked — 2026-11-13

All 22 public EN/PT routes in the current static build were loaded from a loopback HTTP server in isolated headless Chrome at 360 × 653, device scale 1 and reduced motion. This includes both homes, project lists/case studies, blog lists/articles, Pipeline, contact, recommendations and resume pages. Requests outside the local origin and all `/api/` calls were aborted. Every route returned 200 with its heading, nonempty main content and footer; document/client widths were 360 with no horizontal overflow, and no uncaught page exceptions were recorded. Blocking external image resources intentionally does not guarantee that unavailable external images remain visible.

After each page loaded, Chrome's network emulation was switched offline and its heading/main text remained unchanged. On both homes, the assistant was opened, received a synthetic question and showed failure without an answer while preserving the input. Escape closed its native dialog and restored focus to the launcher. No request reached a real provider. This verifies resident page content and the assistant's network-failure interaction, not opening/reloading new pages offline, service-worker support, every click flow, PDF rendering/content approval or the still-empty recommendation catalogue with real covers. The ignored report is `.codex-stage/public-fallback-audit.json`. A harness assertion was corrected to await the actual `aria-busy="false"` state; no product code changed for this exercise.

## Remaining acceptance work

Use the ordered [V2 release checklist](v2-release-checklist.md) for ownership and completion gates. This list records the outstanding scope, not authorization to deploy.

- Deployment quota and broader live-provider acceptance: the key is configured privately. Earlier real PT/EN service/HTTP checks and the native-browser PT questions below passed for technologies and missing-salary fallback. This is a sample, not a general factual-accuracy guarantee; details are in portfolio-api/docs/assistant.md.
- Dedicated profile-card deployment credential and live refresh checks: João approved the modular visual composition on 2026-11-14. A real public GraphQL query/parse/render passed earlier using existing CLI authentication in a one-shot local process. No permanent token or profile README integration was created.
- Publication-status queue/dispatch states against a connected receiver; the disabled state has now been reviewed in the authenticated local browser. Cleanup and late-response behavior are covered by automated tests.
- Final preview approval by João, including the intended resume content. The initial recommendation catalogue will be empty by his explicit 2026-11-14 decision; future real covers require their own performance/accessibility review. Existing empty-catalogue scores are not loaded-media scores.
- Physical-device and assistive-technology testing are not claimed. The recorded browser acceptance is representative; live provider/quota and production behavior still require release checks.
- Production capacity/proxy review beyond the completed local two-instance burst, ongoing security monitoring/release-trigger review (Maven/CodeQL evidence is in dependency-security.md), persistent image storage, external backup/restore, provider quota/cost checks and authorized release. Infrastructure remains manual work by João. The local exercise used two actual JVMs, an owned PostgreSQL container and a Python affinity proxy; 96 posts/8 workers preserved shared deduplication. Old session-bound CSRF failed across nodes/failover; reacquisition recovered without recounting. Scope/measurements are in portfolio-api/docs/local-two-instance.md.

Reference: [official Lighthouse CLI](https://github.com/GoogleChrome/lighthouse/blob/main/readme.md).

## Final local acceptance — 2026-11-14

The actual built assistant UI passed 48 controlled cases: EN/PT × light/dark × answered, insufficient knowledge, eight contract error codes, transport failure and a malformed locale-mismatched response. Tests used isolated Chrome at 360 × 653/reduced motion and intercepted HTTP; no Gemini call or contact data was involved. Each response preserved input, released read-only/busy state and kept the page within viewport width. The one-second Retry-After disabled resubmission and recovered. HTML-like answer text remained text, and a script URL produced no clickable source. Escape restored launcher focus. EN-light/PT-dark failure screenshots were inspected. These are controlled UI states, not induced failures of the live Gemini provider. Earlier six-request real-provider evidence remains separate.

The existing resume PDFs were rendered and inspected at 1.5× using temporary, locally installed PyMuPDF 1.28.2 and pypdf 7.1.0; site dependencies were not modified. Each is one A4 page, unencrypted, tagged, has seven links and extractable text (EN 2586 characters/PT 2677), with no text blocks outside the page or visible overlap/clipping. A structure tree is not proof of PDF/UA conformance or correct screen-reader order. Their content was preserved, not newly fact-checked. The actual static resume pages loaded each locale's deferred iframe and download URL; HTTP returned `application/pdf` and bytes identical to the reviewed files. Both pages measured 360-pixel document/scroll width. This does not validate production framing headers or every browser's embedded PDF viewer.

Frontend tests passed 64/64. API tests passed 133/133 with disposable PostgreSQL, including the restore exercise. Maven's initial verify failed only during repackage because the habitual Windows Java process held the JAR open. A first stop guard rejected slash differences and stopped nothing; the confirmed executable/JAR path was then normalized, PID 26364 was stopped, and `verify -DskipTests` successfully packaged without repeating the already-passing tests. Local review was restarted as PID 28896 with the prior flags (Gemini enabled; contact intake/mail/retention, visits, dispatch and card disabled). Revalidate PIDs on resume. Optional Maven feed metadata returned 401 warnings; these did not prevent the successful package. No tracked application code changed in this final acceptance stage.

Ignored evidence: `.codex-stage/assistant-browser-states.json`, `assistant-final-*.png`, `pdf-review/report.json`, `pdf-review/*-1.png` and `resume-page-audit.json`. Recommendation content is explicitly deferred by João, not fabricated from test fixtures. The existing 29-page build and recorded Lighthouse template results remain applicable to unchanged source; they are not a new measurement or production certificate.

## Native user-browser acceptance — 2026-11-14

The user's existing Chrome was controlled through Windows accessibility and screenshots, not an isolated browser or mocked API. Earlier attempts were stopped by URL-confidence enforcement; no further work was performed in those stopped turns. In the resumed successful run, the real PT project case loaded after the language switch. The earlier EN home/project review also established language switching, dark-theme persistence after reload/navigation, repository popup folder browsing and Escape closing. Focus assertions from the accessibility metadata are not claimed because that field repeatedly reported the address bar despite visible page focus.

On the actual PT project page, two public questions were submitted through the real assistant UI: technologies returned an answer with the Technical knowledge source and knowledge version 2026-11-12.1; exact salary returned the approved missing-information text without inventing a value. Input and submit controls became editable again, and Escape closed the dialog. These were two UI submissions; internal provider-attempt counts were not instrumented. No contact message or secret was supplied.

The PT blog list and complete waitlist article loaded, including its text/code structure. Recommendations displayed the approved empty state. Pipeline displayed local-build metadata; its conceptual handoff text also calls the current SHA a commit on main, which is potentially misleading for a local feat/v2 preview. This is recorded as a copy-clarity follow-up, not a production/deploy defect or a fixed issue. Contact showed the configured disabled submit button. The PT resume route exposed the locale-specific iframe/open/download links; downloading produced joao-abreu-cv-pt.pdf (46865 bytes), with the same SHA-256 as the source. This run did not independently confirm every external link, embedded PDF viewer rendering or the EN native-browser download.

GitHub entry returned to the authenticated local EN admin without password/consent interaction. The private draft `teste-manual-v2-20261114` was created with EN title `Synthetic manual V2 review`, PT title `Teste manual V2 — não publicar`, the public portfolio repository URL and Java/Spring Boot. Reload/reopening recovered both languages and shared fields. An unsaved technology change triggered confirmation; Keep editing preserved it, and Discard changes restored the saved state. Archive and restore changed the list counts as expected.

The admin tab was duplicated using Chrome's tab menu. Both editors loaded the same draft version; tab A saved `Java, Spring Boot, saved-in-tab-a`, then tab B's stale save displayed the conflict message while keeping `PRIVATE-UNSAVED-TAB-B` in the open editor. Reopening fetched tab A's actual saved value. The rejected edit was discarded and the test draft ended archived (Drafts 0 / Archived 1 in the isolated review workspace). No public-copy selection, withdrawal or dispatch was performed. This extends the earlier synthetic browser conflict evidence to the real authenticated browser/API path; no raw HTTP status/network trace was captured in this run.

Sign out cleared private content, reload remained logged out, the other tab showed login without private draft text, and browser Back reached the protected PT login page. Chrome reached its displayed 200% zoom during a partial login-screen check, then was restored to 100%; no complete native 200%/360px layout certification is claimed. Window clipping, stale accessibility snapshots and concurrent user input limited some interactions. The duplicate test tab was closed, the original C debugger tab was preserved, and the remaining local admin tab was left logged out. Native screenshots were inspected through the control tool and were not saved as new artifacts. No application code or production configuration changed in this review.
