# Dreadwood invite-mint service

Tiny Cloudflare Worker. The game's **Invite friends on Discord** button POSTs here; the Worker uses a bot
(token stays server-side) to create a unique invite into the shared `#looking-for-game` channel
(4 uses, 24 h) and returns it. GitHub Pages can't hold secrets, so this lives beside the site and deploys via Actions.

## API
`POST /api/discord-invite` (body optional, e.g. `{"build":"20"}`)
- 200 `{ "ok": true, "url": "https://discord.gg/abc123", "code": "abc123", "expires_at": "ISO-8601", "max_uses": 4 }`
- 429 `{ ok:false, error:"rate limited" }` (3/min per IP) · 503 not configured · 502 Discord error
`GET /health` → `{ ok:true }`

## One-time setup (Adam)
1. **Discord server**: create one (or use yours) and a text channel `#looking-for-game`. Settings → Advanced → Developer Mode on; right-click the channel → *Copy Channel ID* → that's `CHANNEL_ID`.
2. **Bot**: https://discord.com/developers/applications → *New Application* "Dreadwood Invites" → *Bot* → *Reset Token* → copy (`BOT_TOKEN`, shown once). No privileged intents needed.
3. **Add bot to server**: *OAuth2 → URL Generator* → scope `bot`, permission **Create Instant Invite** (value `1`) → open the URL, pick the server. Equivalent: `https://discord.com/oauth2/authorize?client_id=<APPLICATION_ID>&scope=bot&permissions=1`.
4. **Cloudflare** (free): sign up, note **Account ID**, create an API token with template *Edit Cloudflare Workers*.
5. **GitHub secrets** on `playdreadwood/playtest` (Settings → Secrets and variables → Actions):
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`.
6. Run the **Deploy invite worker** action. URL will be `https://dreadwood-invite.<subdomain>.workers.dev`; put that in the game's `DwDiscordInvite.INVITE_API_BASE` (or `user://discord.cfg`, or env `DW_INVITE_API`).

Local test: `cp .dev.vars.example .dev.vars` (fill in), `npx wrangler dev`, `curl -X POST localhost:8787/api/discord-invite`.

Fallback (no Cloudflare): the same handler logic runs as a ~30-line Node script on Adam's PC behind a tunnel, but then invites only work while the PC is on.
