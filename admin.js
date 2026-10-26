/* Admin page: reads and writes config.json in the GitHub repo. */
const OWNER = "mcrangers", REPO = "hike-bingo", FILE = "config.json";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const TKEY = "trailbingo:adminKey";
const MAX_TILES = 6; // number of exco prompts in app.js

const $ = s => document.querySelector(s);
let token = localStorage.getItem(TKEY) || "";
let sha = null, saved = null;

const gh = (path, opts = {}) => fetch(API + path, { ...opts, headers: {
  "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {}) } });
const b64e = s => btoa(unescape(encodeURIComponent(s)));
const b64d = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));

async function login(){
  const r = await gh("");
  if(r.status === 401) throw new Error("That key isn't valid or has expired.");
  if(r.status === 404 || r.status === 403) throw new Error("That key can't access mcrangers/hike-bingo. Check the repository and permissions.");
  if(!r.ok) throw new Error("GitHub error " + r.status + ". Try again.");
  const repo = await r.json();
  if(repo.permissions && repo.permissions.push === false) throw new Error("That key can read but not change the repo. It needs Contents: Read and write.");
  await load();
}

async function load(){
  const r = await gh("/contents/" + FILE + "?t=" + Date.now(), { cache: "no-store" });
  if(r.status === 404){ sha = null; saved = { showSplash:false, excoEnabled:true, excoTiles:4, excoCode:"7429" }; }
  else if(!r.ok) throw new Error("Couldn't read settings (" + r.status + ").");
  else { const j = await r.json(); sha = j.sha; saved = JSON.parse(b64d(j.content)); }
  fill(saved);
}

function fill(c){
  $("#sSplash").checked = !!c.showSplash;
  $("#sExco").checked = c.excoEnabled !== false;
  $("#nTiles").value = $("#nTiles").textContent = Math.max(1, Math.min(MAX_TILES, Number(c.excoTiles) || 4));
  $("#sCode").value = c.excoCode || "";
  sync();
}
const normal = c => ({ showSplash: !!c.showSplash, excoEnabled: c.excoEnabled !== false,
  excoTiles: Math.max(1, Math.min(MAX_TILES, Number(c.excoTiles) || 4)), excoCode: String(c.excoCode || "").trim() });
function current(){
  return { showSplash: $("#sSplash").checked, excoEnabled: $("#sExco").checked,
    excoTiles: Number($("#nTiles").textContent), excoCode: $("#sCode").value.trim() };
}
function sync(){
  const n = Number($("#nTiles").textContent);
  $("#minus").disabled = n <= 1; $("#plus").disabled = n >= MAX_TILES;
  $("#excoOpts").style.opacity = $("#sExco").checked ? 1 : .45;
  $("#excoOpts").querySelectorAll("button,input").forEach(el => { if(!$("#sExco").checked) el.disabled = true; else if(el.id!=="minus" && el.id!=="plus") el.disabled = false; });
  if($("#sExco").checked){ $("#minus").disabled = n <= 1; $("#plus").disabled = n >= MAX_TILES; }
  const dirty = saved && JSON.stringify(current()) !== JSON.stringify(normal(saved));
  $("#saveBtn").innerHTML = dirty ? '<span class="dirty"></span>Save changes' : "Saved";
  $("#saveBtn").disabled = !dirty; $("#saveBtn").style.opacity = dirty ? 1 : .6;
}

async function save(){
  const c = current();
  if(c.excoEnabled && !c.excoCode) return status("Add an exco code first.", "bad");
  $("#saveBtn").textContent = "Saving…"; $("#saveBtn").disabled = true; status("");
  const body = { message: "Admin: update settings", content: b64e(JSON.stringify(c, null, 2) + "\n") };
  if(sha) body.sha = sha;
  let r = await gh("/contents/" + FILE, { method: "PUT", body: JSON.stringify(body) });
  if(r.status === 409 || r.status === 422){ await load(); return status("Settings changed somewhere else. Reloaded, check and save again.", "bad"); }
  if(!r.ok){ sync(); return status("Couldn't save (" + r.status + "). Check your key still works.", "bad"); }
  const j = await r.json(); sha = j.content.sha; saved = c; sync();
  status("Saved. Phones get it in about a minute, next time they open the app.", "ok");
  waitLive(c);
}

async function waitLive(c){
  const want = JSON.stringify(c);
  for(let i = 0; i < 30; i++){
    await new Promise(r => setTimeout(r, 8000));
    try{
      const live = await fetch(FILE + "?t=" + Date.now(), { cache: "no-store" }).then(r => r.json());
      if(JSON.stringify(normal(live)) === want)
        return status("Live now. Phones pick it up the next time they open the app.", "ok");
    }catch(e){}
  }
}
const status = (m, cls = "") => { const s = $("#status"); s.textContent = m; s.className = "status " + cls; };

function showSettings(){
  $("#login").classList.add("hidden"); $("#settings").classList.remove("hidden");
  $("#who").textContent = "Editing settings for mcrangers.github.io/hike-bingo";
  $("#topRight").innerHTML = '<button class="ghost" id="outBtn" type="button">Log out</button>';
  $("#outBtn").onclick = () => { localStorage.removeItem(TKEY); location.reload(); };
}

$("#loginForm").onsubmit = async e => {
  e.preventDefault();
  token = $("#tok").value.trim(); if(!token) return;
  $("#loginBtn").textContent = "Checking…"; $("#loginErr").textContent = "";
  try{ await login(); localStorage.setItem(TKEY, token); showSettings(); }
  catch(err){ $("#loginErr").textContent = err.message; token = ""; }
  $("#loginBtn").textContent = "Log in";
};
["sSplash","sExco"].forEach(id => $("#" + id).onchange = sync);
$("#sCode").oninput = sync;
$("#minus").onclick = () => { $("#nTiles").textContent = Math.max(1, Number($("#nTiles").textContent) - 1); sync(); };
$("#plus").onclick = () => { $("#nTiles").textContent = Math.min(MAX_TILES, Number($("#nTiles").textContent) + 1); sync(); };
$("#saveBtn").onclick = save;

(async () => {
  if(!token) return;
  try{ await login(); showSettings(); }
  catch(err){ localStorage.removeItem(TKEY); token = ""; $("#loginErr").textContent = err.message; }
})();
