# Portfolio

![Astro 7](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

My personal portfolio: sonar-themed, bilingual (EN/PT) and alive with real GitHub data. Built with Astro.

> 🚧 Under construction. It will live at **https://joaoabreu.dev**.

## Why this project

A portfolio is the first thing a recruiter opens, so it has to show the essentials on the first screen and load instantly. It is also meant to be a project in itself: a static site served from my own VM with nginx, Cloudflare and an automated deploy pipeline that I set up by hand, and that the site itself explains.

## Features

- **Bilingual** — English by default and Portuguese, with native Astro i18n routing (`/en/`, `/pt/`), `hreflang` and per-language Open Graph tags.
- **Type-checked translations** — English defines the shape of every string; the build fails if the Portuguese version diverges.
- **Static and fast** — plain HTML by default, with JavaScript only where something is interactive.

Planned: a sonar/radar visual theme, live GitHub activity with a build-time snapshot as fallback, project case studies and a section showing how each commit reaches the browser.

## Tech stack

| Layer | Technologies |
|---|---|
| Front-end | Astro 7, TypeScript (strict) |
| Infrastructure (planned) | Oracle Cloud VM (Ubuntu), nginx, Cloudflare, GitHub Actions |

## Running locally

Requires [Node.js](https://nodejs.org/) 22.22 or newer.

```bash
git clone https://github.com/jg-abreu/portfolio.git
cd portfolio
npm install
npm run dev
```

Then open **http://localhost:4321** (it redirects to `/en/`).

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server |
| `npm run build` | Type-checks (`astro check`) and builds the static site into `dist/` |
| `npm run preview` | Serves the built site locally |

## Project structure

```
src/
  i18n/ui.ts          UI strings per language
  layouts/Base.astro  shared <head> (lang, hreflang, Open Graph) and language switch
  pages/              routes; [locale]/ is generated for each language
public/               static files
```

## Built with Claude Code

The front-end is written with [Claude Code](https://claude.com/claude-code); the rules it follows are public in [`CLAUDE.md`](CLAUDE.md). Infrastructure and deploy are done by hand.

## License

Released under the [MIT License](LICENSE).

## Author

**João Abreu** — back-end developer and Computer Science student in Rio de Janeiro, Brazil.

[GitHub](https://github.com/jg-abreu) · [LinkedIn](https://www.linkedin.com/in/jo%C3%A3o-abreuuu) · jgabreudev@gmail.com
