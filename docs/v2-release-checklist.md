# V2 release checklist

This is the ordered remaining acceptance work, not authorization to deploy. Both code repositories stay on `feat/v2`; no V2 PR targets `main` during development. João reviews and merges. Infrastructure and the release cutover remain his manual work.

## 1. Finish local acceptance

- [ ] Inspect the enabled numeric visit footer visually in EN/PT at phone width. Real PT browser/API/database registration, deduplication and API-failure hiding already passed; screenshots did not establish numeric placement. See [visits](visits.md).
- [ ] Complete project-edit conflict checks across tabs and remaining disconnected-network, keyboard, focus and reduced-motion interactions. Keep automated session tests distinct from browser evidence.
- [ ] Review actual recommendation content/covers and the intended resume PDF, then check their performance and accessibility. Empty-catalogue scores do not cover loaded media.
- [ ] Run the planned two-instance/concurrency exercise only locally, with synthetic data and outbound email/provider/dispatch features disabled. Record resource use and limitations; do not target production.
- [ ] Run Java advisory and source/CodeQL analysis, review findings and record actual results. Frontend npm audit reported zero known vulnerabilities on 2026-11-13. Weekly npm/Actions/Maven monitoring is prepared, not active. See [dependency security](dependency-security.md).

## 2. Verify real integrations

- [ ] Configure the Gemini key privately and audit real EN/PT answers, source fidelity and exact insufficient-knowledge/error behavior. Do not include keys or private contact data in prompts, logs or notes.
- [ ] Configure the profile-card token privately, verify the fixed public GitHub query/cache/fallback and obtain João's visual approval. Profile README integration waits for the authorized release.
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

Start with section 1's visit-footer visual check, then remaining local interaction checks. Independent work can continue while real integration credentials are unavailable. Do not invent credentials, personal recommendation content or successful scan/deploy results. Evidence and scope live in [validation](validation.md), module documentation and `SESSION_HANDOFF.md`.
