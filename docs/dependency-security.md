# Dependency security

## Current evidence — 2026-11-13

`npm audit --json` completed successfully against the npm registry for the installed frontend lockfile: zero known vulnerabilities at all severities, 346 dependencies reported. This is a point-in-time dependency advisory check, not a source-code audit, Java dependency scan or guarantee against unknown vulnerabilities. No dependencies were changed by this check.

The targeted source inspection found the private admin rendering text with DOM text APIs; Markdown uses a tag allowlist, escaped text/attributes, disabled raw HTML and validated HTTPS links. Theme and public-data localStorage accesses are guarded. This was a targeted inspection, not an exhaustive security certification.

## Prepared update monitoring

`.github/dependabot.yml` prepares weekly npm and GitHub Actions version checks. Minor/patch npm updates are grouped, major updates remain separate, and open version-update PR limits are 3 for npm and 2 for Actions. There is no automatic merge. Version PRs explicitly target `feat/v2` during development.

The configuration currently exists only on `feat/v2`. GitHub reads this file from the default branch, so no active monitoring or successful Dependabot run is claimed. Do not copy it to `main` during development to activate it. At the authorized joint release, review the target branch for ongoing maintenance and verify the first actual run and PR destinations.

`target-branch` customizations concern version updates; Dependabot security-update PRs use the default branch and require their own repository settings. Those settings have not been changed. The API now also has weekly Maven monitoring prepared on its `feat/v2` (`73b1487`), with the same inactive-until-default-branch limitation. Its YAML and development target were validated; no Java advisory scan or dependency update was performed. CodeQL/source scanning, activation and actual GitHub scan results remain pending.

References: [configuration location](https://github.com/github/docs/blob/main/content/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file.md), [options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference), [version versus security update branches](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customizing-dependabot-prs).

## Maven remediation and CodeQL results — 2026-11-13

The API's resolved dependency check queried 206 distinct Maven name/version pairs in OSV. It found Guava 33.4.0-android, pulled by the Gemini SDK authentication dependency. API 6f2e960 manages patched 33.7.2-android; the regenerated tree confirmed it, all 133 API tests passed and a second OSV query returned zero matching advisories. Build plugins, JDK, OS/container layers, reachability and unknown vulnerabilities are outside this check. Details and the repeat command are in portfolio-api/docs/dependency-security.md.

CodeQL workflows now run on V2 pushes/PRs only, with pinned official actions and no deploy steps/application secrets. Both repositories were public and default setup was not configured before these workflows. No main or production workflow changed.

The [initial frontend run](https://github.com/jg-abreu/portfolio/actions/runs/43508376240) reported three flows. Book/local image URL parameters now receive explicit component encoding after strict validation. Snapshot loading reads once and handles missing files without a separate existence check. All 64 frontend tests and the 29-page build/check passed; the network-enabled build refreshed public sources successfully. The [final run](https://github.com/jg-abreu/portfolio/actions/runs/43509029456) on ae2bfef succeeded: Actions had zero results and JavaScript/TypeScript retained one expected flow.

The remaining js/file-access-to-http finding was reviewed and dismissed as a false positive with rationale in [alert 2](https://github.com/jg-abreu/portfolio/security/code-scanning/2). Tracked public YAML supplies regex-limited repository names; the HTTPS GitHub API host and owner are fixed. Fetching public roots is intentional; arbitrary file contents, secrets and destinations are not submitted. The final branch open-alert query was empty. The raw JavaScript analysis did not report zero results.

Java initially flagged the image path. Existing hash validation remains; API 470dad6 adds normalized directory/direct-parent checks. Four image tests and the backup/restore test passed. Its [final CodeQL run](https://github.com/jg-abreu/portfolio-api/actions/runs/43509166794) succeeded with zero Java results. These are commit-specific analyses, not certification of all Astro templates, business rules or deployment. Maintenance/release triggers still need review.
