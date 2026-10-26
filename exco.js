/* ===== Exco dashboard settings ===== */
// Paste the same Google Apps Script web app URL you put in app.js
const SHEET_URL = "";
const REFRESH_SECONDS = 60;
const QUIET_MINUTES = 60;
/* =================================== */

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PKEY = "trailbingo:exco";
let DATA = null, MODE = "live", timer = null;

function ago(iso){
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if(m < 1) return "just now"; if(m < 60) return m + " min ago";
  const h = Math.floor(m/60); return h + "h " + (m%60) + "m ago";
}
const hhmm = iso => new Date(iso).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});

async function fetchData(key){
  if(!SHEET_URL) throw new Error("The Sheet link isn't set up yet. Add SHEET_URL in exco.js.");
  const r = await fetch(SHEET_URL + "?key=" + encodeURIComponent(key) + "&t=" + Date.now());
  const j = await r.json();
  if(!j.ok) throw new Error(j.error || "Couldn't load data");
  return j;
}

/* ---------- login ---------- */
$("#loginForm").onsubmit = async e => {
  e.preventDefault();
  const key = $("#pw").value.trim(); if(!key) return;
  $("#loginBtn").textContent = "Checking…"; $("#loginErr").textContent = "";
  try{ DATA = await fetchData(key); sessionStorage.setItem(PKEY, key); openDash(); }
  catch(err){ $("#loginErr").textContent = err.message === "Wrong password" ? "That password isn't right." : err.message; }
  $("#loginBtn").textContent = "Open dashboard";
};
function logout(){ sessionStorage.removeItem(PKEY); clearInterval(timer); DATA=null; $("#dash").classList.add("hidden"); $("#login").classList.remove("hidden"); $("#topRight").innerHTML=""; }

function openDash(){
  $("#login").classList.add("hidden"); $("#dash").classList.remove("hidden");
  $("#topRight").innerHTML = `<button class="ghost" id="outBtn" type="button">Log out</button>`;
  $("#outBtn").onclick = logout;
  render();
  clearInterval(timer); timer = setInterval(refresh, REFRESH_SECONDS*1000);
}
async function refresh(){
  const key = sessionStorage.getItem(PKEY); if(!key) return logout();
  $("#updated").textContent = "Refreshing…";
  try{ DATA = await fetchData(key); render(); }
  catch(err){ $("#updated").textContent = "Couldn't refresh (" + err.message + "). Retrying soon."; }
}
$("#refreshBtn").onclick = refresh;
document.querySelectorAll(".seg button").forEach(b => b.onclick = () => {
  MODE = b.dataset.mode;
  document.querySelectorAll(".seg button").forEach(x => x.classList.toggle("on", x===b));
  render();
});
$("#q").oninput = render;

/* ---------- derive current state from the log ---------- */
function derive(){
  const players = DATA.players.filter(p => p.Mode === MODE);
  const log = DATA.log.filter(r => r.Mode === MODE).sort((a,b) => new Date(a.Time) - new Date(b.Time));
  // replay sign/clear so we know which squares currently stand
  const cards = {}, lastSign = {};
  log.forEach(r => {
    const id = r["Player ID"]; cards[id] = cards[id] || {};
    if(r.Type === "sign"){ cards[id][r.Square] = { who:r["Signed by"], col:r["Signer college"], time:r.Time, playerCol:r.College }; lastSign[id] = r.Time; }
    if(r.Type === "clear"){ delete cards[id][r.Square]; }
    if(r.Type === "join" && !lastSign[id]) lastSign[id] = r.Time;
  });
  return { players, log, cards, lastSign };
}

