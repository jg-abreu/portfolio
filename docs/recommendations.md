# Recommendations

The V2 public catalogue has static EN/PT routes at `/en/recommendations/` and `/pt/recommendations/`. It groups selected recommendations into books, courses, videos, setup and tools. Empty categories are omitted. Personal descriptions are plain text, escaped by Astro; videos are links without embedded players.

## Build source

`npm run recommendations` reads `RECOMMENDATIONS_API_URL`. An unconfigured source produces an empty catalogue. A configured source must respond successfully: an outage, invalid translation, duplicate identifier, unsafe link or invalid image fails the build and preserves the previous JSON snapshot.

The API contract is schema version 1 with a `recommendations` array. Each publication has `recommendationId`, UUID `revision`, nonnegative `draftVersion`, and `data` containing `slug`, `category`, `imageKey`, optional `googleBooksId`, optional HTTPS `url` (empty string when absent), `displayOrder`, and `en`/`pt` copies. Each copy requires `title`, personal `description` and `imageAlt`. The catalogue is limited to 500 items. A Google Books reference requires category `BOOKS` and an empty `imageKey`; otherwise a local image is required.

Uploaded images use SHA-256 content keys ending in `.png`. The build downloads only `/api/recommendation-images/{key}` from the configured API origin, rejects redirects, enforces an 8 MiB limit and verifies the PNG signature and SHA-256. Astro generates optimized local assets. Google Books covers remain at their original provider: the build keeps only the volume reference and emits a lazy-loaded image with attribution and a Google Books link. It does not download or optimize provider covers. Public visitors make no recommendation API requests, but referenced covers and the attribution graphic load from `books.google.com`. Generated local images and the snapshot are Git-ignored.

`/recommendation-publications.json` records the publication IDs, revisions and draft versions included in the static build. It does not trigger a deployment.

## Current stage

João confirmed on 2026-11-14 that the initial V2 release should keep the public catalogue empty; he will add his recommendations later. Existing synthetic book/upload exercises remain private test evidence and must not be promoted as his endorsements. Performance and accessibility with the future real covers must be checked when that content is added.

### Approved book-cover search

João approved Google Books on 2026-11-13. In the admin, entering a book title and choosing **Search covers** will list available covers alongside title, author and edition information. João selects the correct edition before the cover is attached to the draft. Manual upload remains available when no suitable result exists. Gemini integration is deferred.

The lookup runs only in the authenticated admin and never automatically publishes a result. `GET /api/admin/books?q=...` searches up to 12 editions; `POST /api/admin/books/{volumeId}/selection` verifies a selection with CSRF. The backend also rechecks an edition when selecting its public copy. Search order is preserved, results without covers cannot be selected, and transient provider metadata is rendered as plain text. Choosing a cover stores only the volume ID; personal titles and descriptions remain João's own input.

The approved implementation was adjusted after checking the provider terms: Google API terms section 5(e) restrict permanent copies and caching beyond permitted lifetimes. Provider covers are therefore referenced directly, with the official attribution graphic and a prominent link. Local uploads remain a separate option. URLs are constructed from validated volume IDs and a fixed Google Books origin; arbitrary remote image URLs are never accepted.

The API key remains server-side. Requests have bounded responses, timeouts, no redirect following and a one-second application-wide request interval. Missing configuration or provider failures show an unavailable message; quota/rate limits show a retry message. João created and configured his key in the Windows user environment. On 2026-11-13, a live check through the actual Java service returned 12 results for `Clean Code Robert Martin` and verified an edition titled `Clean Code` with a Google Books cover. The key was read only in memory and never printed or committed. Account quota and the complete browser selection/save flow remain pending review; no billing or paid service was enabled by the agent.

Reference: https://developers.google.com/books/docs/v1/using

Terms: https://developers.google.com/terms and https://developers.google.com/books/branding

### Local key setup

