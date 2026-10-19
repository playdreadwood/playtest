#!/usr/bin/env python3
"""Regenerate every tier section of how-to-play/index.html from the site-side concise copy in
tools/site_copy/ (canon content/ is not read or changed). Changes vs canon: CONCISE_CHANGES.md.
    python3 tools/build_rules_web.py"""
import re, html as H, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "tools/site_copy") + "/"
rd = lambda f: open(S + f).read().strip()
def inl(t):
    if t.lstrip().startswith("<"): return t
    t = H.escape(t, quote=False)
    t = re.sub(r"\[(Deadly\+|Immortal)\]\s*", lambda m: f'<span class="tt {m.group(1)[:3].lower()}">{m.group(1)}</span> ', t)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
def md(text):
    out, lst = [], None
    def close():
        nonlocal lst
        if lst: out.append(f"</{lst}>"); lst = None
        if out and out[-1].startswith(("<tr", "<table class=\"md")): out.append("</table>")
    for st in [l.strip() for l in text.splitlines()]:
        if not st: close(); continue
        if st.startswith("## "): close(); out.append(f"<h3>{inl(st[3:])}</h3>"); continue
        if st.startswith("!D"):
            close(); n, alt = st[1:].split(" ", 1)
            out.append(f'<figure class="fig"><img src="../assets/diagrams/{n}.webp" alt="{H.escape(alt)}" loading="lazy"></figure>'); continue
        if st.startswith("<"): close(); out.append(st); continue
        if st.startswith("|"):
            if lst: out.append(f"</{lst}>"); lst = None
            cells = [c.strip() for c in st.strip("|").split("|")]
            if set("".join(cells)) <= set("-: "): continue
            if not (out and out[-1].startswith(("<tr", "<table class=\"md"))):
                out.append(f'<table class="md{" wide" if len(cells)==2 else ""}"><tr>' + "".join(f"<th>{inl(c)}</th>" for c in cells) + "</tr>"); continue
            out.append("<tr>" + "".join(f'<td{" class=n" if i and len(c) <= 12 else ""}>{inl(c)}</td>' for i, c in enumerate(cells)) + "</tr>"); continue
        m = re.match(r"(- |\d+\. )(.*)", st)
        if m:
            kind = "ol" if m.group(1)[0].isdigit() else "ul"
            if lst != kind: close(); out.append(f"<{kind}>"); lst = kind
            out.append(f"<li>{inl(m.group(2))}</li>"); continue
        close(); out.append(f"<p>{inl(st)}</p>")
    close(); return "\n".join(out)
def cards(tier):
    groups = re.split(r"^# ", rd("factions.md"), flags=re.M)[1:]
    jump, g = "", ""
    for grp in groups:
        head, body = grp.split("\n", 1); name, col, k = [x.strip() for x in head.split("|")]
        ab = ""
        for a in re.split(r"^### ", body, flags=re.M)[1:]:
            h, b = a.split("\n", 1); n, ty = [x.strip() for x in h.split("|")]
            ab += f'<div class="acard"{" style=\"--fc:var(--parch)\"" if k=="silver" else ""}><h4>{n}</h4><div class="ty">{ty}</div>{md(b)}</div>'
        if k == "silver": g += ab; continue
        jump += f'<a href="#{tier}/cards" data-f="{k}" style="--fc:{col}" onclick="document.getElementById(\'{tier}-f-{k}\').scrollIntoView();return false">{name}</a>'
        g += f'<div class="fgroup jumpto" id="{tier}-f-{k}" style="--fc:{col}"><h3>{name}</h3><div class="art"><img src="../assets/art/{k}.webp" alt="" loading="lazy"></div>{ab}</div>'
    return f'<div class="refblock" id="{tier}-cards"><h2>Faction cards</h2><div class="fjump">{jump}</div>{g}</div>'
def draft(tier):
    pool = "".join(f'<div class="hz"><img src="../assets/art/{a}.webp" alt=""><div><h4>{n}<small>{c}</small></h4><p>{inl(e)}</p></div></div>'
                   for a, n, c, e in [[x.strip() for x in l.split("|")] for l in rd("pool.md").splitlines()])
    return f'''<div class="refblock qref" id="{tier}-draft"><h2>Hazard Draft</h2>{md(rd("draft.md"))}
     <h3 id="{tier}-pool" class="jumpto">The hazard pool</h3><div class="pool">{pool}</div><p>Used hazards go back to the pool.</p></div>'''
TITLE = {"beginner": "Beginner", "deadly": "Deadly", "immortal": "Immortal"}
def tier(t):
    h = f'<div id="{t}-rules" class="jumpto"><h2>{TITLE[t]}</h2>{md(rd(f"rules_{t}.md"))}</div>'
    h += f'<div class="refblock qref" id="{t}-qr"><h2>Quick reference</h2>{md(rd(f"qref_{t}.md"))}</div>'
    if t != "beginner": h += cards(t)
    if t == "immortal": h += draft(t)
    return h
p = os.path.join(ROOT, "how-to-play/index.html"); s = open(p).read()
for t in TITLE:
    h = tier(t); assert not re.search(r"fac(ing|es) away|OPEN", h)
    s = re.sub(r'(<section class="panel tierpage hidden" id="%s">).*?(\n  </section>)' % t,
               lambda m: f"{m.group(1)}\n<!--GEN:{t}-->\n{h}\n<!--/GEN:{t}-->{m.group(2)}", s, flags=re.S)
open(p, "w").write(s); print("ok")
