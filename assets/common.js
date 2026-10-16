/* DREADWOOD playtest: shared helpers (no dependencies). */
(function(){
const C = window.DW_CONFIG || {};
const QK = "dw_queue_v1", SK = "dw_sent_v1";
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e){ return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2,10));

/* Chip groups: <div class="chips" data-name="x" data-multi> with options array. */
function chips(el, opts, {multi=false, onchange}={}){
  el.innerHTML = "";
  opts.forEach(o => {
    const v = typeof o === "string" ? o : o.v, l = typeof o === "string" ? o : (o.l||o.v);
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip" + (el.dataset.chipclass ? " "+el.dataset.chipclass : "");
    b.dataset.v = v; b.textContent = l; b.setAttribute("aria-pressed","false");
    b.addEventListener("click", () => {
      if (multi) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed")==="true" ? "false":"true");
      else { const on = b.getAttribute("aria-pressed")==="true"; $$(".chip", el).forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed", on ? "false":"true"); }
      onchange && onchange(getChips(el, multi));
    });
    el.appendChild(b);
  });
}
function getChips(el, multi){ const v = $$(".chip[aria-pressed=true]", el).map(b=>b.dataset.v); return multi ? v : (v[0] || ""); }
function setChips(el, val){ const vs = Array.isArray(val) ? val : [val]; $$(".chip", el).forEach(b=>b.setAttribute("aria-pressed", vs.includes(b.dataset.v)?"true":"false")); }

/* Delivery. Queue in localStorage first (so nothing is lost), then try every sink. */
function enqueue(rec){
  rec.device_id = deviceState().did; rec.id = rec.id || uid(); rec.ts = rec.ts || new Date().toISOString(); rec.ua = navigator.userAgent.slice(0,80);
  const q = jget(QK, []); if (!q.find(x=>x.id===rec.id)) q.push(rec); jset(QK, q);
  const s = jget(SK, []); if (!s.find(x=>x.id===rec.id)) { s.push(rec); jset(SK, s); }  // device history (for export)
  return rec;
}
async function send(rec){
  let ok = false;
  if (C.sheet){
    try { await fetch(C.sheet, {method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain;charset=utf-8"}, body: JSON.stringify(rec)}); ok = true; } catch(e){}
  }
  if (C.ntfy){
    try {
      let body = JSON.stringify(rec);
      if (body.length > 3800){ // ntfy caps messages at 4 KB; trim long free text rather than lose the row
        const r2 = {...rec, _trimmed:true}; for (const k of Object.keys(r2)) if (typeof r2[k]==="string" && r2[k].length>400) r2[k]=r2[k].slice(0,400)+"…";
        body = JSON.stringify(r2).slice(0,3900);
      }
      const r = await fetch(C.ntfy, {method:"POST", body, headers:{"Title":rec.type+" "+rec.id.slice(0,8)}});
      if (r.ok) ok = true;
    } catch(e){}
  }
  if (!C.sheet && !C.ntfy) ok = false;
  return ok;
}
let flushing = false;
async function flush(){
  if (flushing) return pending(); flushing = true;
  try {
    let q = jget(QK, []);
    for (const rec of q.slice()){
      if (await send(rec)){ q = jget(QK, []).filter(x=>x.id!==rec.id); jset(QK, q); }
      else break;
    }
  } finally { flushing = false; }
  const n = pending(); document.dispatchEvent(new CustomEvent("dw-queue", {detail:{pending:n}})); return n;
}
const pending = () => jget(QK, []).length;
window.addEventListener("online", flush);
setInterval(() => { if (pending()) flush(); }, 15000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && pending()) flush(); });

function download(name, text, type){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); }
function csv(rows){ const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))]; const esc=v=>{v=v==null?"":(typeof v==="object"?JSON.stringify(v):String(v));return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}; return [keys.join(","),...rows.map(r=>keys.map(k=>esc(r[k])).join(","))].join("\n"); }

