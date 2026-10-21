# CLAUDE.md

Project rules for Claude Code in this repository. Machine-specific instructions live in `CLAUDE.local.md` (git-ignored).

## Project

Personal portfolio of João Abreu: a static, bilingual (EN/PT) site with a sonar/radar visual theme and real GitHub data. Audience: recruiters arriving from GitHub and LinkedIn, so the essentials go on the first screen and the site must load fast and never stutter.

- **Stack:** Astro (static output), TypeScript (strict). Zero JavaScript by default; JS only in interactive islands.
- **Hosting:** own VM (Ubuntu, nginx) behind Cloudflare, deployed by GitHub Actions (build + rsync over SSH) on every push to `main` and once a day.
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
  content/projects/<locale>/<id>.md  project text per locale; body reserved for case studies
  content/contacts.yaml     contact channels (https links only)
  lib/content.ts            merges and cross-checks content; fails the build if locales diverge
  i18n/ui.ts                UI strings per locale; English defines the shape
  components/RadarPanel.astro  left-column radar scope (static until stage 6)
  layouts/Base.astro        <html lang>, hreflang, Open Graph, palette tokens, fonts, two-column shell, header nav
  pages/index.astro         redirects / to /en/ (static fallback)
  pages/[locale]/           pages, generated for every locale
public/                     static files copied as-is
  cv/joao-abreu-cv-<locale>.pdf  résumé; the link appears only when the file exists
```

Planned: `deploy/` and `.github/workflows/` (written by João).

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
