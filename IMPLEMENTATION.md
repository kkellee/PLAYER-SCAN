# PLAYER SCAN — current implementation

Frontend: GitHub Pages. Active free mode: browser directly calls the public OpenDota API with CORS, without keys or credentials. The Cloudflare Workers + D1 backend at https://player-scan.keen-krill-5922.chatgpt.site is retained for future server integration but is NOT used by the current report page.

## Free browser mode

`dist/browser-scan.mjs` performs the same 20-match analysis locally. IndexedDB stores reports for 30 minutes, profiles for one hour, recent history for ten minutes, parsed matches for 30 days, unparsed matches for 15 minutes and hero names for seven days. The cache is specific to this browser and origin, not shared between visitors. Expired entries are pruned; at most 300 recent persistent entries are kept after cleanup. Storage errors fall back to in-memory cache for the current page.

Web Locks serializes scans across tabs where supported. New API calls are spaced at least 1.6 seconds apart, with a conservative 2,000-call daily browser cap. OpenDota additionally enforces its limits by public IP, so users behind a shared network/VPN can still receive 429. A 429 stops requests and saves a cooldown; daily limits defer until the next UTC day. There is no automatic IP rotation, proxy fallback, header spoofing, or immediate retry loop. Earlier match downloads survive an interrupted scan. Cached reports do not call the provider.

Paid keys must never be added to this browser module. A future paid configuration requires moving requests back to the server and testing the server quota separately.

## Implemented functionality

Numeric Dota account IDs, SteamID64, SteamID2, SteamID3 and numeric Steam profile links. Latest 20 matches from OpenDota; cached match details; parsed replay fields when available; seven possible outcomes including insufficient evidence. Rank-matched comparisons and a full movement trace are NOT implemented. Hero benchmarks are labeled accordingly. Verdict thresholds are provisional, transparent heuristics, not a calibrated classifier or evidence of intentional griefing.

Steam vanity URL resolution requires STEAM_API_KEY. STRATZ enrichment requires STRATZ_API_TOKEN; its optional GraphQL request has not been verified with a real token. Dotabuff is linked for independent inspection, not scraped. No report count or hidden matchmaking-pool information is claimed. No secrets belong in GitHub or client assets.

## Retained server implementation (not active in free mode)

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

## Free-tier diagnosis (2026-10-18)

No paid plan is enabled. OpenDota advertises 3,000 calls/day and 60/minute. Direct requests from the development computer succeed, while the retained Cloudflare server receives upstream HTTP 429. OpenDota source identifies unauthenticated callers by CF-Connecting-IP, and Cloudflare documents a shared address for cross-zone Worker subrequests. This is the likely cause, not a confirmed diagnostic from response headers on our worker. The active browser mode uses OpenDota's supported CORS access directly; it does not retry through another source after a limit.

Additional tests: eight browser-scanner unit tests cover request spacing, zero-request cached revisits, match reuse, minute/day cooldowns, interrupted download resumption, unavailable matches, validation and cancellation. Fifteen unit tests total pass. Large-scale production capacity remains unverified.