function render(){
  if(!DATA) return;
  const { players, log, cards, lastSign } = derive();
  const sigs = Object.values(cards).reduce((n,c) => n + Object.keys(c).length, 0);
  $("#kPlayers").textContent = players.length;
  $("#kSigs").textContent = sigs;
  $("#kAvg").textContent = players.length ? (players.reduce((n,p)=>n+Number(p.Squares||0),0)/players.length).toFixed(1) : 0;
  $("#kFull").textContent = players.filter(p => p["Full card"] === "YES").length;
  $("#updated").textContent = "Updated " + new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) + " · auto-refresh every " + REFRESH_SECONDS + "s";

  // leaderboard
  const q = $("#q").value.trim().toLowerCase();
  const ranked = players.slice().sort((a,b) => (b.Squares - a.Squares) || (new Date(a["Last update"]) - new Date(b["Last update"])));
  const shown = ranked.filter(p => !q || String(p.Player).toLowerCase().includes(q));
  $("#board").innerHTML = shown.length ? shown.map(p => `
    <button class="lbrow" type="button" data-id="${esc(p["Player ID"])}">
      <span class="rk">${ranked.indexOf(p)+1}</span>
      <span class="nm">${esc(p.Player)}${p["Full card"]==="YES"?'<span class="badge">FULL</span>':''}<small>${esc(p.College)} · met ${esc(p["Colleges met"])} colleges · ${ago(p["Last update"])}</small></span>
      <span class="mini"><i style="width:${Math.min(100, p.Squares/24*100)}%"></i></span>
      <span class="ct">${esc(p.Squares)}/24</span>
    </button>`).join("") : `<div class="empty">${players.length ? "No one matches that name." : "No " + MODE + " players yet. They'll appear here once they start their card."}</div>`;
  $("#board").querySelectorAll(".lbrow").forEach(b => b.onclick = () => openPlayer(b.dataset.id));

  // college mixing matrix
  const cols = [...new Set(players.map(p => p.College).concat(Object.values(cards).flatMap(c => Object.values(c).map(s => s.col))))].filter(Boolean).sort();
  const m = {}; Object.values(cards).forEach(c => Object.values(c).forEach(s => { const k = s.playerCol + "|" + s.col; m[k] = (m[k]||0) + 1; }));
  $("#matrix").innerHTML = cols.length ? `<table class="mx"><thead><tr><th></th>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${
    cols.map(r => `<tr><th style="text-align:left">${esc(r)}</th>${cols.map(c => r===c ? `<td class="self">–</td>` : `<td class="${m[r+"|"+c]?'h':''}">${m[r+"|"+c]||0}</td>`).join("")}</tr>`).join("")
  }</tbody></table>` : `<div class="empty">Nothing yet.</div>`;

  // quiet players
  const cutoff = Date.now() - QUIET_MINUTES*60000;
  const quiet = players.filter(p => p["Full card"] !== "YES" && new Date(lastSign[p["Player ID"]] || p.Joined) < cutoff)
    .sort((a,b) => new Date(lastSign[a["Player ID"]]||a.Joined) - new Date(lastSign[b["Player ID"]]||b.Joined));
  $("#quiet").innerHTML = quiet.length ? quiet.map(p => `<div class="qp"><span>${esc(p.Player)} · ${esc(p.Squares)}/24</span><span>last ${ago(lastSign[p["Player ID"]]||p.Joined)}</span></div>`).join("") : `<div class="empty">Everyone's active.</div>`;

  // feed
  const feed = log.slice(-40).reverse();
  $("#feed").innerHTML = feed.length ? feed.map(r => {
    const t = `<time>${hhmm(r.Time)}</time>`;
    if(r.Type === "sign") return `<div class="fi">${t}<b>${esc(r.Player)}</b> (${esc(r.College)}) got <b>${esc(r["Signed by"])}</b> (${esc(r["Signer college"])}) for “${esc(r.Square)}”</div>`;
    if(r.Type === "clear") return `<div class="fi">${t}<b>${esc(r.Player)}</b> cleared “${esc(r.Square)}”</div>`;
    if(r.Type === "join") return `<div class="fi">${t}<b>${esc(r.Player)}</b> (${esc(r.College)}) started a card</div>`;
    if(r.Type === "full_card") return `<div class="fi">${t}<b>${esc(r.Player)}</b> completed a FULL CARD · code ${esc(r.Code)}</div>`;
    return "";
  }).join("") : `<div class="empty">No activity yet.</div>`;
}

function openPlayer(id){
  const { players, cards } = derive();
  const p = players.find(x => String(x["Player ID"]) === String(id)); if(!p) return;
  const sq = Object.entries(cards[id] || {}).sort((a,b) => new Date(a[1].time) - new Date(b[1].time));
  $("#sheetRoot").innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pT">
    <div class="tag">${esc(p.College)} · ${esc(p.Squares)}/24 · code ${esc(p.Code)}</div>
    <h2 id="pT">${esc(p.Player)}</h2>
    <p class="sub">Joined ${hhmm(p.Joined)} · last update ${ago(p["Last update"])}</p>
    <div class="plist">${sq.length ? sq.map(([s,v]) => `<div><span>${esc(s)}</span><span>${esc(v.who)} · ${esc(v.col)}</span></div>`).join("") : '<div class="empty">No squares yet.</div>'}</div>
    <button class="btn line" type="button" id="pClose">Close</button></div></div>`;
  const close = () => $("#sheetRoot").innerHTML = "";
  $("#pClose").onclick = close; $("#scrim").onclick = e => { if(e.target.id === "scrim") close(); };
}

/* ---------- boot ---------- */
(async () => {
  const key = sessionStorage.getItem(PKEY);
  if(key){ try{ DATA = await fetchData(key); openDash(); } catch(e){ logout(); } }
})();
