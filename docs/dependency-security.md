# Dependency security

## Current evidence — 2026-11-13

`npm audit --json` completed successfully against the npm registry for the installed frontend lockfile: zero known vulnerabilities at all severities, 346 dependencies reported. This is a point-in-time dependency advisory check, not a source-code audit, Java dependency scan or guarantee against unknown vulnerabilities. No dependencies were changed by this check.

The targeted source inspection found the private admin rendering text with DOM text APIs; Markdown uses a tag allowlist, escaped text/attributes, disabled raw HTML and validated HTTPS links. Theme and public-data localStorage accesses are guarded. This was a targeted inspection, not an exhaustive security certification.

## Prepared update monitoring

`.github/dependabot.yml` prepares weekly npm and GitHub Actions version checks. Minor/patch npm updates are grouped, major updates remain separate, and open version-update PR limits are 3 for npm and 2 for Actions. There is no automatic merge. Version PRs explicitly target `feat/v2` during development.

The configuration currently exists only on `feat/v2`. GitHub reads this file from the default branch, so no active monitoring or successful Dependabot run is claimed. Do not copy it to `main` during development to activate it. At the authorized joint release, review the target branch for ongoing maintenance and verify the first actual run and PR destinations.

`target-branch` customizations concern version updates; Dependabot security-update PRs use the default branch and require their own repository settings. Those settings have not been changed. The API now also has weekly Maven monitoring prepared on its `feat/v2` (`73b1487`), with the same inactive-until-default-branch limitation. Its YAML and development target were validated; no Java advisory scan or dependency update was performed. CodeQL/source scanning, activation and actual GitHub scan results remain pending.

References: [configuration location](https://github.com/github/docs/blob/main/content/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file.md), [options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference), [version versus security update branches](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customizing-dependabot-prs).