const LAYOUTS = {
 2:[["2P-01","Backs to the Wall"],["2P-02","Three Crosses Ridge"],["2P-03","Boot Hill Rim"],["2P-04","The Sunken Square"],["2P-05","High Noon Push"],["2P-06","Posse Ride"],["2P-07","Poisoned Well Gambit"],["2P-08","Undertaker's Escort"],["2P-09","Pincer at Pale Creek"],["2P-10","Gallows Row"],["2P-11","Chequered Cemetery"],["2P-12","Blood Brothers"]],
 3:[["3P-01","Cornered Wagons"],["3P-02","Tumbleweed Diaspora"],["3P-03","Fencepost Crawl"],["3P-04","Heart of the Hollow"],["3P-05","Main Street Showdown"],["3P-06","Spurs First"],["3P-07","Honeypot at Dusk"],["3P-08","Pallbearer's Pact"],["3P-09","Wolf Pack Flank"],["3P-10","Firing Squad at Dawn"],["3P-11","Dead Man's Draughts"],["3P-12","Two Fangs, One Heart"]],
 4:[["4P-01","Huddle at Hangman's Hollow"],["4P-02","Four Corners Standoff"],["4P-03","Gallows Fence Line"],["4P-04","Inner Sanctum Saloon"],["4P-05","Crossroads Claim"],["4P-06","Cavalry of the Damned"],["4P-07","Blood Money Frontier"],["4P-08","Gravedigger and Gun"],["4P-09","Both Barrels, Opposite Banks"],["4P-10","Hangman's Line"],["4P-11","Checkerboard Crypt"],["4P-12","Coffin Twins"]]
};
function fillLayouts(sel, count){
  const cur = sel.value; sel.innerHTML = '<option value="">Choose a layout…</option><option value="Random">Random (drew one)</option><option value="Not sure">Not sure</option>';
  const groups = count ? [count] : [2,3,4];
  groups.forEach(n => { const g = document.createElement("optgroup"); g.label = n+"-player layouts";
    LAYOUTS[n].forEach(([id,nm]) => { const o=document.createElement("option"); o.value=id+" "+nm; o.textContent=id+" · "+nm; g.appendChild(o); }); sel.appendChild(g); });
  if ([...sel.options].some(o=>o.value===cur)) sel.value = cur;
}

/* Per-device vampire rotation: random device id + shuffled order of 8, advance one per survey, never repeat across a reshuffle. */
const VAMPS = [
 {f:"v1.webp",name:"“Calamity” June",line:"She'd like a word about that last round."},
 {f:"v2.webp",name:"“Iron” Ike Miller",line:"Doesn't own a shirt. Owns plenty of opinions."},
 {f:"v3.webp",name:"The Widow",line:"Patient. You, on the other hand, are in her sights."},
 {f:"v4.webp",name:"“Mad Dog” Maddox",line:"Grinning. That's rarely the good sign."},
 {f:"v5.webp",name:"Ruby “The Rose” O'Malley",line:"No rules. No mercy. Thanks for the notes."},
 {f:"v6.webp",name:"Marshal Cyrus Thorne",line:"The law has fangs. Your feedback has his attention."},
 {f:"v7.webp",name:"Deputy Victoria Steele",line:"Filed. Stamped. Possibly acted upon."},
 {f:"v8.webp",name:"Silas “The Grave” Vane",line:"Took your feedback down at long range."}
];
function shuffle(a, notFirst){ a=a.slice(); do { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} } while(notFirst!==undefined && a[0]===notFirst); return a; }
function deviceState(){
  let s = jget("dw_device_v1", null);
  if (!s || !s.did || !Array.isArray(s.order) || s.order.length!==8 || typeof s.idx!=="number" || s.idx<0 || s.idx>7){
    s = {did: s && s.did || uid(), order: shuffle([0,1,2,3,4,5,6,7]), idx:0}; jset("dw_device_v1", s); }
  return s;
}
/* Returns the vampire for this submission and advances the index. */
function nextVampire(){
  const s = deviceState(), k = s.order[s.idx], v = {...VAMPS[k], n:k};
  s.idx++; if (s.idx>=8){ s.order = shuffle([0,1,2,3,4,5,6,7], k); s.idx = 0; }
  jset("dw_device_v1", s); return v;
}
const FACTIONS = ["Sheriffs","Outlaws","Bounty Hunters","Vigilantes"];
const ROSTER = {
 "Sheriffs":{chars:["Marshal Cyrus Thorne","Deputy Victoria Steele"],abil:["Under My Protection","Swift Justice","Order Restored"],once:["Order Restored"]},
 "Outlaws":{chars:["Ruby \"The Rose\" O'Malley","\"Mad Dog\" Maddox"],abil:["Daring Escape","Rampage","Hand Cannon"],once:["Rampage","Hand Cannon"]},
 "Bounty Hunters":{chars:["Silas \"The Grave\" Vane","The Widow"],abil:["Sharpshooter","Marked Man","Contract Payoff"],once:["Contract Payoff"]},
 "Vigilantes":{chars:["\"Iron\" Ike Miller","\"Calamity\" June"],abil:["Fluid Malice","Bound by Blood","Vengeance is Mine"],once:[]}
};
window.DW = {nextVampire, deviceState, VAMPS, $, $$, jget, jset, uid, chips, getChips, setChips, enqueue, flush, pending, send, download, csv, fillLayouts, LAYOUTS, FACTIONS, ROSTER, C, SK, QK};
setTimeout(() => { if (pending()) flush(); }, 600);
})();
