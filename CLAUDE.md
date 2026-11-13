# CLAUDE.md

Project rules for Claude Code in this repository. Machine-specific instructions live in `CLAUDE.local.md` (git-ignored).

## Project

Personal portfolio of João Abreu: a static, bilingual (EN/PT) site with real GitHub data. The look (V2) follows two references: developer.org.tr (pages, cards, popups, dark theme under blue wallpapers) and augustogalego.com (header pill, intro loader, light theme). Audience: recruiters arriving from GitHub and LinkedIn, so the essentials go on the first screen and the site must load fast and never stutter.

- **Stack:** Astro (static output), TypeScript (strict). Zero JavaScript by default; JS only in interactive islands.
- **Hosting:** own VM (AWS Lightsail, Ubuntu, nginx) behind Cloudflare, deployed by GitHub Actions (build + rsync over SSH) on every push to `main` and once a day.
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
  content/projects.yaml     language-neutral project data (repo, role, order, stack, cover)
  content/projects/<locale>/<id>.md  project text per locale; the Markdown body is the case study
  assets/case-studies/      case study covers (SVG or raster, optimized by astro:assets)
  content/contacts.yaml     contact channels (https links only)
  content/about/<locale>.md about paragraphs and "in progress" list per locale
  content/stack.yaml        stack groups (names translated as stack.<id> in ui.ts)
  data/github-snapshot.json written by scripts/github-snapshot.ts on every build (git-ignored)
  i18n/ui.ts                UI strings per locale; English defines the shape
  i18n/admin.ts             typed EN/PT strings for the private admin workspace
  lib/activity.ts           contribution stats, year heatmap layout, recent repos (shared by build and browser)
  lib/calendar.ts           Rio and UTC dates
  lib/content.ts            merges and cross-checks content; fails the build if locales diverge
  lib/github-data.ts        endpoints, types and validators for GitHub and DEV data (shared by build and browser)
  lib/github.ts             reads and revalidates the snapshot at build time (null parts = no data, never invented)
  layouts/Base.astro        <html lang>, hreflang, Open Graph, CSP-hashed head scripts, palette tokens, wallpapers,
                            intro loader, header pill, footer, page transitions
  components/Heatmap.astro       year of contributions, GitHub-style
  components/RepoGrid.astro      recently pushed repositories (home)
  components/TechGrid.astro      technologies with simple-icons logos (home)
  components/ProjectPopup.astro  repository popup on the projects page (root files, folders browsable)
  components/Handoff.astro       what each pipeline stage receives and hands on
  components/ContactForm.astro   contact form (sending off until the API is live)
  components/ContactIcon.astro   contact channel icons
  scripts/theme.ts          light/dark switch with a circular reveal (View Transitions API)
  scripts/loader.ts         intro loader on entry and reload; the percentage follows real milestones
  scripts/scroll-fx.ts      progress bar, see-through header over the wallpaper, reveal on scroll
  scripts/github-live.ts    live contributions and practice data (30-min localStorage cache)
  scripts/journey.ts        pipeline page: packet on the rail, visit timings, headers, Cloudflare trace, last deploy
  scripts/project-popup.ts  opens and animates the project popups, browses folders via the GitHub API
  scripts/card-glow.ts      pointer glow on cards
  layouts/Admin.astro       private workspace shell (noindex); authenticated data loads only in the browser
  scripts/admin.ts          GitHub session, CSRF, project drafts and private contact inbox
  styles/admin.css          responsive light/dark admin styles
  pages/admin.astro         static entry to /en/admin/
  pages/[locale]/admin.astro  EN/PT project drafts and inbox; excluded from the sitemap
  pages/index.astro         redirects / to /en/ (static fallback)
  pages/404.astro           bilingual 404 (noindex); nginx should serve it with `error_page 404 /404.html`
  pages/[locale]/           Home, Projects, Pipeline, Blog, Resume and Contact, generated for every locale
  pages/[locale]/projects/[id].astro  page for every listed project (problem, decisions, result, case study)
scripts/github-snapshot.ts  build-time fetch of profile, repos, contributions, practice commits, DEV articles and
                            project repository roots; each source keeps its previous value if it fails
                            (run by `npm run build`; uses GITHUB_TOKEN if set)
scripts/og-images.ts        `npm run og`: renders public/og/og-<locale>.png (1200 × 630) with headless Chrome;
                            rerun after changing the name, role or badge strings
public/                     static files copied as-is (robots.txt points to the sitemap from @astrojs/sitemap)
  img/wallpapers/*.svg      the blue wallpapers behind the top of every page
  cv/joao-abreu-cv-<locale>.pdf  résumé; the link and viewer appear only when the file exists
```

```
deploy/
  README.md                 how the server is built (Lightsail, nginx, Cloudflare) and how to rebuild it
  nginx/portfolio.conf      nginx site; copied to /etc/nginx/sites-available/portfolio with scp
.github/workflows/deploy.yml  build and rsync to the server on every push to main and once a day
```

The admin uses same-origin /api and /oauth2 routes. Astro's dev server proxies them to the local API on port 8080. Production routing is infrastructure work for João. Saving and archiving drafts do not alter their separately selected public copies. The build reads selected copies from PROJECTS_API_URL, fails if that configured source is unavailable, and emits project-publications.json so the admin can distinguish pending versions from deployed ones. Automatic deploy triggering is not connected yet. Existing file-based projects remain independent; a slug collision fails the build until those projects are explicitly migrated.

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
- V2 work stays on `feat/v2` in both `portfolio` and `portfolio-api`; keep `main` unchanged until João decides the V2 is ready. Do not open V2 PRs against `main` during development.
- For independent fixes outside V2, one branch per stage, prefixed: `chore/`, `ci/`, `feat/`, `fix/`, `docs/`, `perf/`. Before starting a stage, `git pull` on `main` and branch from it.
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
npm run build     # astro check + static build into dist/
npm run preview   # serve dist/ locally
```

Run the dev server in the background (`astro dev --background`; manage it with `astro dev stop`, `astro dev status` and `astro dev logs`).

## Session context

Use only Google Drive for Second Brain notes; the retired Obsidian app and MCP are not session prerequisites. Read the original `CLAUDE.local.md` for the local Drive path, then the transition, universal rules and project Status. Update Status and Log at an authorized session close, and the transition when passing the baton. Keep historical entries intact.
