/**
 * Trail Bingo – leaderboard backend (Google Sheet)
 * Paste this whole file into Extensions > Apps Script in a new Google Sheet,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * Copy the /exec URL into the admin page. See SETUP-LEADERBOARD.md.
 *
 * One row per player per mode (test/live) – no action log.
 */
const HEADERS = ["Player ID","Mode","Player","College","Squares","Lines","Colleges met","Full card","Finished","Code","Joined","Last update"];

function sheet_(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("Leaderboard");
  if(!sh){
    sh = ss.insertSheet("Leaderboard");
    sh.appendRow(HEADERS); sh.setFrozenRows(1);
    sh.getRange(1,1,1,HEADERS.length).setFontWeight("bold");
  }
  return sh;
}
const clean_ = (s, n) => String(s == null ? "" : s).slice(0, n || 40);

function doPost(e){
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    const p = JSON.parse(e.postData.contents);
    const mode = p.mode === "live" ? "live" : "test";
    const id = clean_(p.id, 24); if(!id) return ContentService.createTextOutput("no id");
    const sh = sheet_();
    const vals = sh.getDataRange().getValues();
    let row = -1;
    for(let i = 1; i < vals.length; i++) if(String(vals[i][0]) === id && vals[i][1] === mode){ row = i + 1; break; }
    if(p.remove){ if(row > 0) sh.deleteRow(row); return ContentService.createTextOutput("ok"); }
    const now = new Date();
    const out = [id, mode, clean_(p.name), clean_(p.college), Number(p.squares)||0, Number(p.lines)||0,
      Number(p.colleges)||0, p.full ? "YES" : "", p.wonAt ? new Date(p.wonAt) : "", clean_(p.code, 10),
      row > 0 ? vals[row-1][10] : now, now];
    if(row > 0) sh.getRange(row, 1, 1, out.length).setValues([out]); else sh.appendRow(out);
    return ContentService.createTextOutput("ok");
  } finally { lock.releaseLock(); }
}

// The game reads the board here: ?mode=test|live&me=<player id>
function doGet(e){
  const mode = e.parameter.mode === "live" ? "live" : "test";
  const vals = sheet_().getDataRange().getValues().slice(1).filter(r => r[1] === mode);
  const rows = vals.map(r => ({ id: String(r[0]), name: r[2], college: r[3], squares: Number(r[4])||0, lines: Number(r[5])||0,
    full: r[7] === "YES", wonAt: r[8] instanceof Date ? r[8].getTime() : null, t: r[11] instanceof Date ? r[11].getTime() : 0 }));
  rows.sort((a, b) => (b.full - a.full) || (a.full && b.full ? a.wonAt - b.wonAt : 0) || (b.squares - a.squares) || (b.lines - a.lines) || (a.t - b.t));
  const colleges = {};
  rows.forEach(r => { const c = colleges[r.college] || (colleges[r.college] = { college: r.college, squares: 0, players: 0 }); c.squares += r.squares; c.players++; });
  const me = e.parameter.me ? rows.findIndex(r => r.id === e.parameter.me) : -1;
  const top = Math.min(Number(e.parameter.top) || 10, 100);
  const strip = r => ({ name: r.name, college: r.college, squares: r.squares, lines: r.lines, full: r.full });
  return ContentService.createTextOutput(JSON.stringify({
    ok: true, mode, players: rows.length, top: rows.slice(0, top).map(strip),
    me: me < 0 ? null : { rank: me + 1, ...strip(rows[me]) },
    colleges: Object.values(colleges).sort((a, b) => b.squares - a.squares)
  })).setMimeType(ContentService.MimeType.JSON);
}
