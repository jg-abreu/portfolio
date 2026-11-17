# CLAUDE.md

Project rules for Claude Code in this repository. Machine-specific instructions live in `CLAUDE.local.md` (git-ignored).

## Project

Personal portfolio of João Abreu: a static, bilingual (EN/PT) site with real GitHub data. The look (V2) follows two references: developer.org.tr (pages, cards, popups, dark theme under blue wallpapers) and augustogalego.com (header pill, intro loader, light theme). Audience: recruiters arriving from GitHub and LinkedIn, so the essentials go on the first screen and the site must load fast and never stutter.

- **Stack:** Astro (static output), TypeScript (strict). Zero JavaScript by default; JS only in interactive islands.
- **Hosting:** own VM (AWS Lightsail `portfolio-v2-2gb`, Ubuntu, nginx) behind Cloudflare, deployed by GitHub Actions (build + rsync over SSH) on every push to `main`, once a day and when the admin publishes. The same VM runs the API from `portfolio-api` (two instances plus PostgreSQL in Docker Compose) and the `v2.joaoabreu.dev` preview (noindex). The old `portfolio` VM and its static IP are kept only as a rollback. See `deploy/README.md`.
- **Domain:** https://joaoabreu.dev

## Division of responsibilities

| Area | Who does the work | Claude's role |
|---|---|---|
| Front-end (Astro, layout, pages, i18n, content, GitHub data script) | Claude | Writes the code and runs the build |
| Deploy and infrastructure (VM, SSH, firewall, nginx, DNS/Cloudflare, HTTPS, `deploy/`, `.github/workflows/deploy.yml`, Secrets) | João, by hand | **Guides only**: explains the concept, gives the next step, reviews and helps debug. Never writes these files nor runs commands on the VM for him |
| Back-end (Spring Boot API) | Coding assistant | Implements and tests in small parts; João reviews the code and the flow |
| Git and GitHub (branches, commits, messages, push, PR description and opening) | Claude, in every stage, including João's | Creates the branch, commits (including files João wrote), pushes and opens the PR |
| Review and merge | João | Claude **never merges or approves a PR** |

When a decision is needed, ask **one question at a time**. Use concepts and tools João already knows; ask before introducing unfamiliar ones. Explain the implementation during review, outside the code, and keep new code free of explanatory comments.

## Project structure

