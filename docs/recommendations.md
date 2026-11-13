# Recommendations

The V2 public catalogue has static EN/PT routes at `/en/recommendations/` and `/pt/recommendations/`. It groups selected recommendations into books, courses, videos, setup and tools. Empty categories are omitted. Personal descriptions are plain text, escaped by Astro; videos are links without embedded players.

## Build source

`npm run recommendations` reads `RECOMMENDATIONS_API_URL`. An unconfigured source produces an empty catalogue. A configured source must respond successfully: an outage, invalid translation, duplicate identifier, unsafe link or invalid image fails the build and preserves the previous JSON snapshot.

The API contract is schema version 1 with a `recommendations` array. Each publication has `recommendationId`, UUID `revision`, nonnegative `draftVersion`, and `data` containing `slug`, `category`, `imageKey`, optional HTTPS `url` (empty string when absent), `displayOrder`, and `en`/`pt` copies. Each copy requires `title`, personal `description` and `imageAlt`. The catalogue is limited to 500 items.

Images use SHA-256 content keys ending in `.png`. The build downloads only `/api/recommendation-images/{key}` from the configured API origin, rejects redirects, enforces an 8 MiB limit and verifies the PNG signature and SHA-256. Astro generates optimized local assets. Public visitors make no recommendation API requests. Generated images and the snapshot are Git-ignored.

`/recommendation-publications.json` records the publication IDs, revisions and draft versions included in the static build. It does not trigger a deployment.

## Current stage

### Approved book-cover search

João approved Google Books on 2026-11-13. In the admin, entering a book title and choosing **Search covers** will list available covers alongside title, author and edition information. João selects the correct edition before the cover is attached to the draft. Manual upload remains available when no suitable result exists. Gemini integration is deferred.

This lookup belongs only in the authenticated admin. It must not add runtime requests to public pages or automatically publish a result. The backend must validate the selected provider result and image before importing it through the same image storage pipeline as manual uploads. Do not accept an arbitrary remote image URL from the browser. Preserve provider attribution and links required by the applicable Google Books terms; verify those requirements and available quota before implementing the integration.

Reference: https://developers.google.com/books/docs/v1/using

The static page, source validation, image download and build manifest are implemented. The sibling `portfolio-api` repository now implements draft persistence, separate selected copies and private image upload. The admin editor and Google Books search remain pending. The page is not yet linked in the main navigation. No personal recommendations have been invented or seeded; synthetic fixtures exist only for tests.

Backend implementation must preserve separate draft and selected-publication copies. Saving or archiving a draft must not change its selected public copy. Image files belong outside the database, and unpublished uploads must remain private. Production storage and deployment remain separate infrastructure steps.

## Validation

`node --test scripts/recommendations.test.ts` checks source and publication validation, unsafe URLs, image paths, hash verification and response bounds. The existing static-build integration test additionally verifies both recommendation locales, optimized local images, escaped personal text, the publication manifest and snapshot preservation after an API failure.
