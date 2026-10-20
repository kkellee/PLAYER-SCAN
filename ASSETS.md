# Dota assets in replay reports

Hero and item artwork is owned by Valve and loaded from its Steam CDN:
`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/`.
No AI-generated item, hero or map artwork is used in replay visualizations.

The compact `dist/dota-assets.mjs` catalogue contains names, IDs and image paths
from [odota/dotaconstants](https://github.com/odota/dotaconstants),
retrieved 2026-10-20. Metadata may need updating after Dota patches.

Map backgrounds are served from the
[OpenDota map assets](https://github.com/odota/web/tree/master/public/assets/images/dota2/map).
The selected background version is displayed below each map; the background
may lag the match patch. Coordinates use x − 64 and 191 − y, following the
OpenDota map coordinate system. This is lane-presence data, not a full route.

Gold and experience charts contain recorded values only. Missing samples create
gaps. Team XP is shown only when present in the stored match. Older cached
reports can lack that series; existing caches are not discarded for this
presentation update. Personal gold is cumulative income, not net worth.
No win-probability model or fabricated replay events are displayed.

UI checks for this update used real match 9052318151 and automated tests.
Local test fixtures and the preview server are intentionally not published.

## Detailed replay panels

`dist/dota-abilities.mjs` is a trimmed ability-name/image catalogue from
`odota/dotaconstants/build/abilities.json`, retrieved 2026-10-20.
Rune IDs/names and rune artwork follow `odota/web/src/lang/en-US.json` and
`odota/web/public/assets/images/dota2/runes/`. Images remain game assets.
The secondary Launch Snowball action uses the parent Snowball artwork;
missing artwork leaves a readable name rather than an invented icon.

Damage percentages use the sum of the displayed source breakdown, including
collapsed rows. Ordinary/unspecified attacks are not labelled as a specific
damage type. Cast counts do not imply hits or good timing. Ward maps show
installation coordinates, not simultaneous vision or successful detection.
Exact death events are shown only when supplied by the enrichment response;
kill/rune/buyback logs are merged chronologically without inferred timestamps.
