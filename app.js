/* ===== Organiser settings: edit these ===== */
const CONFIG = {
  eventName: "Hike Bingo",
  // Change this list to whatever "colleges" means for your group.
  colleges: ["Chung Chi","New Asia","United","Shaw","Morningside","S.H. Ho","CW Chu","Wu Yee Sun","Lee Woo Sing"],
  allowOther: true,
  // "line" = one full row/column/diagonal wins; "blackout" = whole card
  winCondition: "line",
  prompts: [
    "Has hiked Lion Rock before","Is a first-year student","Speaks 3 or more languages","Was born outside Hong Kong",
    "Can name 3 HK hiking trails","Has watched a sunrise from a peak","Brought more than 2 snacks","Has a pet at home",
    "Can do 10 push-ups right now","Plays a musical instrument","Shares your birth month","Has never been to Lantau",
    "Studies in a different faculty","Has been camping overnight","Taught you a word in their language","Has the same favourite food as you",
    "Has a hidden talent (ask!)","Lives in a hall on campus","Brought a reusable bottle","Has run a 10K or more",
    "Has visited 5+ countries","Told you a joke that made you laugh","Is a morning person","Has a part-time job",
    "Recommended you a song","Is left-handed","Can name all 9 CUHK colleges","Wants to start a business",
    "Is wearing something green","Took a selfie with you on the trail","Has seen a wild monkey in HK","Is the youngest in their family"
  ]
};
/* ========================================== */

const KEY = "trailbingo:v1";
const $ = s => document.querySelector(s);
let S = load();

function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || null }catch(e){ return null } }
function save(){ localStorage.setItem(KEY, JSON.stringify(S)) }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }
const norm = s => (s||"").trim().toLowerCase().replace(/\s+/g," ");
const esc = s => (s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function collegeOptions(sel, placeholder){
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    CONFIG.colleges.map(c=>`<option>${esc(c)}</option>`).join("") +
    (CONFIG.allowOther ? `<option value="__other">Other…</option>` : "");
}

/* ---------- views ---------- */
function show(id){
  ["setup","game","reward"].forEach(v=>$("#"+v).classList.toggle("hidden", v!==id));
  $("#topRight").innerHTML = S ? `<button class="ghost" id="resetBtn" type="button">Reset</button>` : `<span class="chip">${esc(CONFIG.eventName)}</span>`;
  const rb = $("#resetBtn"); if(rb) rb.onclick = confirmReset;
  window.scrollTo(0,0);
}

function initSetup(){
  collegeOptions($("#pCollege"), "Choose your college");
  $("#pCollege").onchange = e => $("#pCollegeOther").classList.toggle("hidden", e.target.value!=="__other");
  $("#ruleWin").textContent = CONFIG.winCondition==="blackout"
    ? "Fill the whole card, then show your reward ticket to an organiser."
    : "Get a full line for a BINGO, then show your reward ticket to an organiser.";
  $("#setupForm").onsubmit = e => {
    e.preventDefault();
    const name = $("#pName").value.trim();
    let college = $("#pCollege").value;
    if(college==="__other") college = $("#pCollegeOther").value.trim();
    if(!name) return $("#setupErr").textContent = "Add your name first.";
    if(!college) return $("#setupErr").textContent = "Pick your college.";
    const picks = shuffle(CONFIG.prompts).slice(0,24);
    picks.splice(12,0,null); // free centre
    S = { name, college, startedAt: Date.now(), cells: picks.map(p=>({ prompt:p, who:null, whoCollege:null, note:"" })), wonAt:null };
    save(); renderGame(); show("game");
  };
}

/* ---------- logic ---------- */
const LINES = (()=>{ const L=[]; for(let i=0;i<5;i++){ L.push([0,1,2,3,4].map(j=>i*5+j)); L.push([0,1,2,3,4].map(j=>j*5+i)); } L.push([0,6,12,18,24]); L.push([4,8,12,16,20]); return L })();
const filled = i => i===12 || !!S.cells[i].who;
function completedLines(){ return LINES.filter(l=>l.every(filled)) }
function doneCount(){ return S.cells.filter((c,i)=>i!==12 && c.who).length }
function collegesMet(){ return new Set(S.cells.filter(c=>c.who).map(c=>norm(c.whoCollege))).size }
function hasWon(){ return CONFIG.winCondition==="blackout" ? doneCount()===24 : completedLines().length>0 }

function code(){
  // short verification code from the card contents
  const str = S.name+"|"+S.college+"|"+S.cells.map(c=>c.who?norm(c.who)+norm(c.whoCollege):"").join(",");
  let h = 2166136261; for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619) }
  const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let out=""; h>>>=0;
  for(let i=0;i<6;i++){ out+=A[h%A.length]; h=Math.floor(h/A.length) || (h^0x9e3779b9)>>>0 }
  return out.slice(0,3)+"-"+out.slice(3);
}

