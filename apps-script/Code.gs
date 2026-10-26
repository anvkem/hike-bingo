/**
 * Trail Bingo – Google Sheet backend
 * Paste this whole file into Extensions > Apps Script in your Google Sheet.
 * Change EXCO_PASSWORD, then Deploy > New deployment > Web app
 * (Execute as: Me, Who has access: Anyone). See SETUP-TRACKING.md.
 */
const EXCO_PASSWORD = "change-me";

const LOG_HEADERS = ["Time","Mode","Type","Player ID","Player","College","Square","Signed by","Signer college","Note","Squares","Lines","Colleges met","Full card","Code","Event ID"];
const PLAYER_HEADERS = ["Player ID","Mode","Player","College","Squares","Lines","Colleges met","Full card","Code","Joined","Last update"];

function sheet_(name, headers){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight("bold");
  }
  return sh;
}

function doPost(e){
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    const ev = JSON.parse(e.postData.contents);
    const log = sheet_("Log", LOG_HEADERS);
    log.appendRow([new Date(ev.time), ev.mode, ev.type, ev.playerId, ev.player, ev.college,
      ev.square||"", ev.who||"", ev.whoCollege||"", ev.note||"",
      ev.squares, ev.lines, ev.collegesMet, ev.fullCard ? "YES" : "", ev.code, ev.eventId]);

    // one row per player with their latest progress
    const pl = sheet_("Players", PLAYER_HEADERS);
    const ids = pl.getRange(1,1,Math.max(pl.getLastRow(),1),1).getValues().map(r=>String(r[0]));
    const row = [ev.playerId, ev.mode, ev.player, ev.college, ev.squares, ev.lines, ev.collegesMet,
      ev.fullCard ? "YES" : "", ev.code, null, new Date(ev.time)];
    const idx = ids.indexOf(String(ev.playerId));
    if(idx > 0){
      row[9] = pl.getRange(idx+1,10).getValue();
      pl.getRange(idx+1,1,1,row.length).setValues([row]);
    } else {
      row[9] = new Date(ev.time);
      pl.appendRow(row);
    }
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

// Exco dashboard reads data here: ?key=PASSWORD
function doGet(e){
  const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  if(!e.parameter.key || e.parameter.key !== EXCO_PASSWORD) return out({ ok:false, error:"Wrong password" });
  const read = (name, headers) => {
    const sh = sheet_(name, headers);
    const v = sh.getDataRange().getValues();
    const h = v.shift();
    return v.map(r => Object.fromEntries(h.map((k,i)=>[k, r[i] instanceof Date ? r[i].toISOString() : r[i]])));
  };
  return out({ ok:true, players: read("Players", PLAYER_HEADERS), log: read("Log", LOG_HEADERS) });
}