```
src/
  content.config.ts         content collections and their schemas
  content/projects.yaml     optional file-based projects (empty: projects are managed in the admin)
  assets/case-studies/      optional repository covers; admin covers download to assets/projects-generated/ (git-ignored)
  content/contacts.yaml     contact channels (https links only)
  content/practice.yaml     profiles under the Home practice band; the band itself reads the practice repository
  content/about/<locale>.md about paragraphs and "in progress" list per locale
  content/stack.yaml        stack groups (names translated as stack.<id> in ui.ts)
  data/github-snapshot.json written by scripts/github-snapshot.ts on every build (git-ignored)
  i18n/ui.ts                UI strings per locale; English defines the shape
  i18n/admin.ts             typed EN/PT strings for the private admin workspace
  i18n/card-admin.ts        typed EN/PT strings for the admin profile-card editor
  i18n/recommendation-admin.ts  typed EN/PT strings for the admin recommendations editor
  i18n/publication.ts       typed EN/PT labels for the site-update (publication dispatch) status
  lib/activity.ts           contribution stats, year heatmap layout, recent repos (shared by build and browser)
  lib/calendar.ts           Rio and UTC dates
  lib/content.ts            merges and cross-checks content; fails the build if locales diverge
  lib/covers.ts             resolves a project cover from the repository or the downloaded admin covers
  lib/project-profiles.ts   parses the admin's "Label | https://address" profile lines
  lib/github-data.ts        endpoints, types and validators for GitHub and DEV data (shared by build and browser)
  lib/github.ts             reads and revalidates the snapshot at build time (null parts = no data, never invented)
  lib/blog.ts               validates and synchronizes the configured author's full DEV articles
  lib/blog-data.ts          reads the public article snapshot for static page generation
  lib/assistant.ts          AI assistant contract v1: request, response validation, safe source URLs, error codes
  lib/project-publications.ts  types and validators for the published project copies served by the API
  lib/publication-content.ts   reads the project publications snapshot written before the build
  lib/publication-markdown.ts  renders published case-study Markdown with https-only links
  lib/publication-status.ts    shows the site-update status (idle, disabled, pending, dispatching, dispatched) in the admin
  lib/admin-client.ts       shared same-origin admin request helper and its error type
  lib/recommendation-data.ts   reads the recommendations snapshot (empty when the API source is not configured)
  lib/recommendation-admin.ts  types and validators for recommendation drafts and sections in the admin
  lib/google-books.ts       builds validated Google Books links and cover addresses for book recommendations
  layouts/Base.astro        <html lang>, hreflang, Open Graph, CSP-hashed head scripts, palette tokens, wallpapers,
                            intro loader, header pill, footer, page transitions
  components/Heatmap.astro       year of contributions, GitHub-style
  components/RepoGrid.astro      recently pushed repositories (home)
  components/TechGrid.astro      technologies with simple-icons logos (home)
  components/ProjectPopup.astro  repository popup on the projects page (root files, folders browsable)
  components/Handoff.astro       what each pipeline stage receives and hands on
  components/LoadBalancing.astro pipeline section: the real API instance that served the visit (/api/instance)
                                 and a labelled in-browser simulator of cache, hashing, 429 limits and failover
  components/ContactForm.astro   contact form (PUBLIC_CONTACT_ENABLED stays false by default)
  components/ContactIcon.astro   contact channel icons
  components/VisitCounter.astro  optional approximate visits: Home hero badge, footer elsewhere; excluded from admin and 404
  components/MobileMenu.astro    phone navigation: a menu button opens a popover panel with every page
  components/Assistant.astro     AI assistant launcher and dialog (EN/PT); answers come from the API (docs/assistant.md)
  components/PublicationStatus.astro  admin line that reports the site-update status
  scripts/theme.ts          light/dark switch with a circular reveal (View Transitions API)
  scripts/loader.ts         intro loader on entry and reload; the percentage follows real milestones
  scripts/scroll-fx.ts      progress bar, see-through header over the wallpaper, reveal on scroll
  scripts/github-live.ts    live contributions and practice data (30-min localStorage cache)
  scripts/journey.ts        pipeline page: packet on the rail, visit timings, headers, Cloudflare trace, last deploy
  scripts/load-sim.ts       drives the simulator (counters, dots, live summary) and reads /api/instance
  lib/load-sim.ts           simulator model mirroring nginx consistent hashing and the API's real rate limits
  scripts/project-popup.ts  opens and animates the project popups, browses folders via the GitHub API
  scripts/card-glow.ts      pointer glow on cards
  scripts/mobile-menu.ts    closes the phone menu on navigation, resize to desktop and page hide; syncs aria-expanded
  scripts/assistant.ts      assistant dialog: sends questions, renders answers, sources and errors, handles Retry-After
  scripts/recommendation-admin.ts  admin recommendations editor: sections, items, ordering, draft and publish
  layouts/Admin.astro       private workspace shell (noindex); authenticated data loads only in the browser
  scripts/admin.ts          GitHub session, CSRF, project drafts and private contact inbox
  scripts/card-admin.ts     profile-card editor: free blocks dragged to move and resized by their edge (1/3, 1/2, full),
                            titles and lines editable, live preview, draft and publish
  lib/card-admin.ts         card settings validators, row packing that mirrors the API, base64url preview encoding
  lib/contact.ts            same-origin CSRF contact client and acknowledged receipt
  lib/sortable.ts           pointer drag-to-reorder for admin lists (mouse anywhere, touch on the grip)
  lib/recommendations.ts    recommendation snapshot (v3, reads v2): sections Books, Items or external Link, half-star
                            ratings, reading language, Amazon link detection
  components/RecommendationSection.astro  a section's cards: Technical / Non-technical book columns, stars, link button
  pages/[locale]/recommendations/[slug].astro  one page per Books or Items section; the index shows a card per section
  scripts/contact.ts        optional contact submission, retry keys and bilingual feedback
  lib/visits.ts             same-origin CSRF visit registration and validated real total
  scripts/visits.ts         optional public-page tracking after load; hides unavailable totals
  styles/admin.css          responsive light/dark admin styles
  pages/admin.astro         static entry to /en/admin/
  pages/[locale]/admin.astro  EN/PT project drafts and inbox; excluded from the sitemap
  pages/[locale]/admin/card.astro  EN/PT editor for the GitHub profile card served by the API
  pages/[locale]/admin/recommendations.astro  EN/PT editor for the public recommendations
  pages/project-publications.json.ts         deployed project versions, so the admin can spot pending ones
  pages/recommendation-publications.json.ts  deployed recommendation revisions, for the same purpose
  pages/index.astro         redirects / to /en/ (static fallback)
  pages/404.astro           bilingual 404 (noindex); nginx should serve it with `error_page 404 /404.html`
  pages/[locale]/           Home, Projects, Pipeline, Blog, Recommendations, Resume and Contact, generated for every locale
  pages/[locale]/projects/[id].astro  page for every listed project (problem, decisions, result, case study)
  pages/[locale]/blog/[slug].astro  internal static article reader; EN/PT UI, original published Markdown
scripts/blog-snapshot.ts    fetches full DEV article bodies after the metadata snapshot; bounded downloads,
                            cached-copy fallback, no browser DEV API request (see docs/blog.md)
scripts/github-snapshot.ts  build-time fetch of profile, repos, contributions, practice commits, DEV articles and
                            project repository roots; each source keeps its previous value if it fails
                            (run by `npm run build`; uses GITHUB_TOKEN if set)
scripts/project-publications.ts  `npm run publications` (first build step): fetches the selected project copies
                            from PROJECTS_API_URL
scripts/recommendations-snapshot.ts  `npm run recommendations`: fetches published recommendations and their covers
                            from RECOMMENDATIONS_API_URL (empty when unset); recommendation-source.ts validates that URL
scripts/*.test.ts           `npm test`: Node test runner suites, one per library or feature
scripts/og-images.ts        `npm run og`: renders public/og/og-<locale>.png (1200 × 630) with headless Chrome;
                            rerun after changing the name, role or badge strings
public/                     static files copied as-is (robots.txt points to the sitemap from @astrojs/sitemap)
  img/wallpapers/*.svg      the blue wallpapers behind the top of every page
  cv/joao-abreu-cv-<locale>.pdf  résumé; the link and viewer appear only when the file exists
docs/                       feature specs and evidence: assistant (kept identical in portfolio-api), blog, contact,
                            publication, recommendations, visits, dependency security, admin testing, validation
                            and the V2 release checklist
```

