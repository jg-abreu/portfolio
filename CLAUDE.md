# CLAUDE.md

Project rules for Claude Code in this repository. Machine-specific instructions live in `CLAUDE.local.md` (git-ignored).

## Project

Personal portfolio of João Abreu: a static, bilingual (EN/PT) site with a sonar/radar visual theme and real GitHub data. Audience: recruiters arriving from GitHub and LinkedIn, so the essentials go on the first screen and the site must load fast and never stutter.

- **Stack:** Astro (static output), TypeScript (strict). Zero JavaScript by default; JS only in interactive islands.
- **Hosting:** own VM (AWS Lightsail, Ubuntu, nginx) behind Cloudflare, deployed by GitHub Actions (build + rsync over SSH) on every push to `main` and once a day.
- **Domain:** https://joaoabreu.dev

## Division of responsibilities

| Area | Who does the work | Claude's role |
|---|---|---|
| Front-end (Astro, layout, radar, sections, i18n, content, GitHub data script) | Claude | Writes the code and runs the build |
| Deploy and infrastructure (VM, SSH, firewall, nginx, DNS/Cloudflare, HTTPS, `deploy/`, `.github/workflows/deploy.yml`, Secrets) | João, by hand | **Guides only**: explains the concept, gives the next step, reviews and helps debug. Never writes these files nor runs commands on the VM for him |
| Back-end (Spring Boot API, V2) | João, by hand | Guides only, no ready-made code |
| Git and GitHub (branches, commits, messages, push, PR description and opening) | Claude, in every stage, including João's | Creates the branch, commits (including files João wrote), pushes and opens the PR |
| Review and merge | João | Claude **never merges or approves a PR** |

When a decision is needed, ask **one question at a time**.

## Project structure

```
src/
  content.config.ts         content collections and their schemas
  content/projects.yaml     language-neutral project data (repo, role, order, stack)
  content/projects/<locale>/<id>.md  project text per locale; the Markdown body is the case study
  assets/case-studies/      case study cover images (optimized by astro:assets)
  content/contacts.yaml     contact channels (https links only)
  content/about/<locale>.md about paragraphs and "in progress" list per locale
  content/stack.yaml        stack groups (names translated as stack.<id> in ui.ts)
  lib/activity.ts           contribution stats, year heatmap layout, recent repos (shared by build and browser)
  components/Heatmap.astro      year of contributions, one square per day
  components/RecentRepos.astro  recently pushed repos as cards or as the hero ticker
  lib/content.ts            merges and cross-checks content; fails the build if locales diverge
  lib/github-data.ts        endpoints, types and validators for GitHub/LeetCode data (shared by build and browser)
  lib/github.ts             reads and revalidates the snapshot at build time (null parts = no data, never invented)
  lib/radar-geometry.ts     contact position from days since push (shared by build and browser)
  data/github-snapshot.json written by scripts/github-snapshot.ts on every build (git-ignored)
  i18n/ui.ts                UI strings per locale; English defines the shape
  lib/radar.ts              projects → radar contacts (bearing spread evenly, distance = days since last push)
  lib/sonar-icons.ts        section icons as dot predicates on a 25 × 25 grid, with scatter offsets
  components/RadarScope.astro   CSS sweep scope; optional project blips
  components/SonarDisplay.astro sticky per-section display: screen slot + readout card ("SECTION 01 / 03")
  components/SonarIcon.astro    dot-matrix icon that assembles when its display is on
  scripts/sonar.ts          displays on/off by visibility, scopes pause off-screen, ping on click, card ↔ contact highlight
  scripts/scroll-fx.ts      progress bar, active nav link, reveal on scroll ([data-reveal], [data-split])
  scripts/github-live.ts    live GitHub data in the browser (30-min localStorage cache); updates counters and radar
  layouts/Base.astro        <html lang>, hreflang, Open Graph, palette tokens, fonts, full-width header nav
  pages/index.astro         redirects / to /en/ (static fallback)
  pages/404.astro           bilingual 404 (noindex); nginx should serve it with `error_page 404 /404.html`
  pages/[locale]/           pages, generated for every locale
  pages/[locale]/projects/[id].astro  case study page for each project with `caseStudy: true`
scripts/github-snapshot.ts  build-time fetch of profile, repos, contributions and LeetCode; each source keeps
                            its previous value if it fails (run by `npm run build`; uses GITHUB_TOKEN if set)
scripts/og-images.ts        `npm run og`: renders public/og/og-<locale>.png (1200 × 630) with headless Chrome;
                            rerun after changing the name, role or position strings
public/                     static files copied as-is (robots.txt points to the sitemap from @astrojs/sitemap)
  cv/joao-abreu-cv-<locale>.pdf  résumé; the link appears only when the file exists
```

```
deploy/
  README.md                 how the server is built (Lightsail, nginx, Cloudflare) and how to rebuild it
  nginx/portfolio.conf      nginx site; copied to /etc/nginx/sites-available/portfolio with scp
```

Planned: `.github/workflows/` (stage 3).

## Internationalization

- Locales: `en` (default) and `pt`, Astro native i18n with `prefixDefaultLocale: true`, so routes are `/en/...` and `/pt/...`.
- Every user-visible string comes from the i18n/content files, never hard-coded in components.
- English defines the structure; Portuguese is typed against it, so `npm run build` (which runs `astro check`) fails if they diverge.
- Each page sets `<html lang>`, `hreflang` alternates (plus `x-default`) and the Open Graph locale.
- Format dates and numbers with the active locale (`en-US` / `pt-BR`).
- The language switch keeps the user on the same page.

## Performance rules

- Animate only `transform` and `opacity`.
- The radar is a light `<canvas>` or SVG, paused when off-screen.
- Every animation respects `prefers-reduced-motion`.
- Never show fake data: live GitHub data falls back to the snapshot generated at build time.
- Validate and sanitize external data (https links only, `YYYY-MM-DD` dates, non-negative numbers, escaped HTML); wrap every `localStorage` access in `try/catch`.

## Git workflow

- Everything merged into `main` goes live, so `main` must always be deployable. **No direct commits to `main`.**
- One branch per stage, prefixed: `chore/`, `ci/`, `feat/`, `fix/`, `docs/`, `perf/`. Before starting a stage, `git pull` on `main` and branch from it.
- Small, frequent commits in English using Conventional Commits (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `perf:`, `refactor:`).
- Branch, file and folder names in English.
- PR description in English: what changed, why, how to test, and the definition-of-done checklist.
- Work happens on two machines: `git pull` at the start of a session; commit and push everything at the end.

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
