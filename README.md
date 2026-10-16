# DREADWOOD Playtest Feedback

Live: https://playdreadwood.github.io/playtest/ · Host log: `/host/` · Table cards (print): `/qr/`

Mobile-first static site for DREADWOOD's first public playtest (Fri Oct 30, 2026, Potion Portal, St. Pete). No build step, no tracking, self-hosted Barlow fonts.

| Page | What it is |
|---|---|
| `/` | Player survey (~60 s, 5 required taps). `?g=2` prefills the game number (the old `?t=` table param is ignored). Ends on a thank-you screen that says whether the answer is saved on the phone or received. |
| `/host/` | Game log for Adam and the assistant: game number, tier, players, layout, seats clockwise with faction, winner, how each player went out, rounds, end condition, margin, once-per-game cards, first-timers/returning, teaching time, ticks (disputes, confusion, kingmaking, runaway, broken combo, stall), house rules, notes. Draft autosaves. Not linked anywhere and `noindex`. |
| `/qr/` | One A6 card design with a single QR (`qr/survey.svg`) to the live site; choose how many identical copies to print. No table labels. |

## How submissions are stored

Every submission is written to the device's `localStorage` first (so offline or flaky bar signal never loses it), then sent. A queued item retries on page load, when the phone comes back online, and every 15 s. The thank-you screen shows "Saved on this phone" until the send succeeds, then "Received". Each record has a unique `id`. If a player taps "Wait! I had more thoughts." on the thank-you screen and resubmits, the same `id` is sent again with `update:true`. **When aggregating, keep the LAST row per `id`.**

Two sinks (set in `assets/config.js`; a send succeeds if either accepts):

1. **Google Sheet via Apps Script** (permanent). `apps-script/Code.gs`. Tabs `surveys`, `games`, `seats`. The exec URL is set as `sheet:` in `config.js` (public by design).
2. **ntfy.sh relay** (interim, no account). The topic is in `config.js`. ntfy keeps messages only about 12 hours, so pull often. Anyone who reads `config.js` could read or post to the topic, so treat it as a stopgap.

### Setting up the Sheet sink (about 3 minutes, Adam's Google account)
1. Create a Google Sheet named "DREADWOOD Playtest Results".
2. Extensions → Apps Script. Replace the contents with `apps-script/Code.gs`. Change `READ_KEY` to a private word.
3. Deploy → New deployment → Web app. Execute as: **Me**. Who has access: **Anyone**. Authorize when asked.
4. Copy the Web app URL (ends in `/exec`) and send it to Grok Bot (or paste it into `assets/config.js` as `sheet:` and push). Browser submits are fire-and-forget (`no-cors`), so test with the `/host/` page and check that a row appears.

## Reading the results back
- **Sheet:** open it, or download as CSV/XLSX. Or `GET <exec URL>?key=<READ_KEY>` returns all three tabs as JSON.
- **Sheet to file:** `tools/pull_sheet.sh` saves all tabs to `results/sheet.json` (read key from `DW_READ_KEY` or a gitignored `.secrets` file; never commit it).
- **Relay:** `tools/pull.sh` merges the relay's messages into `results/relay.jsonl`, de-duplicated by `id`. Run it at least every few hours on the night, e.g. each hour from 7 PM.
- **Device backup:** `/host/` → "This device" → Download JSON/CSV exports every record submitted from that phone or tablet.

## Spam protection
Hidden honeypot field (bots get a fake thank-you and nothing is stored), a minimum fill time, email format check, and field length caps. The site has no secrets. Keep `/host/` unlinked.

## Editing
Layout names and canon rosters are in `assets/common.js`. Palette is in `assets/app.css` (from the manual redesign direction). Logo is the untouched DREADWOOD logo, resized.

## Thank-you vampire
After each survey the thank-you screen shows one of the 8 characters (`assets/vamps/`, transparent WebP cutouts). Each device gets a random `device_id` and a shuffled order in `localStorage` (`dw_device_v1`); the index advances per survey, all 8 show before reshuffling, and the first of a new shuffle never equals the last one shown. Every record (survey and game) carries `device_id`. Add it as a column in the Sheet (`Code.gs` COLS) if you want it there.

## Survey fields (record schema)
`type:"survey"`, `id`, `ts`, `device_id`, `game`, `faction`, `fun`, `clarity`, `play_again`, `balance`, `balance_note`, `tier`, `players`, `layout`, `seat`, `result`, `first_time`, `favorite`, `least_favorite`, `confused`, `change`, `heard`, `interests` (array, e.g. ["Miniatures wargames","Card games"]), `favorite_game`, `handle`, `email`, `ok_followup`, `ok_credit`, `credit_name`, `seconds`, `ua`. In the Sheet, `interests` is stored as JSON text. `tools/pull.sh` copies records verbatim, so new fields need no change there. If you already created the Sheet before this update, delete the `surveys` tab (or add `interests` and `favorite_game` columns before `handle`) so headers match.

## Wording notes (player-facing)
The balance question reads "Did everyone have a fair shot?" with buttons "Yes, fair" / "Someone had an edge". Stored values are unchanged (`balance` = `Fair` or `Felt off`; free text in `balance_note`), so Sheet columns and old rows stay compatible. Likewise the interests chip "Video: role-playing games" still stores `Video: RPGs`. Keep labels plain; faction names and Beginner/Deadly/Immortal are left as is.

The optional accordions are titled "The match", "Your two cents" and "Who's talking"; the expand button reads "Help shape the game" and then "Done helping".

## Updates ("Wait! I had more thoughts.")
The thank-you screen can reopen the survey with every answer kept. A resend reuses the original `id`/`ts` and adds `update:true`; the thank-you shows the same vampire ("Added. Thanks.").
- **Sheet:** the current `apps-script/Code.gs` does an upsert (repeat id = update that row; games also replace their `seats` rows). It must be redeployed (Deploy > Manage deployments > edit > Version: New version > Deploy) for updates to land. **Until then the old script ignores repeat ids**, so the Sheet keeps the first submission and the extras are lost there (the relay still has them, last-wins, for about 12 h; the device history also keeps them).
- **Relay:** `tools/pull.sh` is last-wins per id.
- **Any other export:** keep the last row per `id`.

The game-number question reads "How many games of Dreadwood have you played tonight? (Count this one.)". `game` stores 1, 2, 3 or 4+ (this game included); `?g=` still prefills it.

The player survey no longer asks for difficulty. `tier` stays in the schema/Sheet as an empty column for surveys; the host log still records tier per game, which is the source of truth.
