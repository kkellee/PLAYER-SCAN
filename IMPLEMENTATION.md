# PLAYER SCAN — current implementation

Frontend: GitHub Pages. Backend: https://player-scan.keen-krill-5922.chatgpt.site (Sites / Cloudflare Workers + D1).

## Implemented functionality

Numeric Dota account IDs, SteamID64, SteamID2, SteamID3 and numeric Steam profile links. Latest 20 matches from OpenDota; cached match details; parsed replay fields when available; seven possible outcomes including insufficient evidence. Rank-matched comparisons and a full movement trace are NOT implemented. Hero benchmarks are labeled accordingly. Verdict thresholds are provisional, transparent heuristics, not a calibrated classifier or evidence of intentional griefing.

Steam vanity URL resolution requires STEAM_API_KEY. STRATZ enrichment requires STRATZ_API_TOKEN; its optional GraphQL request has not been verified with a real token. Dotabuff is linked for independent inspection, not scraped. No report count or hidden matchmaking-pool information is claimed. No secrets belong in GitHub or client assets.

## Processing and scale

POST /api/scan starts/reuses an account job. GET /api/scan?id=ACCOUNT advances two match fetches under a D1 lease. Concurrent requests share the job. Jobs resume when polled; there is no continuously running background consumer. Raw compact matches are shared across profiles for 24 hours; reports last 30 minutes (5 minutes with partial errors). This limits duplicate upstream work. API requests have a 12-second timeout. Provider quota counters are atomic in D1. Default admission is 40 upstream calls/minute and 2,000/day; these are conservative application caps, not a statement of provider entitlement. Cached report requests remain available after the upstream cap.

5,000 new unique full scans/day can require approximately 110,000 source calls/day (20 matches + profile + history), before reuse. Purchase sufficient OpenDota capacity and adjust OPENDOTA_REQUESTS_PER_MINUTE and OPENDOTA_REQUESTS_PER_DAY only to the granted quota. Traffic bursts and parsing backlogs need staged production load tests and monitoring. 5,000 visitors is not 5,000 unique scans. This release is NOT certified for that many uncached daily scans.

No automated bulk replay parsing is triggered. Detailed panels use existing parsed replay fields. Missing parsing is shown honestly with a link to OpenDota. A full replay pipeline with coordinates and independently labeled decision errors is future work.

## Verification performed

- Seven unit tests: ID precision and validation, all verdict branches, missing data, Turbo exclusion, reduction correctness, 20-match cap.
- Real OpenDota integration: account 86745912, 20 matches, 20 detailed/parsed reports.
- Invalid IDs rejected; vanity links produce explicit 422 when Steam key is absent.
- Built server CORS preflight checked against GitHub Pages origin.
- Local cache load: 250 requests / 20 concurrent, zero errors, p95 around 324 ms. This is local cached-report throughput only, not production capacity certification.

## Source and deployment

backend/ in GitHub mirrors the Sites server source. Frontend deploys automatically through the existing Pages workflow. Backend changes must also be built and published through Sites; committing backend/ alone does not deploy the server. Keep dist/analysis.mjs and backend/lib/analysis.mjs synchronized. Run node --test tests/analysis.test.mjs and integration tests after changes.

## Free-tier deployment status (2026-10-18)

The project currently uses keyless OpenDota access. No paid plan is enabled. OpenDota advertises 3,000 calls/day and 60/minute; application caps remain conservatively below these limits. Direct requests from the development computer succeed, while the deployed server receives upstream HTTP 429. Public end-to-end scanning is therefore blocked; no working production scan or 5,000-visitor capacity is claimed. Diagnose with the provider/hosting before increasing traffic. Do not evade provider rate limits.
