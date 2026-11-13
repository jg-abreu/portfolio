# Portfolio AI assistant - V2 scope

## Release boundary

The AI assistant is exclusive to V2. Its integration target is `feat/v2` in both repositories: `portfolio` and `portfolio-api`. Feature branches must be based on V2 and their pull requests must target `feat/v2` exclusively.

- Keep all assistant-related code, configuration, knowledge resources, prompts, tests and documentation within V2 and its feature branches; never target `main`.
- Preserve V1 and the currently published website. Do not add or backport the assistant to V1, `main`, or the current production site.
- Do not merge into `main`, push any branch, or deploy without an explicit request from the user for the corresponding action.
- Authorization to implement or test locally does not authorize publication. Existing general Git workflow instructions do not override this feature-specific restriction.
- Before further edits or Git operations, verify the active branch in both repositories. Do not move unrelated local changes or switch to `main` to continue this feature.
- Local development servers, builds and generated artifacts are for V2 verification only; they do not establish that the feature is published.

## Responsibilities and current implementation

| Repository | Assistant scope |
| --- | --- |
| `portfolio` | Bilingual Astro interface, v1 contract types and validation, browser error handling, tests and local development proxy. |
| `portfolio-api` | Gemini configuration, authorized knowledge base and System Prompt, resource validation, model adapter, response assembly, public v1 endpoint, request limits and simulated tests. |

The public contract remains `POST /api/assistant/messages` v1: independent questions, `pt`/`en` locales, and `answered`/`insufficient_knowledge` responses. The backend owns public source metadata, `knowledgeVersion`, and the exact insufficient-knowledge wording.

The HTTP controller is implemented in the companion API feature branch targeting `feat/v2`. The local Astro proxy is not a production nginx change. The interface and backend service must not be described as a feature already published on the current site.

Knowledge files and the System Prompt are in English; visitor answers remain Portuguese or English according to `locale`. Tests use simulated Gemini responses without real API calls.

## Publication gate

Any future release work must respect the V2-only boundary. A request for one action (for example, pushing `feat/v2`) does not grant permission for another (merging into `main` or deploying). Confirm the requested release target and scope before carrying out an explicitly requested publication action.

## Validation status (2026-11-12)

### Automated tests with simulated AI

- The complete backend suite passed: 69 tests, zero failures, errors or skipped tests.
- PostgreSQL 18 ran in isolated Testcontainers databases, and all four Flyway migrations were applied. The persistent development database was not used as the test database.
- Gemini was simulated; the real Gemini key was removed only from the test process. OAuth values were fictitious and confined to tests.
- Coverage includes the v1 endpoint, validation, problem responses, body limits, rate limits and concurrency, administrative authentication/CSRF, project drafts and publications.
- The frontend assistant client suite passed all eight tests, including contract error handling, unsafe source URLs, Unicode question length and timeout classification while reading a response body. Before PR preparation, all 23 frontend tests passed on the current V2 base, including the existing publications integration fixture; that fixture simulates the publications API, not Gemini.
- Astro type checking completed with zero errors, warnings or hints. The updated static build completed; existing Shiki/CSP build warnings remain separate from the type-check result.

### Browser checks with a simulated API

A temporary server at `http://127.0.0.1:4322` served the V2 static build and intercepted assistant requests only in that test environment. It did not call Gemini, change the normal Astro application on port 4321, or modify backend authentication/CSRF.

Verified in Chrome:

- PT and EN interface strings and layout in a compact browser window.
- Opening the panel, typing a question, keyboard submission, Escape to close, and Enter to reopen.
- Loading feedback and disabled submission during a delayed simulated response.
- A simulated answer with source links, sources without URLs and an unsafe source URL rendered as non-clickable text.
- The exact approved English insufficient-knowledge answer, with no sources.

Browser testing found that a new answer could remain below the visible area in a compact window. Frontend corrections now focus and scroll to results/errors, prevent question changes during loading, align the input with the 2,000 Unicode-code-point contract and classify response-body timeouts correctly. Automated checks passed after these corrections, but the browser checks were not repeated against the corrected build.

The browser tool stopped when preparing responsive-device emulation because it could not determine the Chrome URL with sufficient confidence. A dedicated phone viewport, visual error states and post-fix focus/scroll behavior remain unverified. This is partial browser validation, not completed mobile or accessibility acceptance testing.

### Real integration status

An earlier minimal direct Gemini API smoke test returned HTTP 200 for a generic prompt. It did not exercise Spring Boot, the authorized knowledge base, source validation or the Astro proxy.