/* ---------- render ---------- */
function renderGame(popIdx){
  const winSet = new Set(completedLines().flat());
  $("#board").innerHTML = S.cells.map((c,i)=>{
    if(i===12) return `<div class="sq free ${winSet.has(i)?'win':''}" role="gridcell">FREE<br>trail start</div>`;
    const d = !!c.who;
    return `<button class="sq ${d?'done':''} ${winSet.has(i)?'win':''} ${popIdx===i?'pop':''}" data-i="${i}" role="gridcell"
      aria-label="${esc(c.prompt)}${d?', signed by '+esc(c.who):''}">
      <span class="txt">${esc(c.prompt)}</span>
      ${d?`<span class="who">${esc(c.who)}<small>${esc(c.whoCollege)}</small></span>`:""}
    </button>`;
  }).join("");
  $("#board").querySelectorAll("button.sq").forEach(b=>b.onclick=()=>openSheet(+b.dataset.i));
  const dc = doneCount(), ln = completedLines().length;
  $("#sDone").textContent = dc; $("#sLines").textContent = ln; $("#sCols").textContent = collegesMet();
  $("#bar").style.width = (dc/24*100)+"%";
  const won = hasWon();
  $("#banner").innerHTML = won
    ? `<div class="banner"><div class="big">${dc===24?'FULL CARD':'BINGO'}</div><p>${dc===24?'Every square done. Legend.':'Keep going for a full card.'}</p><button type="button" id="bTicket">Claim</button></div>` : "";
  const bt=$("#bTicket"); if(bt) bt.onclick=showTicket;
  $("#ticketBtn").classList.toggle("hidden", !won);
  if(won && !S.wonAt){ S.wonAt = Date.now(); save(); confetti(); }
}

function openSheet(i){
  const c = S.cells[i];
  $("#sheetRoot").innerHTML = `
  <div class="scrim" id="scrim">
    <form class="sheet" id="sheetForm" role="dialog" aria-modal="true" aria-labelledby="shTitle" novalidate>
      <div class="tag">Find someone who…</div>
      <h2 id="shTitle">${esc(c.prompt)}</h2>
      <p class="sub">They must be from a college other than ${esc(S.college)}.</p>
      <label for="wName">Their name</label>
      <input type="text" id="wName" maxlength="40" placeholder="Ask them to type it" value="${esc(c.who||"")}">
      <label for="wCollege">Their college</label>
      <select id="wCollege"></select>
      <input type="text" id="wCollegeOther" class="hidden" placeholder="Type their college" maxlength="40" style="margin-top:8px">
      <label for="wNote">Note (optional)</label>
      <input type="text" id="wNote" maxlength="80" placeholder="e.g. the word they taught you" value="${esc(c.note||"")}">
      <div class="err" id="wErr"></div>
      <div class="row">
        ${c.who?`<button class="btn warn" type="button" id="wClear">Clear</button>`:`<button class="btn line" type="button" id="wCancel">Cancel</button>`}
        <button class="btn" type="submit">Sign square</button>
      </div>
    </form>
  </div>`;
  const sel = $("#wCollege"); collegeOptions(sel, "Choose their college");
  if(c.whoCollege){ if(CONFIG.colleges.includes(c.whoCollege)) sel.value=c.whoCollege; else { sel.value="__other"; $("#wCollegeOther").classList.remove("hidden"); $("#wCollegeOther").value=c.whoCollege } }
  sel.onchange = e => $("#wCollegeOther").classList.toggle("hidden", e.target.value!=="__other");
  const close = ()=> $("#sheetRoot").innerHTML="";
  $("#scrim").onclick = e => { if(e.target.id==="scrim") close() };
  document.onkeydown = e => { if(e.key==="Escape") close() };
  if($("#wCancel")) $("#wCancel").onclick = close;
  if($("#wClear")) $("#wClear").onclick = ()=>{ S.cells[i]={...c,who:null,whoCollege:null,note:""}; if(!hasWon()) S.wonAt=null; save(); close(); renderGame(); };
  setTimeout(()=>{const w=$("#wName"); if(w) w.focus()}, 50);
  $("#sheetForm").onsubmit = e => {
    e.preventDefault();
    const who = $("#wName").value.trim();
    let col = sel.value; if(col==="__other") col = $("#wCollegeOther").value.trim();
    const err = m => $("#wErr").textContent = m;
    if(!who) return err("Add their name.");
    if(!col) return err("Pick their college.");
    if(norm(col)===norm(S.college)) return err(`They're from ${S.college} too. Find someone from another college.`);
    if(norm(who)===norm(S.name)) return err("You can't sign your own square.");
    const dup = S.cells.findIndex((x,j)=>j!==i && x.who && norm(x.who)===norm(who));
    if(dup>-1) return err(`${who} already signed "${S.cells[dup].prompt}". Find someone new.`);
    S.cells[i] = { ...c, who, whoCollege: col, note: $("#wNote").value.trim() };
    save(); close(); renderGame(i);
  };
}

