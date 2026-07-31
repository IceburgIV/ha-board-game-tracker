
class TroubleLeaguePanel extends HTMLElement{
constructor(){super();this.attachShadow({mode:"open"});this._hass=null;this._panel=null;this.data=null;this.drawer=null;this.lastTotal=null;this.pendingRecord=null;this.pendingTimer=null;this.duplicatePrompt=null;this.notice=null;this.busy=false}
set hass(v){this._hass=v;const t=this.state("sensor","total_games");if(this.lastTotal!==t){this.lastTotal=t;this.load()}else this.render()}
set panel(v){this._panel=v;this.load()}
get cfg(){return{prefix:"trouble_championship",entry_id:"",title:"TROUBLE CHAMPIONSHIP",...((this._panel&&this._panel.config)||{})}}
id(d,s){return`${d}.${this.cfg.prefix}_${s}`}
state(d,s){return this._hass?.states?.[this.id(d,s)]?.state||""}
esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async ws(type,extra={}){return this._hass.callWS({type:`trouble_championship/${type}`,entry_id:this.cfg.entry_id,...extra})}
async load(){if(!this._hass||!this.cfg.entry_id)return this.render();try{this.data=await this.ws("get_data")}catch(e){console.error(e)}this.render()}
streak(p){if(!p.streak_type)return"—";const icon=p.streak_type==="W"?(p.streak_count>=5?"🔥🔥":"🔥"):(p.streak_count>=5?"🥶":"🧊");return`${icon} ${p.streak_type}${p.streak_count}`}
clearPending(){this.pendingRecord=null;this.duplicatePrompt=null;if(this.pendingTimer){clearTimeout(this.pendingTimer);this.pendingTimer=null}}
showNotice(text,type="success"){this.notice={text,type};this.render();setTimeout(()=>{if(this.notice?.text===text){this.notice=null;this.render()}},3000)}
beginRecord(){
 const winner=this.shadowRoot.querySelector("#w")?.value,loser=this.shadowRoot.querySelector("#l")?.value;
 if(!winner||!loser)return;
 if(winner===loser){this.showNotice("Winner and loser must be different.","error");return}
 this.duplicatePrompt=null;
 this.pendingRecord={winner,loser};
 if(this.pendingTimer)clearTimeout(this.pendingTimer);
 this.pendingTimer=setTimeout(()=>{this.pendingRecord=null;this.pendingTimer=null;this.render()},6000);
 this.render()
}
async confirmRecord(force=false){
 if(!this.pendingRecord||this.busy)return;
 const {winner,loser}=this.pendingRecord;
 if(this.pendingTimer){clearTimeout(this.pendingTimer);this.pendingTimer=null}
 this.busy=true;this.render();
 try{
  const result=await this.ws("record_game",{winner,loser,force});
  this.data=result.data;
  if(result.status==="duplicate"){
   this.duplicatePrompt={winner,loser,seconds_ago:result.duplicate?.seconds_ago??0};
   this.busy=false;this.render();return
  }
  this.clearPending();this.busy=false;this.showNotice(`✅ Recorded: ${winner} defeated ${loser}`,"success")
 }catch(e){
  this.busy=false;this.showNotice(e?.message||"The game could not be recorded.","error")
 }
}
recordControl(){
 if(this.duplicatePrompt){
  const d=this.duplicatePrompt;
  return `<div class="confirm-card warning"><b>⚠️ POSSIBLE DUPLICATE</b><span>${this.esc(d.winner)} defeating ${this.esc(d.loser)} was recorded ${Math.max(0,Math.round(d.seconds_ago))} seconds ago.</span><div><button id="force-record">RECORD ANYWAY</button><button id="cancel-record">CANCEL</button></div></div>`
 }
 if(this.pendingRecord){
  const p=this.pendingRecord;
  return `<div class="confirm-card"><b>DOUBLE-CHECK THE RESULT</b><span>Did <strong>${this.esc(p.winner)}</strong> beat <strong>${this.esc(p.loser)}</strong>?</span><div><button id="confirm-record" ${this.busy?"disabled":""}>${this.busy?"RECORDING…":"✅ CONFIRM RESULT"}</button><button id="cancel-record" ${this.busy?"disabled":""}>CANCEL</button></div><small>Confirmation expires in a few seconds.</small></div>`
 }
 return `<button id="record">🏆 RECORD GAME</button>`
}
actionControls(){
 if(this.pendingRecord||this.duplicatePrompt)return this.recordControl();
 return `${this.recordControl()}<button id="history">🕒 GAME HISTORY</button><button id="players">➕ PLAYERS</button>`
}
async addPlayer(){const name=prompt("New player name");if(!name)return;const ranked=confirm("Include this player in league rankings?");this.data=await this.ws("add_player",{name,ranked,counts_for_rankings:ranked,podium_enabled:ranked});this.render()}
async deleteGame(id){if(!confirm("Delete this game? All records will recalculate."))return;this.data=await this.ws("delete_game",{game_id:id});this.render()}
async restoreGame(id){this.data=await this.ws("restore_game",{game_id:id});this.render()}
async savePlayer(name,box){this.data=await this.ws("update_player",{name,ranked:box.querySelector("[data-ranked]").checked,counts_for_rankings:box.querySelector("[data-count]").checked,podium_enabled:box.querySelector("[data-podium]").checked});this.render()}
podium(rows){
 const ranked=rows.filter(r=>Number.isInteger(r.rank)&&r.rank<=3);
 if(!ranked.length)return`<div class="empty">No qualified leader yet.<small>Requires ${this.data.minimum_games} league games and activity within ${this.data.active_days} days.</small></div>`;
 const medal=r=>r===1?"🥇":r===2?"🥈":"🥉";
 const tone=r=>r===1?"gold":r===2?"silver":"bronze";
 const card=p=>`<article class="podium-place ${tone(p.rank)} rank-${p.rank}"><div class="podium-icon">${p.rank===1?"👑":medal(p.rank)}</div><div class="podium-rank">${p.tied?"T-":""}${p.rank}</div><b>${this.esc(p.player)}</b><strong>${p.win_percentage}%</strong><span>${p.wins}–${p.losses} · ${this.streak(p)}</span><div class="podium-base">${p.rank}</div></article>`;
 const first=ranked.filter(p=>p.rank===1),second=ranked.filter(p=>p.rank===2),third=ranked.filter(p=>p.rank===3);
 if(first.length>1)return`<div class="tie-title">🤝 TIED FOR FIRST</div><div class="podium-grid tied">${[...first,...second,...third].map(card).join("")}</div>`;
 return`<div class="podium-grid classic"><div class="podium-column second">${second.map(card).join("")}</div><div class="podium-column first">${first.map(card).join("")}</div><div class="podium-column third">${third.map(card).join("")}</div></div>`
}
standings(rows){return rows.map(p=>`<div class="row ${p.rank===1?"leader":""} ${!p.qualified?"soft":""}"><div>${p.rank?`${p.tied?"T-":""}${p.rank}`:"—"}</div><div><b>${this.esc(p.player)}</b><small>${p.qualified?"Qualified":p.ranked?(p.active?`Provisional · ${p.provisional_games_needed} more`:"Inactive · play to requalify"):"Unranked"}</small></div><div>${p.wins}–${p.losses}<small>League</small></div><div>${p.win_percentage}%<small>Win rate</small></div><div>${this.streak(p)}<small>Current</small></div></div>`).join("")}
buzz(){
 const x=this.data.insights||[];
 if(!x.length)return`<div class="empty">League Buzz gets smarter as more games are played.</div>`;
 const label=t=>t.includes("🔥")?"HOT STREAK":t.includes("🧊")||t.includes("🥶")?"ICE COLD":t.includes("⚔️")?"RIVALRY WATCH":t.includes("🤝")?"DEADLOCK":t.includes("📈")?"TRENDING":"LEAGUE UPDATE";
 return`<div class="buzz-grid">${x.slice(0,8).map(i=>`<article class="buzz-card"><small>${label(i)}</small><b>${this.esc(i.replace(/^[^\w]+/,""))}</b></article>`).join("")}</div>`
}
bars(){
 const e=Object.entries(this.data.games_by_day||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
 const m=Math.max(1,...e.map(x=>x[1]));
 return e.map(([d,n],index)=>`<div class="bar ${index===0?"newest":""}"><span><b>${index===0?"TODAY · ":""}${d.slice(5)}</b></span><i><b style="width:${Math.max(6,n/m*100)}%"></b></i><strong>${n}</strong></div>`).join("")||`<div class="empty">No history yet.</div>`
}
recentGames(){
 const games=(this.data.recent_games||this.data.all_games||[]).slice(0,10);
 if(!games.length)return`<div class="empty compact">No games recorded yet.</div>`;
 return`<div class="recent-grid">${games.map((g,i)=>`<article class="recent-game"><span class="recent-rank">${i+1}</span><div><b>🏆 ${this.esc(g.result)}</b><small>${this.esc(g.display_time)}${g.qualifying===false?" · Casual":""}</small></div></article>`).join("")}</div>`
}
rivalries(){
 const names=(this.data.players||[]).map(p=>p.name),matrix=this.data.head_to_head||{};
 if(!names.length)return`<div class="empty compact">No players yet.</div>`;
 return`<div class="matrix-wrap"><table class="matrix arcade-matrix"><thead><tr><th></th>${names.map(n=>`<th>${this.esc(n)}</th>`).join("")}</tr></thead><tbody>${names.map(row=>`<tr><th>${this.esc(row)}</th>${names.map(col=>{
  if(row===col)return`<td class="diagonal">—</td>`;
  const cell=matrix?.[row]?.[col]||{},wins=Number(cell.wins||0),losses=Number(cell.losses||0);
  const tone=wins>losses?"ahead":wins<losses?"behind":"even";
  return`<td class="${tone}"><b>${wins}–${losses}</b><small>${cell.games?`${cell.win_percentage}% · ${this.esc(cell.streak_label||"—")}`:"—"}</small></td>`
 }).join("")}</tr>`).join("")}</tbody></table></div>`
}
hallOfFame(rows){
 const active=rows.filter(r=>r.all_games>0);
 if(!active.length)return`<div class="empty compact">Records appear after the first game.</div>`;
 const sort=key=>[...active].sort((a,b)=>(Number(b[key])||0)-(Number(a[key])||0)||a.player.localeCompare(b.player))[0];
 const mostWins=sort("all_wins"),bestStreak=sort("longest_win_streak"),mostGames=sort("all_games");
 const ranked=active.filter(r=>r.games>0),bestPct=ranked.length?[...ranked].sort((a,b)=>b.win_percentage-a.win_percentage||b.wins-a.wins)[0]:mostWins;
 const daily=Object.entries(this.data.games_by_day||{}).sort((a,b)=>b[1]-a[1]||b[0].localeCompare(a[0]))[0]||["—",0];
 const cards=[["🏆","MOST WINS",mostWins.player,mostWins.all_wins],["🔥","LONGEST STREAK",bestStreak.player,bestStreak.longest_win_streak],["🎮","MOST GAMES",mostGames.player,mostGames.all_games],["📈","BEST WIN %",bestPct.player,`${bestPct.win_percentage}%`],["📅","DAILY RECORD",daily[0],daily[1]]];
 return`<div class="hof-grid trophy-grid">${cards.map(c=>`<article class="hof-card trophy-card"><div class="trophy-icon">${c[0]}</div><small>${c[1]}</small><b>${this.esc(c[2])}</b><strong>${this.esc(c[3])}</strong></article>`).join("")}</div>`
}

featuredRivalry(){
 const names=(this.data.players||[]).map(p=>p.name),m=this.data.head_to_head||{};
 let best=null;
 for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
  const a=names[i],b=names[j],c=m?.[a]?.[b];
  if(c?.games&&(!best||c.games>best.games))best={a,b,games:c.games,aw:c.wins,bw:c.losses,streak:c.streak_label||"—"};
 }
 if(!best)return`<div class="empty compact">A featured rivalry appears after two players meet.</div>`;
 const leader=best.aw===best.bw?"Series tied":best.aw>best.bw?`${best.a} leads`:`${best.b} leads`;
 return`<div class="rivalry-arena"><div class="rival-side"><small>PLAYER ONE</small><b>${this.esc(best.a)}</b><strong>${best.aw}</strong></div><div class="rival-center"><span>VS</span><b>${this.esc(leader)}</b><small>${best.games} meetings<br>${this.esc(best.streak)} current matchup streak</small></div><div class="rival-side"><small>PLAYER TWO</small><b>${this.esc(best.b)}</b><strong>${best.bw}</strong></div></div>`
}
achievements(rows){
 const a=[];
 rows.forEach(p=>{
  if(p.all_wins>=25)a.push(["🏆",p.player,"25-Win Club","Legend"]);
  else if(p.all_wins>=10)a.push(["🎯",p.player,"10-Win Club","Sharpshooter"]);
  if(p.longest_win_streak>=5)a.push(["🔥",p.player,`${p.longest_win_streak}-Game Heater`,"Hot Hand"]);
  if(p.streak_type==="L"&&p.streak_count>=5)a.push(["🥶",p.player,`${p.streak_count}-Game Freeze`,"Ice Age"]);
  if(p.all_games>=50)a.push(["💯",p.player,"50 Games Played","Iron Player"]);
 });
 if(!a.length)return`<div class="achievement-empty"><span>🔒</span><b>Achievements are waiting to unlock</b><small>Reach 10 wins, a 5-game streak, or 50 games played.</small></div>`;
 return`<div class="achievement-grid">${a.slice(0,8).map(x=>`<article class="achievement-card"><span>${x[0]}</span><div><small>${this.esc(x[3])}</small><b>${this.esc(x[2])}</b><em>${this.esc(x[1])}</em></div></article>`).join("")}</div>`
}
history(){const groups={};(this.data.all_games||[]).forEach(g=>(groups[g.date]??=[]).push(g));return Object.entries(groups).map(([date,items])=>`<h3>${date} · ${items.length} game(s)</h3>${items.map(g=>`<div class="game"><div><b>${this.esc(g.result)}</b><small>${this.esc(g.display_time)}${g.qualifying?"":" · Casual"}</small></div><button data-delete="${g.id}">Delete</button></div>`).join("")}`).join("")||`<div class="empty">No games yet.</div>`}
players(){return(this.data.players||[]).map(p=>`<div class="player"><b>${this.esc(p.name)}</b><label><input data-ranked type="checkbox" ${p.ranked?"checked":""}> Ranked</label><label><input data-count type="checkbox" ${p.counts_for_rankings?"checked":""}> Counts toward opponent %</label><label><input data-podium type="checkbox" ${p.podium_enabled?"checked":""}> Podium eligible</label><button data-save="${this.esc(p.name)}">Save</button></div>`).join("")}
render(){if(!this.shadowRoot||!this._hass)return;if(!this.cfg.entry_id){this.shadowRoot.innerHTML=`<style>${this.styles}</style><div class="error">Add entry_id to panel config.</div>`;return}if(!this.data){this.shadowRoot.innerHTML=`<style>${this.styles}</style><div class="loading">Loading league…</div>`;return}
const rows=this.data.standings||[],w=this.state("select","winner"),l=this.state("select","loser"),opts=n=>this.data.players.map(p=>`<option ${p.name===n?"selected":""}>${this.esc(p.name)}</option>`).join("");
this.shadowRoot.innerHTML=`<style>${this.styles}</style><div class="app"><header><div><small>FAMILY ARCADE LEAGUE</small><h1>🎲 ${this.esc(this.cfg.title)}</h1></div><div class="stats"><b>${this.data.total_games}<small>ALL GAMES</small></b><b>${this.esc(this.data.leader)}<small>LEADER</small></b></div></header><main>
<section><h2>⚡ RECORD A GAME</h2><div class="pick"><select id="w">${opts(w)}</select><em>VS</em><select id="l">${opts(l)}</select></div><div class="actions">${this.actionControls()}</div></section>
<section><h2>🏆 LIVE PODIUM</h2>${this.podium(rows)}</section>
<section class="wide"><h2>📋 STANDINGS</h2>${this.standings(rows)}</section>
<section><h2>🤖 LEAGUE BUZZ</h2>${this.buzz()}</section>
<section><h2>📊 GAMES BY DAY</h2>${this.bars()}</section>
<section><h2>🕒 RECENT GAMES</h2>${this.recentGames()}</section>
<section><h2>⚔️ FEATURED RIVALRY</h2>${this.featuredRivalry()}</section>
<section class="wide"><h2>⚔️ RIVALRIES</h2>${this.rivalries()}</section>
<section class="wide"><h2>🌟 HALL OF FAME</h2>${this.hallOfFame(rows)}</section>
<section class="wide"><h2>🏅 ACHIEVEMENTS</h2>${this.achievements(rows)}</section></main>${this.notice?`<div class="notice ${this.notice.type}">${this.esc(this.notice.text)}</div>`:""}
<div class="drawer ${this.drawer?"open":""}"><div class="drawer-head"><h2>${this.drawer==="history"?"GAME HISTORY":"PLAYER SETTINGS"}</h2><button id="close">✕</button></div>${this.drawer==="history"?this.history():this.players()}${this.drawer==="players"?`<button id="add">+ ADD PLAYER</button>`:""}${this.drawer==="history"&&this.data.deleted_games?.length?`<h3>Recently deleted</h3>${this.data.deleted_games.map(g=>`<div class="game"><span>${this.esc(g.winner)} beat ${this.esc(g.loser)}</span><button data-restore="${g.id}">Restore</button></div>`).join("")}`:""}</div><div class="shade ${this.drawer?"show":""}"></div></div>`;
this.shadowRoot.querySelector("#w")?.addEventListener("change",e=>{this.clearPending();this._hass.callService("select","select_option",{entity_id:this.id("select","winner"),option:e.target.value})});
this.shadowRoot.querySelector("#l")?.addEventListener("change",e=>{this.clearPending();this._hass.callService("select","select_option",{entity_id:this.id("select","loser"),option:e.target.value})});
this.shadowRoot.querySelector("#record")?.addEventListener("click",()=>this.beginRecord());
this.shadowRoot.querySelector("#confirm-record")?.addEventListener("click",()=>this.confirmRecord(false));
this.shadowRoot.querySelector("#force-record")?.addEventListener("click",()=>this.confirmRecord(true));
this.shadowRoot.querySelector("#cancel-record")?.addEventListener("click",()=>{this.clearPending();this.render()});
this.shadowRoot.querySelector("#history")?.addEventListener("click",()=>{this.drawer="history";this.render()});this.shadowRoot.querySelector("#players")?.addEventListener("click",()=>{this.drawer="players";this.render()});this.shadowRoot.querySelector("#close")?.addEventListener("click",()=>{this.drawer=null;this.render()});this.shadowRoot.querySelector(".shade")?.addEventListener("click",()=>{this.drawer=null;this.render()});this.shadowRoot.querySelector("#add")?.addEventListener("click",()=>this.addPlayer());
this.shadowRoot.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>this.deleteGame(b.dataset.delete)));this.shadowRoot.querySelectorAll("[data-restore]").forEach(b=>b.addEventListener("click",()=>this.restoreGame(b.dataset.restore)));this.shadowRoot.querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>this.savePlayer(b.dataset.save,b.closest(".player"))))}
get styles(){return`:host{display:block;min-height:100vh;background:radial-gradient(circle at 15% 0,#24104a 0,transparent 35%),#070914;color:#fff;font-family:Inter,system-ui}.app{padding:22px;max-width:1500px;margin:auto}header{display:flex;justify-content:space-between;align-items:center;padding:22px;border:1px solid #27d9ff55;border-radius:22px;background:#11162be8}header small{color:#3cecff;letter-spacing:.22em;font-weight:900}h1{margin:6px 0 0;font-size:clamp(1.7rem,4vw,3rem)}.stats{display:flex;gap:12px}.stats b{padding:12px 18px;background:#ffffff0d;border-radius:14px;text-align:center;color:#ffd43b}.stats small,.row small,.game small,.empty small{display:block;color:#9ca8c8;font-size:.7rem}main{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}section{background:#11162be8;border:1px solid #ffffff15;border-radius:20px;padding:18px;min-width:0}.wide{grid-column:1/-1}h2{font-size:1rem;letter-spacing:.12em}.pick{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center}.pick em{color:#ff4fd8;font-weight:1000}select,button{border:0;border-radius:12px;padding:14px;background:#222946;color:#fff;font:inherit;font-weight:800}.actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.actions>#record{background:linear-gradient(90deg,#8b5cf6,#ec4899);flex:1}.confirm-card{flex:1 1 100%;padding:16px;border:1px solid #38e8ff88;border-radius:16px;background:#12243d;box-shadow:0 0 24px #35e7ff22;text-align:center}.confirm-card.warning{border-color:#ffb02099;background:#33220f}.confirm-card>b,.confirm-card>span,.confirm-card>small{display:block}.confirm-card>span{margin:8px 0 12px}.confirm-card>small{margin-top:8px;color:#9ca8c8}.confirm-card div{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.confirm-card #confirm-record,.confirm-card #force-record{background:linear-gradient(90deg,#16a34a,#22c55e)}.confirm-card #cancel-record{background:#343b58}.confirm-card button:disabled{opacity:.55}.notice{position:fixed;z-index:10;left:50%;bottom:28px;transform:translateX(-50%);max-width:min(520px,90vw);padding:14px 20px;border-radius:14px;font-weight:900;box-shadow:0 12px 40px #0008}.notice.success{background:#166534}.notice.error{background:#991b1b}.podium{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.gold{padding:24px;text-align:center;border-radius:18px;background:linear-gradient(145deg,#ffd43b33,#ff8c0011);border:1px solid #ffd43b77}.gold div{font-size:2rem}.gold b,.gold strong,.gold span{display:block}.gold b{font-size:1.5rem}.gold strong{font-size:2.4rem;color:#ffd43b}.row{display:grid;grid-template-columns:60px 1.4fr .8fr .8fr .9fr;gap:10px;align-items:center;padding:12px;border-bottom:1px solid #ffffff12}.row>div:not(:nth-child(2)){text-align:center}.leader{background:#ffd43b0e;border:1px solid #ffd43b44;border-radius:12px}.soft{opacity:.58}.buzz{padding:12px;margin:8px 0;border-radius:12px;background:#ffffff0b}.bar{display:grid;grid-template-columns:55px 1fr 28px;gap:10px;align-items:center;margin:10px 0}.bar i{height:14px;background:#ffffff0c;border-radius:999px;overflow:hidden}.bar i b{display:block;height:100%;background:linear-gradient(90deg,#8b5cf6,#35e7ff)}.tie-title{text-align:center;color:#ffd43b;letter-spacing:.16em;font-weight:1000;margin:4px 0 14px}.podium-grid{display:grid;gap:12px;align-items:end}.podium-grid.classic{grid-template-columns:1fr 1.15fr 1fr;min-height:310px}.podium-grid.tied{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}.podium-column{display:flex;flex-direction:column;justify-content:flex-end;min-width:0}.podium-column.first{order:2}.podium-column.second{order:1}.podium-column.third{order:3}.podium-place{display:flex;flex-direction:column;justify-content:center;min-height:145px;padding:20px;border-radius:18px;text-align:center;border:1px solid #ffffff22}.podium-column.first .podium-place{min-height:195px}.podium-column.second .podium-place{min-height:165px}.podium-column.third .podium-place{min-height:150px}.podium-place b,.podium-place strong,.podium-place span{display:block}.podium-place b{font-size:1.3rem}.podium-place strong{font-size:2.2rem}.podium-icon{font-size:1.8rem}.podium-rank{font-weight:1000}.podium-base{display:grid;place-items:center;height:72px;margin:18px -20px -20px;border-radius:0 0 16px 16px;font-size:2rem;font-weight:1000;background:#ffffff0d}.podium-column.first .podium-base{height:105px}.podium-place.gold{background:linear-gradient(145deg,#ffd43b33,#ff8c0011);border-color:#ffd43b77}.podium-place.gold strong{color:#ffd43b}.podium-place.silver{background:linear-gradient(145deg,#b8c2d633,#6b728011);border-color:#cbd5e177}.podium-place.silver strong{color:#dbeafe}.podium-place.bronze{background:linear-gradient(145deg,#d9773633,#7c2d1211);border-color:#fb923c77}.podium-place.bronze strong{color:#fdba74}.podium-column:empty{display:none}

.matrix-wrap{width:100%;overflow-x:auto;border-radius:14px}
.matrix{width:100%;min-width:720px;border-collapse:separate;border-spacing:0}
.matrix th,.matrix td{padding:13px 12px;border-right:1px solid #ffffff0b;border-bottom:1px solid #ffffff0b;text-align:center;white-space:nowrap}
.matrix thead th{color:#35e7ff;font-size:.7rem;letter-spacing:.06em;background:#0d1329}
.matrix tbody th{text-align:left;color:#fff;background:#111831;position:sticky;left:0;z-index:1}
.matrix td b,.matrix td small{display:block}
.matrix td b{font-size:1rem}
.matrix td small{margin-top:4px;color:#9ca8c8;font-size:.67rem}
.matrix .diagonal{color:#7f8aaa;background:#ffffff08}
.hof-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.hof-card{min-width:0;padding:18px;border-radius:16px;background:linear-gradient(145deg,#20284b,#151b35);border:1px solid #ffffff16;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}
.hof-card small,.hof-card b,.hof-card strong{display:block}
.hof-card small{margin-top:6px}
.hof-card b{margin-top:8px;overflow-wrap:anywhere}
.hof-card strong{margin-top:5px}
.achievement-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.buzz-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.buzz-card{padding:14px;border-radius:14px;background:linear-gradient(145deg,#ffffff0d,#ffffff05);border:1px solid #ffffff12;min-height:92px}.buzz-card small{display:block;color:#35e7ff;font-size:.66rem;font-weight:1000;letter-spacing:.12em;margin-bottom:8px}.buzz-card b{font-size:.96rem;line-height:1.35}.bar.newest{padding:8px 10px;border-radius:12px;background:#35e7ff0b;border:1px solid #35e7ff22}.bar.newest span b{color:#35e7ff}.recent-grid{display:grid;gap:10px}.recent-game{display:grid;grid-template-columns:38px 1fr;gap:12px;align-items:center;padding:13px 14px;border-radius:14px;background:linear-gradient(145deg,#ffffff0d,#ffffff05);border:1px solid #ffffff10}.recent-rank{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#8b5cf655,#35e7ff33);font-weight:1000}.recent-game b,.recent-game small{display:block}.recent-game small{color:#9ca8c8;margin-top:4px}.rivalry-arena{min-height:250px;display:grid;grid-template-columns:1fr .8fr 1fr;gap:16px;align-items:center;padding:24px;border-radius:18px;background:radial-gradient(circle at center,#8b5cf622,transparent 55%),linear-gradient(145deg,#111a35,#0d1227);border:1px solid #ffffff15}.rival-side{text-align:center}.rival-side small{display:block;color:#9ca8c8;font-size:.68rem;font-weight:900;letter-spacing:.12em}.rival-side b{display:block;font-size:1.55rem;margin:8px 0}.rival-side strong{display:block;font-size:4rem;line-height:1;color:#35e7ff;text-shadow:0 0 22px #35e7ff33}.rival-center{text-align:center}.rival-center>span{display:inline-block;padding:8px 12px;border-radius:999px;background:#ff4fd822;color:#ff4fd8;font-weight:1000}.rival-center>b,.rival-center>small{display:block}.rival-center>b{margin-top:12px;color:#ffd43b}.rival-center>small{margin-top:6px;color:#9ca8c8;line-height:1.45}.arcade-matrix td{transition:.18s ease}.arcade-matrix td:hover{transform:scale(1.03);position:relative;z-index:2}.arcade-matrix td.ahead{background:#22c55e12}.arcade-matrix td.behind{background:#ef444412}.arcade-matrix td.even{background:#ffffff08}.arcade-matrix td b{font-size:1rem}.arcade-matrix td.ahead b{color:#86efac}.arcade-matrix td.behind b{color:#fca5a5}.arcade-matrix td.even b{color:#dbeafe}.trophy-grid{grid-template-columns:repeat(5,1fr)}.trophy-card{min-height:165px;position:relative;overflow:hidden}.trophy-card:after{content:"";position:absolute;inset:auto -30px -50px;height:100px;background:radial-gradient(circle,#ffd43b22,transparent 65%)}.trophy-icon{font-size:2.2rem;margin-bottom:6px;filter:drop-shadow(0 0 12px #ffd43b33)}.trophy-card small{color:#9ca8c8;font-size:.64rem;letter-spacing:.1em}.trophy-card b{margin-top:8px;font-size:1.05rem}.trophy-card strong{margin-top:4px;font-size:2rem;color:#ffd43b}.achievement-grid{grid-template-columns:repeat(4,1fr)}.achievement-card{display:flex;gap:14px;align-items:center;padding:16px;border-radius:14px;background:linear-gradient(145deg,#ffffff0e,#ffffff05);border:1px solid #ffffff12}.achievement-card>span{font-size:2rem}.achievement-card small,.achievement-card b,.achievement-card em{display:block}.achievement-card small{color:#35e7ff;font-size:.62rem;font-weight:900;letter-spacing:.1em}.achievement-card b{margin-top:3px}.achievement-card em{margin-top:4px;color:#9ca8c8;font-style:normal;font-size:.78rem}.achievement-empty{min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#aab5d6}.achievement-empty>span{font-size:2rem}.achievement-empty>b,.achievement-empty>small{display:block}.achievement-empty>small{margin-top:6px;color:#7f8aaa}
.drawer{position:fixed;z-index:5;top:0;right:0;height:100vh;width:min(620px,92vw);background:#0b1022;padding:22px;overflow:auto;transform:translateX(105%);transition:.25s}.drawer.open{transform:none}.drawer-head{display:flex;justify-content:space-between;align-items:center}.shade{position:fixed;inset:0;background:#0009;display:none}.shade.show{display:block}.game,.player{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px;margin:8px 0;background:#ffffff0b;border-radius:12px}.player{align-items:flex-start;flex-wrap:wrap}.player label{font-size:.8rem}.empty,.loading,.error{padding:40px;text-align:center;color:#aab5d6}@media(max-width:800px){main{grid-template-columns:1fr}.wide{grid-column:auto}.row{grid-template-columns:45px 1fr 65px 65px 80px;font-size:.8rem}.stats{display:none}.pick{grid-template-columns:1fr}.pick em{text-align:center}.hof-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.achievement-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.buzz-grid{grid-template-columns:1fr}.rivalry-arena{grid-template-columns:1fr}.trophy-grid{grid-template-columns:repeat(2,1fr)}.podium-grid.classic{grid-template-columns:1fr;min-height:0}.podium-column{order:unset!important}.podium-base{height:54px!important}.podium-place{min-height:135px!important}@media(max-width:520px){.hof-grid,.achievement-grid{grid-template-columns:1fr}.matrix{min-width:620px}.trophy-card{min-height:135px}.recent-game{grid-template-columns:32px 1fr}.rival-side strong{font-size:3rem}}}`}}
if (!customElements.get("trouble-league-panel-v002")) { customElements.define("trouble-league-panel-v002", TroubleLeaguePanel); }
