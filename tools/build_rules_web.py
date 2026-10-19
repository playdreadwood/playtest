#!/usr/bin/env python3
"""Regenerate the mid-game reference blocks in how-to-play/index.html (between <!--GEN:tier--> markers)
from the Rules Keeper / Manual Maker content files. Run after the content changes:
    python3 tools/build_rules_web.py [content_dir]"""
import re, sys, html as H, os
C = (sys.argv[1] if len(sys.argv) > 1 else "/workspace/dreadwood-playtest-sheet/content").rstrip("/") + "/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUT = [" A thrown Tombstone lands facing away from the thrower."]       # removed by final ruling
def clean(s):
    for c in CUT: s = s.replace(c, "")
    return s
def inl(t):
    t = H.escape(t, quote=False)
    tag = lambda m: f'<span class="tt {m.group(1)[:3].lower()}">{m.group(1)}</span> '
    t = re.sub(r"\*\*\[(Deadly\+|Immortal)\]\*\*\s*", tag, t)
    t = re.sub(r"\*\*\[(Deadly\+|Immortal)\]\s+", lambda m: tag(m) + "**", t)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
def md(lines):
    out, lst = [], None
    def close():
        nonlocal lst
        if lst: out.append(f"</{lst}>"); lst = None
        if out and out[-1].startswith(("<tr", "<table")): out.append("</table>")
    for line in lines:
        st = line.strip()
        if not st: close(); continue
        if st.startswith("## "): close(); out.append(f"<h3>{inl(st[3:])}</h3>"); continue
        if st.startswith("|"):
            if lst: out.append(f"</{lst}>"); lst = None
            cells = [c.strip() for c in st.strip("|").split("|")]
            if set("".join(cells)) <= set("-: "): continue
            if not (out and out[-1].startswith(("<tr", "<table"))):
                out.append(f'<table class="{"wide" if len(cells)==2 else ""}">' + "<tr>" + "".join(f"<th>{inl(c)}</th>" for c in cells) + "</tr>"); continue
            out.append("<tr>" + "".join(f'<td{" class=n" if i and len(c) <= 12 else ""}>{inl(c)}</td>' for i, c in enumerate(cells)) + "</tr>"); continue
        m = re.match(r"(\s*)(- |\d+\. )(.*)", line)
        if m:
            ind, mk, txt = m.groups(); kind = "ol" if mk[0].isdigit() else "ul"
            if ind:
                last = out.pop(); last = last[:-5]
                last = last[:-5] + f"<li>{inl(txt)}</li></ul>" if last.endswith("</ul>") else last + f"<ul><li>{inl(txt)}</li></ul>"
                out.append(last + "</li>"); continue
            if lst != kind: close(); out.append(f"<{kind}>"); lst = kind
            out.append(f"<li>{inl(txt)}</li>"); continue
        close(); out.append(f"<p>{inl(st)}</p>")
    close(); return "\n".join(out)
def quickref(tier):
    s = clean(open(C + f"quickref_{tier}.md").read())
    body, _, tail = s.rpartition("\n---\n")
    for e in [l[2:].strip() for l in tail.splitlines() if l.startswith("- ")]:     # closing rulings → their sections
        sec = "## Hazards" if "throw" in e.lower() else "## Shots and Tombstones"
        i = body.index(sec); j = body.find("\n## ", i + 3); j = len(body) if j < 0 else j
        body = body[:i] + body[i:j].rstrip("\n") + "\n- " + e + "\n\n" + body[j:].lstrip("\n")
    L = body.splitlines(); intro = L[2].strip()
    return f'''<div class="refblock qref" id="{tier}-qr"><h2>Quick reference</h2><p class="lead">{inl(intro)}</p>{md(L[3:])}</div>'''
# ---- faction cards
F = [("SHERIFFS","Sheriffs","sheriffs","var(--sheriff)"),("BOUNTY HUNTERS","Bounty Hunters","hunters","var(--hunter)"),
     ("VIGILANTES","Vigilantes","vigilantes","var(--vigil)"),("OUTLAWS","Outlaws","outlaws","var(--outlaw)")]
FC = clean(open(C + "faction_cards.md").read())
ruling = FC.rsplit("\n---\n", 1)[1].strip()
def fsec(name): return re.search(r"## %s\n(.*?)(?=\n---\n)" % re.escape(name), FC, re.S).group(1)
def abil(sec):
    out = []
    for p in re.split(r"\n(?=\*\*[^*]+\*\* \()", "\n" + sec):
        m = re.match(r"\*\*([^*]+)\*\* \(([^)]+)\)\n(.*)", p.strip(), re.S)
        if m: out.append([m.group(1), m.group(2), m.group(3).strip()])
    return out
