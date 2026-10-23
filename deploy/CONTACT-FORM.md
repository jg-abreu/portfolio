# Contact form integration

`src/components/ContactForm.astro` provides the bilingual form UI. It currently prevents submission and keeps the submit button disabled. No field values are transmitted or stored. The direct mailto link remains available.

Fields: `name` (required, maximum 100 characters), `email` (required email, maximum 254 characters), and `message` (required, 10–5000 characters). These are UI limits; the back end must validate independently.

Before enabling delivery:

1. Agree the API endpoint, request/response contract and server validation with João. No endpoint is assumed by the current UI.
2. Implement the Spring Boot endpoint and email provider, keeping credentials on the server; add rate limits and spam protection.
3. Replace the current submit guard with the fetch integration. Handle sending, confirmed success, field errors, rate limiting and network/service failure in EN/PT. Keep typed fields on failure and reset only after confirmed success. Announce feedback accessibly and prevent duplicate submissions.
4. Allow the deployed API origin in Astro CSP `connect-src`; configure the API's CORS for the portfolio origins. The form uses JavaScript fetch, so a native form-action allowance is not needed unless that submission mechanism changes.
5. Test real delivery, rejected/oversized payloads, unavailable API and spam/rate-limit behavior before enabling the button and replacing the availability notice.

Backend implementation belongs to João. The UI does not currently claim messages were sent.
