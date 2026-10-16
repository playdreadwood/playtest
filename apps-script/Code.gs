/**
 * DREADWOOD playtest: Google Sheet receiver.
 * Setup: create a Google Sheet -> Extensions > Apps Script -> paste this file ->
 * Deploy > New deployment > type "Web app" > Execute as: Me, Who has access: Anyone -> Deploy -> copy the /exec URL.
 * Change READ_KEY below to any private word before deploying.
 */
var READ_KEY = 'change-me';
var COLS = {
  surveys: ['id','ts','game','faction','fun','clarity','play_again','balance','balance_note','tier','players','layout','seat','result','first_time','favorite','least_favorite','confused','change','heard','interests','favorite_game','handle','email','ok_followup','ok_credit','credit_name','seconds','device_id','ua'],
  games:   ['id','ts','game','tier','players','layout','start','end','teach_min','first_timers','returning','winner_seat','winner_faction','end_condition','rounds','margin_wells','margin_vamps','disputes','confusion','kingmaking','runaway','broken_combo','stall','house_rules','notes','seats_json','device_id','ua'],
  seats:   ['game_id','ts','game','tier','players','layout','seat','name','faction','out_round','out_cause','cards_used','winner']
};
function sheet_(n){ var ss=SpreadsheetApp.getActiveSpreadsheet(), s=ss.getSheetByName(n);
  if(!s){ s=ss.insertSheet(n); s.appendRow(COLS[n]); s.setFrozenRows(1); } return s; }
function rowOf_(s,id){ if(s.getLastRow()<2) return 0; var v=s.getRange(2,1,s.getLastRow()-1,1).getValues(); for(var i=v.length-1;i>=0;i--){ if(v[i][0]===id) return i+2; } return 0; }
function cell_(v){ return (v!==null && typeof v==='object') ? JSON.stringify(v) : v; }
/** Upsert: a repeat id (a player adding detail, or a retry) UPDATES its row; it never adds a duplicate. */
function put_(s,id,row){ var r=rowOf_(s,id); if(r) s.getRange(r,1,1,row.length).setValues([row]); else s.appendRow(row); }
function doPost(e){
  var lock=LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var r=JSON.parse(e.postData.contents);
    if(r.type==='survey'){ put_(sheet_('surveys'), r.id, COLS.surveys.map(function(k){return cell_(r[k]);})); }
    else if(r.type==='game'){
      var row=COLS.games.map(function(k){ if(k==='seats_json') return JSON.stringify(r.seats||[]);
        if(r.ticks && k in r.ticks) return r.ticks[k]; return cell_(r[k]); });
      put_(sheet_('games'), r.id, row);
      var st=sheet_('seats');
      for(var i=st.getLastRow(); i>=2; i--){ if(st.getRange(i,1).getValue()===r.id) st.deleteRow(i); }   // replace this game's seats
      (r.seats||[]).forEach(function(x){ st.appendRow([r.id,r.ts,r.game,r.tier,r.players,r.layout,x.seat,x.name,x.faction,x.out_round,x.out_cause,(x.cards_used||[]).join('; '),x.winner]); });
    }
    return ContentService.createTextOutput('ok');
  } finally { lock.releaseLock(); }
}
/** Readback: <exec URL>?key=READ_KEY  -> JSON {surveys:[...], games:[...], seats:[...]} */
function doGet(e){
  if(!e.parameter.key || e.parameter.key!==READ_KEY) return ContentService.createTextOutput('DREADWOOD receiver is running.');
  var out={}; ['surveys','games','seats'].forEach(function(n){ var s=sheet_(n), v=s.getDataRange().getValues(), h=v.shift();
    out[n]=v.map(function(r){var o={}; h.forEach(function(k,i){o[k]=r[i];}); return o;}); });
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