```
deploy/
  README.md                 how the server is built (Lightsail, nginx, Cloudflare, API, backups) and how to rebuild it
  CONTACT-FORM.md           what the contact form sends and what must be true before enabling delivery
  nginx/portfolio.conf      main site: static files, /api balanced over two API instances, OAuth routes;
                            copied to /etc/nginx/sites-available/portfolio with scp
  nginx/portfolio-v2.conf   v2.joaoabreu.dev preview (noindex) on the same VM
.github/workflows/deploy.yml  build and rsync to the server on every push to main, once a day and on admin dispatch
.github/workflows/codeql.yml  CodeQL scan of the JavaScript/TypeScript and the workflows
.github/dependabot.yml      dependency update PRs against main
```

The admin uses same-origin /api and /oauth2 routes. Astro's dev server proxies them to the local API on port 8080. In production nginx balances /api across two API instances (127.0.0.1:8080 and :8081) with a consistent hash of the visitor's address; see deploy/README.md. Saving and archiving drafts do not alter their separately selected public copies. The build reads selected copies from PROJECTS_API_URL, fails if that configured source is unavailable, and emits project-publications.json so the admin can distinguish pending versions from deployed ones. Publishing or withdrawing in the admin asks the API to dispatch deploy.yml, so the site rebuilds in about a minute. Existing file-based projects remain independent; a slug collision fails the build until those projects are explicitly migrated.

The AI assistant calls `POST /api/assistant/messages` (contract v1) on the same origin. The API owns the answers, sources, `knowledgeVersion` and the exact insufficient-knowledge wording; the front-end validates and renders them, and turns unsafe source URLs into plain text. Contract, limits and validation history are in `docs/assistant.md`.

