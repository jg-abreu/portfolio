# V2 release checklist

This is the ordered remaining acceptance work, not authorization to deploy. Both code repositories stay on `feat/v2`; no V2 PR targets `main` during development. João reviews and merges. Infrastructure and the release cutover remain his manual work.

Local acceptance for the current content scope is complete as recorded below (2026-11-14). This is not a completed release: section 2's dedicated credential/receiver, section 3's manual infrastructure recovery checks and section 4's approvals/live verification remain gates. No production endpoint, token or workflow should be assumed ready from a passing local test.

## 1. Finish local acceptance

- [x] Inspect the enabled numeric visit footer at 360 × 653 in EN/PT and light/dark themes. A synthetic transport total verified formatting and placement; real registration/deduplication/API-failure checks remain separate evidence. Bottom spacing keeps the number above the assistant launcher. See [visits](visits.md).
- [x] Exercise project-editor conflict, transport failure and expiry in two isolated browser tabs in EN/PT at 360 px with synthetic HTTP responses. Conflicts/network failures preserved unsaved input; expiry cleared private state. Native dialog keyboard traversal returned to the dialog without focusing background controls. This is frontend acceptance, not a new real OAuth/API/database conflict test.
- [x] Extend project acceptance to the user's actual authenticated Chrome/API: bilingual draft persistence, discard/keep editing, archive/restore, stale edit conflict across duplicated tabs, reopening the winning revision, logout/reload/other-tab/Back protection. The synthetic test draft ended archived and was never selected publicly. See the native-browser scope and remaining limits in validation.md.
- [x] Load all 22 built public routes at 360 px/reduced motion with external and API requests blocked; verify content, no horizontal overflow and no uncaught exceptions, then preserve loaded text after switching offline. Check assistant network-failure input preservation and Escape/focus restoration in EN/PT. This does not provide new-page offline loading, external images or complete keyboard/provider-state coverage.
- [x] Complete the assistant's controlled response-state review in EN/PT and light/dark mobile layouts: 48 cases covered answers, missing information, all eight contract errors, network failure and malformed responses; rate-limit recovery, safe rendering, input preservation and Escape/focus restoration passed. Other recorded editor/contact/recommendation reviews remain separate evidence; this is representative acceptance, not exhaustive assistive-technology certification.
- [x] Review the existing EN/PT resume PDFs and their local page/download integration. Both one-page PDFs rendered without visible clipping, contain extractable text and a structure tree, and were served byte-for-byte with the correct locale and PDF content type. Content claims were not reverified or rewritten; final preview approval remains below.
- [x] Confirm initial recommendation content: João chose an empty catalogue on 2026-11-14 and will add his items later. Real-content cover performance review becomes a gate for that later content change; test fixtures are not personal recommendations.
- [x] Run the bounded two-instance/concurrency exercise locally with synthetic data and outbound providers disabled: 96 concurrent posts, 16 new counts, both nodes total 17; cross-node/failover CSRF rejection and recovery checked. Details/resources/limits: portfolio-api/docs/local-two-instance.md. This short burst does not certify sustained load, real nginx/Cloudflare or VM capacity.
- [x] Run resolved Maven advisory checks and V2 CodeQL analysis, review findings and record results. Guava was updated; repeat OSV query had no matches. Fixes/triage and scope are in [dependency security](dependency-security.md). Dependabot version monitoring remains prepared, not active.

## 2. Verify real integrations

- [x] Configure the key privately and audit a real PT/EN sample: four service/provider requests plus two through Astro/Spring HTTP passed, with approved sources and exact missing-information fallbacks. No contacts or credentials in prompts/logs. Broader UI/provider-failure and deployment quota acceptance remains separate.
- [x] Verify a real public card query/parse/render locally using existing authorized CLI authentication in memory only. This did not configure a deployment token or test live scheduled failure/recovery.
- [x] Obtain João's visual approval for the dark modular card inspired by buraksocial's README (2026-11-14). Warm/cold/long-data renderer previews and 10 focused tests passed after the change. This is approval of composition, not publication.
- [ ] Configure a dedicated minimal card deployment credential and check live refresh/cache/fallback. Profile README integration waits for the authorized release.
- [ ] Complete the receiving-workflow handoff and live publication checks when release authorization permits default-branch registration. Verify project and recommendation manifests against selected revisions, failed builds and rollback. Dispatch acceptance alone is not publication. See [publication](publication.md).

## 3. Manual infrastructure acceptance — João

- [ ] Confirm persistent PostgreSQL/media paths, actual proxy trust chain and private flags/secrets in the intended V2 environment. Recheck current VM resources and costs/credits before any billable change; historical measurements are not current evidence.
- [ ] Configure private external backups and restore a retrieved database/media pair into a separate isolated environment. Check hashes, Flyway, sequences, permissions and representative data. Keep all schedulers disabled until restored pending work has been reviewed. The local disposable restore passed; external recovery remains unproven. Follow `portfolio-api/docs/backup-restore.md`.
- [ ] Review contact outbox, SMTP, retention, visit HMAC stability, provider quotas and process-local limit behavior before enabling features. A local rate limit is not a distributed spending cap.
- [ ] Review workflow destination, branch guards, protected environment, permissions, atomic release replacement and rollback. Preserve the old serving release/database and do not move DNS/IPs or remove a VM early.

## 4. Joint release gate

- [ ] João approves the final preview and the exact scope/remaining accepted limitations.
- [ ] Reconcile final changes and run the relevant checks against the actual release candidates; record commit IDs and results. Do not repeat all tests merely to replace dated evidence when code has not changed.
- [ ] Only after explicit approval, open the final V2 PRs for João's review/merge and execute his manual release sequence.
- [ ] Verify live login/logout, public/private boundaries, selected manifests, contact delivery handling, counter trust and provider behavior; record rollback readiness.
- [ ] Verify Dependabot activation/PR destinations and scan results after the authorized default-branch configuration is present. Review the prepared `feat/v2` maintenance targets before ordinary main-based maintenance.

## Next session starting point

Start with João's final preview/card approval, then the dedicated card credential and the manual receiving-workflow/backup/infrastructure sequence in sections 2–4. Use the existing `docs/publication.md` and API `docs/profile-card.md`, `docs/backup-restore.md` and `docs/visits.md` as the concrete guides. Do not register the receiver on main or enable workers merely to clear a checklist. Do not invent credentials, personal recommendation content or successful scan/deploy results. Evidence and scope live in [validation](validation.md), module documentation and `SESSION_HANDOFF.md`.