def ty(t):
    t = t.replace("active, ", "").replace("card + marker, ", "card + marker · ")
    return t.replace(", ", " · ")
def cards(tier):
    intro = [l[2:] for l in FC.split("\n---\n")[0].splitlines() if l.startswith("- ")]
    jump = "".join(f'<a href="#{tier}/cards" data-f="{k}" style="--fc:{c}" onclick="document.getElementById(\'{tier}-f-{k}\').scrollIntoView();return false">{n}</a>' for _, n, k, c in F)
    g = ""
    for key, nice, k, col in F:
        a = abil(fsec(key))
        for x in a:
            if x[0] == "Contract Payoff":
                r = ruling.lstrip("- ").replace("Contract Payoff: raising", "Raising"); x[2] += "\n" + r
        ab = "".join(f'<div class="acard"><h4>{n}</h4><div class="ty">{ty(t)}</div>{md(b.splitlines())}</div>' for n, t, b in a)
        g += f'''<div class="fgroup jumpto" id="{tier}-f-{k}" style="--fc:{col}"><h3>{nice}</h3><div class="art"><img src="../assets/art/{k}.webp" alt="" loading="lazy"></div>{ab}</div>'''
    sb = re.search(r"## SILVER BULLET \(one per player\)\n(.*?)(?=\n---\n)", FC, re.S).group(1).strip()
    cost, rest = sb.split("\n", 1)
    sbh = f'<div class="acard" style="--fc:var(--parch)"><h4>Silver Bullet</h4><div class="ty">Every player · once per game</div>{md([cost.replace("**Cost:** load", "Load")] + rest.splitlines())}</div>'
    return f'''<div class="refblock" id="{tier}-cards"><h2>Faction cards</h2><p class="lead">{" ".join(inl(i) for i in intro)}</p>
     <div class="fjump">{jump}</div>{sbh}{g}</div>'''
# ---- Hazard Draft + pool
HD = clean(open(C + "hazard_draft.md").read())
assert "facing away" not in HD and "OPEN" not in HD
def hsec(h): return re.search(r"## %s\n(.*?)(?=\n## |\n---)" % re.escape(h), HD, re.S).group(1).strip()
def draft(tier):
    rul = [l[2:] for l in HD.rsplit("\n---\n", 1)[1].splitlines() if l.startswith("- ")]
    rows = re.findall(r"\| \*\*(Tombstone|Bear Trap|Grave Dust)\*\* \| (\d) \| (.+?) \|", HD)
    pool = "".join(f'<div class="hz"><img src="../assets/art/{n.lower().replace(" ","_")}.webp" alt=""><div><h4>{n}<small>×{c}</small></h4><p>{inl(e)}</p></div></div>' for n, c, e in rows)
    pool += f'<div class="hz"><img src="../assets/art/dynamite_crate.webp" alt=""><div><h4>Dynamite supply<small>×3 · not a hazard</small></h4>{md(hsec("Dynamite supply").splitlines())}</div></div>'
    extra = md([l for l in hsec("The hazards (12 total, 4 of each)").splitlines() if l.startswith("- ")])
    return f'''<div class="refblock qref" id="{tier}-draft"><h2>Hazard Draft</h2><p class="lead">{inl(HD.splitlines()[2])}</p>
     <div class="when2">First player <i>›</i> place pieces <i>›</i> draft <i>›</i> play</div>
     <h3>Draft order</h3>{md(hsec("Draft order").splitlines())}
     {md(hsec("Picks per player").splitlines())}
     <h3>Each pick</h3>{md(hsec("Each pick").splitlines())}
     <h3>Hallowed ground</h3>{md(hsec("Hallowed ground").splitlines())}
     <h3>Tombstones</h3>{md(["- " + r for r in rul])}
     <h3>Empty squares only</h3>{md(hsec("Empty-square rule (always, draft and play)").splitlines())}
     <h3 id="{tier}-pool" class="jumpto">The hazard pool</h3><div class="pool">{pool}</div>{extra}</div>'''
GEN = {"beginner": quickref("beginner"), "deadly": quickref("deadly") + cards("deadly"),
       "immortal": quickref("immortal") + cards("immortal") + draft("immortal")}
p = os.path.join(ROOT, "how-to-play/index.html"); s = open(p).read()
for t, h in GEN.items():
    assert "facing away" not in h and "faces away" not in h and "OPEN" not in h
    s = re.sub(r"<!--GEN:%s-->.*?<!--/GEN:%s-->" % (t, t), lambda m: f"<!--GEN:{t}-->\n{h}\n<!--/GEN:{t}-->", s, flags=re.S)
open(p, "w").write(s); print("ok", {k: len(v) for k, v in GEN.items()})
