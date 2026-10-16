# DREADWOOD Playtest Feedback

Live: https://playdreadwood.github.io/playtest/ · Host log: `/host/` · Table cards (print): `/qr/`

Mobile-first static site for DREADWOOD's first public playtest (Fri Oct 30, 2026, Potion Portal, St. Pete). No build step, no tracking, self-hosted Barlow fonts.

| Page | What it is |
|---|---|
| `/` | Player survey (~60 s, 5 required taps). `?t=3&g=2` prefills table and game. Ends on a thank-you screen that says whether the answer is saved on the phone or received. |
| `/host/` | Game log for Adam and the assistant: tier, players, layout, seats clockwise with faction, winner, how each player went out, rounds, end condition, margin, once-per-game cards, first-timers/returning, teaching time, ticks (disputes, confusion, kingmaking, runaway, broken combo, stall), house rules, notes. Draft autosaves. Not linked anywhere and `noindex`. |
| `/qr/` | A6 print cards, one per table 1–6 plus a spare, each with a pre-generated QR (`qr/table-N.svg`) to `…/playtest/?t=N`. |

## How submissions are stored

Every submission is written to the device's `localStorage` first (so offline or flaky bar signal never loses it), then sent. A queued item retries on page load, when the phone comes back online, and every 15 s. The thank-you screen shows "Saved on this phone" until the send succeeds, then "Received". Each record has a unique `id`, so duplicates are harmless; de-duplicate on `id`.

Two sinks (set in `assets/config.js`; a send succeeds if either accepts):

1. **Google Sheet via Apps Script** (permanent). `apps-script/Code.gs`. Tabs `surveys`, `games`, `seats`. Empty `sheet:` in `config.js` means it is not wired yet.
2. **ntfy.sh relay** (interim, no account). The topic is in `config.js`. ntfy keeps messages only about 12 hours, so pull often. Anyone who reads `config.js` could read or post to the topic, so treat it as a stopgap.

### Setting up the Sheet sink (about 3 minutes, Adam's Google account)
1. Create a Google Sheet named "DREADWOOD Playtest Results".
2. Extensions → Apps Script. Replace the contents with `apps-script/Code.gs`. Change `READ_KEY` to a private word.
3. Deploy → New deployment → Web app. Execute as: **Me**. Who has access: **Anyone**. Authorize when asked.
4. Copy the Web app URL (ends in `/exec`) and send it to Grok Bot (or paste it into `assets/config.js` as `sheet:` and push). Browser submits are fire-and-forget (`no-cors`), so test with the `/host/` page and check that a row appears.

## Reading the results back
- **Sheet:** open it, or download as CSV/XLSX. Or `GET <exec URL>?key=<READ_KEY>` returns all three tabs as JSON.
- **Relay:** `tools/pull.sh` merges the relay's messages into `results/relay.jsonl`, de-duplicated by `id`. Run it at least every few hours on the night, e.g. each hour from 7 PM.
- **Device backup:** `/host/` → "This device" → Download JSON/CSV exports every record submitted from that phone or tablet.

## Spam protection
Hidden honeypot field (bots get a fake thank-you and nothing is stored), a minimum fill time, email format check, and field length caps. The site has no secrets. Keep `/host/` unlinked.

## Editing
Layout names and canon rosters are in `assets/common.js`. Palette is in `assets/app.css` (from the manual redesign direction). Logo is the untouched DREADWOOD logo, resized.

## Thank-you vampire
After each survey the thank-you screen shows one of the 8 characters (`assets/vamps/`, transparent WebP cutouts). Each device gets a random `device_id` and a shuffled order in `localStorage` (`dw_device_v1`); the index advances per survey, all 8 show before reshuffling, and the first of a new shuffle never equals the last one shown. Every record (survey and game) carries `device_id`. Add it as a column in the Sheet (`Code.gs` COLS) if you want it there.
