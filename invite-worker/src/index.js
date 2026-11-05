// Dreadwood invite-mint service (Cloudflare Worker). Secrets: BOT_TOKEN, CHANNEL_ID (never in git).
// POST /api/discord-invite -> { ok:true, url, code, expires_at, max_uses } | { ok:false, error }
const RATE = { windowMs: 60_000, max: 3 };   // per IP, per isolate (best-effort; add KV/Rate Limiting binding for strict)
const hits = new Map();
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });

function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  if (arr.length >= RATE.max) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr); return false;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/health") return json({ ok: true });
    if (url.pathname !== "/api/discord-invite") return json({ ok: false, error: "not found" }, 404);
    if (req.method !== "POST") return json({ ok: false, error: "use POST" }, 405);
    if (!env.BOT_TOKEN || !env.CHANNEL_ID) return json({ ok: false, error: "Discord invites are coming soon." }, 503);
    if (limited(req.headers.get("CF-Connecting-IP") || "unknown")) return json({ ok: false, error: "rate limited" }, 429);
    const maxAge = Number(env.MAX_AGE || 86400), maxUses = Number(env.MAX_USES || 4);
    const r = await fetch(`https://discord.com/api/v10/channels/${env.CHANNEL_ID}/invites`, {
      method: "POST",
      headers: { Authorization: `Bot ${env.BOT_TOKEN}`, "Content-Type": "application/json", "X-Audit-Log-Reason": "Dreadwood in-game host invite" },
      body: JSON.stringify({ max_age: maxAge, max_uses: maxUses, unique: true }),
    });
    if (!r.ok) return json({ ok: false, error: `Discord error ${r.status}` }, 502);
    const inv = await r.json();
    return json({ ok: true, url: `https://discord.gg/${inv.code}`, code: inv.code, max_uses: maxUses,
      expires_at: inv.expires_at || new Date(Date.now() + maxAge * 1000).toISOString() });
  },
};