The resume page embeds the PDF in an iframe, so nginx must allow same-origin framing
(`X-Frame-Options: SAMEORIGIN` or `frame-ancestors 'self'`); with `DENY` only the "Open" link works.

## Internationalization

- Locales: `en` (default) and `pt`, Astro native i18n with `prefixDefaultLocale: true`, so routes are `/en/...` and `/pt/...`.
- Every user-visible string comes from the i18n/content files, never hard-coded in components.
- English defines the structure; Portuguese is typed against it, so `npm run build` (which runs `astro check`) fails if they diverge.
- Each page sets `<html lang>`, `hreflang` alternates (plus `x-default`) and the Open Graph locale.
- Format dates and numbers with the active locale (`en-US` / `pt-BR`).
- The language switch keeps the user on the same page.

## Performance rules

- Animate only `transform` and `opacity`.
- Decorative motion (wallpapers, pipeline visuals) is CSS only and never blocks the page; the PDF and live data load after it.
- Every animation respects `prefers-reduced-motion`.
- Never show fake data: live GitHub data falls back to the snapshot generated at build time.
- Validate and sanitize external data (https links only, `YYYY-MM-DD` dates, non-negative numbers, escaped HTML); wrap every `localStorage` access in `try/catch`.

## Git workflow

- Everything merged into `main` goes live, so `main` must always be deployable. **No direct commits to `main`.**
- V2 is live since the cutover on 2026-11-14; `feat/v2` is historical and receives no new work.
- One branch per stage, prefixed: `chore/`, `ci/`, `feat/`, `fix/`, `docs/`, `perf/`. Before starting a stage, `git pull` on `main` and branch from it. A change that spans both repositories gets one branch and PR in each.
- Small, frequent commits in English using Conventional Commits (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `perf:`, `refactor:`).
- Branch, file and folder names in English.
- PR description in English: what changed, why, how to test, and the definition-of-done checklist.
- Work happens on two machines: `git pull` at the start of a session; commit and push everything at the end.

## Keeping CLAUDE.md and AGENTS.md in sync

`CLAUDE.md` and `AGENTS.md` hold the same project rules, one file per coding assistant. They must stay identical except for the title line and the assistant's name.

- Any change to the project rules goes into **both files in the same commit**: structure, responsibilities, i18n, performance, Git workflow, definition of done and commands.
- Machine-specific instructions (vault path, handoff steps) do not go here; they live in the git-ignored `CLAUDE.local.md`.
- Before committing, check that only the title line differs (both sides are normalized to the same assistant name):

  ```bash
  n='s/Claude Code/Codex/g;s/Claude/Codex/g'; diff <(sed "$n" CLAUDE.md) <(sed "$n" AGENTS.md)
  ```

## Definition of done (per stage)

A stage becomes a PR only when:

- [ ] `npm run build` passes with no errors
- [ ] João has seen the preview (`npm run dev` or the deploy) and approved it
- [ ] Works at phone width with no horizontal scroll
- [ ] EN and PT are both complete for what the stage delivers
- [ ] From stage 5: Lighthouse ≥ 90 in Performance, Accessibility, Best Practices and SEO
- [ ] Animations respect `prefers-reduced-motion`
- [ ] From stage 7: the site stays complete with `api.github.com` and the contributions service blocked
- [ ] João's stages: he wrote and ran it himself and can explain each step

## Commands

```bash
npm install
npm run dev       # dev server at http://localhost:4321
npm run build     # snapshots (publications, recommendations, GitHub, blog) + astro check + static build into dist/
npm run preview   # serve dist/ locally
npm test          # Node test runner suites in scripts/*.test.ts
```

Run the dev server in the background (`astro dev --background`; manage it with `astro dev stop`, `astro dev status` and `astro dev logs`).

## Session context

Use only Google Drive for Second Brain notes; the retired Obsidian app and MCP are not session prerequisites. Read the original `CLAUDE.local.md` for the local Drive path, then the transition, universal rules and project Status. Update Status and Log at an authorized session close, and the transition when passing the baton. Keep historical entries intact.