In Google Cloud, select or create the intended project, enable **Books API**, then create a standard API key under **APIs & Services → Credentials**. Restrict the key to **Books API**. This server-side integration must not use website/referrer restrictions. Do not enable billing or start a paid trial as part of this setup; stop for review if the console requests either. Review the project's Books API quota before using it.

João chose the Windows **user environment variable** `GOOGLE_BOOKS_API_KEY`. IntelliJ must inherit system environment variables and be restarted after changing the Windows value; avoid a duplicate overriding value in its run configuration. Never paste the key in chat, notes, screenshots or source files. The ignored local review launcher reads the Windows user environment directly, so an older parent process does not need to be restarted to pick up this key. Restarting the API is required after configuration.

The static page, source validation, image download and build manifest are implemented. The sibling `portfolio-api` repository implements draft persistence, separate selected copies, private image upload and Google Books search. The EN/PT admin editor is available at `/{locale}/admin/recommendations/`, linked from the existing project/inbox workspace. Live search, edition verification and browser selection/save/reopen/archive passed with João's local key. The public page is linked in the main navigation and footer. No personal recommendations have been invented or seeded; the synthetic manual fixture remains archived in the isolated review database without a selected public copy.

The editor saves drafts, uploads covers, archives/restores items and selects/withdraws public copies. It displays selected versus built revisions and blocks publication changes while the form has unsaved edits. Opening another item or closing a dirty editor requires an explicit discard choice. Uploaded files remain unattached until the draft is saved.

Session expiry and logout clear private fields, image sources, lists and dialogs. A generation guard rejects responses arriving after logout, including delayed CSRF and manifest responses. Session checks run every 30 seconds while visible; cached navigation clears private state before revalidating. The shared request client invokes the transport without an object receiver, avoiding the browser's `Illegal invocation` error. This failure was reproduced in a regression test and the authenticated editor was verified in Chrome after the fix. PT/mobile and manual file upload review passed as recorded below.

Backend implementation must preserve separate draft and selected-publication copies. Saving or archiving a draft must not change its selected public copy. Image files belong outside the database, and unpublished uploads must remain private. Production storage and deployment remain separate infrastructure steps.

## Validation

Manual upload review, 2026-11-13: Chrome at 360 CSS px accepted a synthetic 1×1 PNG through the native file picker and authenticated upload endpoint. The Portuguese editor displayed the upload acknowledgment; saving bilingual synthetic text, reloading the page and reopening `synthetic-manual-cover-upload` preserved the image and both translations. The fixture was archived in the isolated review database without selecting a public copy. A subsequent public GET returned an empty catalogue. This checks upload and persistence, not the visual quality of a real cover; no deployment, real email or Gemini request occurred. No functional code changed in this review.

The Portuguese editor was visually reviewed at 360 px: header, single-column fields, search controls and wrapped publication actions remained within the viewport. Public navigation now includes seven sections, with `Picks` / `Indicações` as the compact active label and the complete localized name as its accessible label and footer text. The mobile pill allocates remaining width to the current section, truncating only its visible label on narrower screens. Chrome review confirmed the Portuguese public page, empty state and seven-link menu at 360 px. The static integration test verifies the current recommendation link and the matching other-language route.

Browser workflow update, 2026-11-13: the previously pending Google Books selection/save flow passed in Chrome. The real search displayed editions with author, publisher, date and covers, while disabling editions without covers. The 2008 Clean Code cover was selected and bilingual synthetic text saved in `synthetic-books-browser-test`. Reopening the draft through the API preserved the cover reference and both translations. The test draft was then archived with no selected public copy. A public GET confirmed an empty recommendations catalogue. This was a private integration test, not a personal recommendation or deployment.

`node --test scripts/recommendations.test.ts` checks source and publication validation, unsafe URLs, image paths, hash verification and response bounds. The existing static-build integration test additionally verifies both recommendation locales, optimized local images, escaped personal text, the publication manifest and snapshot preservation after an API failure.