function showTicket(){
  const dc = doneCount();
  $("#tTag").textContent = CONFIG.eventName + " · reward ticket";
  $("#tTitle").textContent = dc===24 ? "FULL CARD" : "BINGO";
  $("#tName").textContent = S.name; $("#tCollege").textContent = S.college;
  $("#tDone").textContent = dc+" / 24"; $("#tLines").textContent = completedLines().length;
  $("#tCols").textContent = collegesMet(); $("#tCode").textContent = code();
  const t = new Date(S.wonAt||Date.now());
  $("#tClock").textContent = "Completed " + t.toLocaleString([], {dateStyle:"medium", timeStyle:"short"});
  $("#tPeople").innerHTML = S.cells.filter(c=>c.who).map(c=>`<div><span>${esc(c.who)}</span><span>${esc(c.whoCollege)}</span></div>`).join("");
  show("reward");
}

function confirmReset(){
  $("#sheetRoot").innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true">
    <div class="tag">Start over</div><h2>Reset your card?</h2><p class="sub">This clears every square and gives you a new shuffled card.</p>
    <div class="row"><button class="btn line" type="button" id="rNo">Keep my card</button><button class="btn warn" type="button" id="rYes">Reset</button></div></div></div>`;
  const close=()=>$("#sheetRoot").innerHTML="";
  $("#rNo").onclick=close; $("#scrim").onclick=e=>{if(e.target.id==="scrim")close()};
  $("#rYes").onclick=()=>{ localStorage.removeItem(KEY); S=null; close(); $("#setupForm").reset(); $("#pCollegeOther").classList.add("hidden"); show("setup") };
}

/* ---------- confetti ---------- */
function confetti(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv=$("#confetti"), ctx=cv.getContext("2d"); cv.width=innerWidth; cv.height=innerHeight;
  const cols=["#f2a541","#5e7d4f","#1f3a2e","#f6f1e7","#d9822b"];
  const P=Array.from({length:140},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.5,r:4+Math.random()*5,c:cols[Math.random()*5|0],vy:2+Math.random()*3,vx:-1.5+Math.random()*3,a:Math.random()*6}));
  let f=0; (function tick(){ ctx.clearRect(0,0,cv.width,cv.height);
    P.forEach(p=>{p.y+=p.vy;p.x+=p.vx;p.a+=.1;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);ctx.restore()});
    if(++f<200) requestAnimationFrame(tick); else ctx.clearRect(0,0,cv.width,cv.height) })();
}

/* ---------- boot ---------- */
$("#backBtn").onclick = ()=>{ renderGame(); show("game") };
$("#ticketBtn").onclick = showTicket;
document.title = CONFIG.eventName + " · Trail Bingo";
initSetup();
if(S){ renderGame(); show("game") } else show("setup");