Local OAuth variables have been configured outside the repository. The API was started with the local profile and process-only OAuth/database settings; its health endpoint returned HTTP 200 with UP and an anonymous admin-session request returned HTTP 401.

The user subsequently reported successful manual checks of a technologies answer in Portuguese, an absent-salary-information answer in English and use in a narrow window. These are user-reported runtime checks, separate from automated simulations. No captured response/source audit or completed GitHub browser-login verification was produced by the agent. Do not treat mocked tests as proof of live Gemini integration or general factual accuracy.

### Remaining work

1. Verify the complete GitHub OAuth browser login; local configuration and API startup are confirmed, without weakening authentication or CSRF.
2. When explicitly authorized, capture and audit live v1 response metadata, source selection and exact insufficient-knowledge wording; the user's manual PT/EN checks are recorded above.
3. Repeat browser checks against the corrected build, including a dedicated phone viewport, keyboard focus/scroll, closing by button and the visual error states (including rate-limit recovery).
4. Review actual PT/EN model answers for factual fidelity and relevant source selection.
5. Before any future authorized V2 publication, verify trusted proxy/client-address handling and the intended release target. V1 and the current published site remain outside this feature's scope.

The temporary simulation server was stopped and port 4322 was confirmed without a listener. Its fixtures are not part of normal application behavior. Astro on port 4321 and development PostgreSQL on port 15432 were preserved. The API was subsequently started locally on port 8080. Publication has not been performed.

## Mobile regression review — 2026-11-13

The current V2 static build was reviewed in Chrome responsive emulation at 360 × 653 CSS pixels, in the dark theme. An isolated Python HTTP server at `127.0.0.1:4322` served `dist` and answered only synthetic assistant requests. It did not proxy to Spring Boot, call Gemini, use an AI key, send mail or modify the normal API on 8080 or Astro on 4321.

Verified in Portuguese:
- The dialog, textarea, submit control and contact link stayed inside the phone viewport.
- Submitting a long synthetic answer brought the response and its sources into view; the previous compact-window scroll issue did not reproduce.
- A safe relative source was linked. A source title containing HTML appeared as literal text and its JavaScript URL was not linked or executed.
- Escape closed the dialog and Enter reopened it; the question field remained usable.
- A synthetic 503 showed the localized unavailable message in view, preserving the question and allowing another attempt.
- A synthetic 429 with Retry-After 3 showed localized recovery guidance and disabled submission. After the interval, the button enabled automatically and another request succeeded.
- An insufficient-knowledge display fixture showed no sources. Its text was synthetic UI content, not an audit of the backend's exact approved fallback wording.

Verified in English: the dialog and controls fit the same phone viewport, and a synthetic insufficient-knowledge response was displayed with the knowledge version, no sources and the contact link in view. Portuguese long-answer, failure and cooldown cases were not repeated in English during this review. These are emulated-browser checks, not physical-device or full accessibility certification. No new functional change was needed and no unrelated test suite was rerun for this documentation-only stage.

The simulator was stopped after review. Expected 503 and 429 entries in DevTools came from deliberate fixtures. Public recommendations remained empty through the normal Astro/API route. Existing real GitHub OAuth checks were completed during the recommendation/inbox workflow; the earlier OAuth-pending entry above is historical.

Still pending at that checkpoint: real PT/EN model-answer/source fidelity audit, exact live fallback verification, light-theme and broader keyboard/accessibility review, trusted production proxy validation and authorized V2 release preparation. No main merge, production deployment or real Gemini query occurred in this stage.

## Light theme and keyboard review — 2026-11-13

The normal local Astro site on port 4321 was reviewed in Chrome at 360 × 653 CSS pixels. The Portuguese and English assistant dialogs were legible in the light theme, with the question field, submission control and contact link fitting within the horizontally bounded dialog. Vertical scrolling remains available. No question was submitted and no Gemini request was made.

In Portuguese, opening the dialog focused the question field. Tab showed a visible focus indicator on the submit button and then the contact link, scrolling the latter into view. Closing with the visible close button returned focus to the launch button, as confirmed by reopening with Enter. Escape closed the dialog and displayed the launch button's focus indicator. Escape and restored launch focus were also checked in English. Chrome's own browser controls remained reachable; this was not a full tab-order or assistive-technology audit.

No functional change was required. Response/error states in the light theme, screen-reader testing, physical-device testing, the real PT/EN answer/source audit and exact live fallback verification remain pending. Earlier dark-theme simulated-response evidence remains separate from this no-request review. Production and main were unchanged.
