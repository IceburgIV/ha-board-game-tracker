
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
async addPlayer(){const name=prompt("New player name");if(!name)return;const ranked=confirm("Include this player in league rankings?");this.data=await this.ws("add_player",{name,ranked,counts_for_rankings:ranked,podium_enabled:ranked});this.render()}
async deleteGame(id){if(!confirm("Delete this game? All records will recalculate."))return;this.data=await this.ws("delete_game",{game_id:id});this.render()}
async restoreGame(id){this.data=await this.ws("restore_game",{game_id:id});this.render()}
async savePlayer(name,box){this.data=await this.ws("update_player",{name,ranked:box.querySelector("[data-ranked]").checked,counts_for_rankings:box.querySelector("[data-count]").checked,podium_enabled:box.querySelector("[data-podium]").checked});this.render()}
podium(rows){const top=rows.filter(r=>r.rank===1);if(!top.length)return`<div class="empty">No qualified leader yet.<small>Requires ${this.data.minimum_games} league games and activity within ${this.data.active_days} days.</small></div>`;return`<div class="podium">${top.map(p=>`<div class="gold"><div>👑</div><b>${this.esc(p.player)}</b><strong>${p.win_percentage}%</strong><span>${p.wins}–${p.losses} · ${this.streak(p)}</span></div>`).join("")}</div>`}
standings(rows){return rows.map(p=>`<div class="row ${p.rank===1?"leader":""} ${!p.qualified?"soft":""}"><div>${p.rank?`${p.tied?"T-":""}${p.rank}`:"—"}</div><div><b>${this.esc(p.player)}</b><small>${p.qualified?"Qualified":p.ranked?(p.active?`Provisional · ${p.provisional_games_needed} more`:"Inactive · play to requalify"):"Unranked"}</small></div><div>${p.wins}–${p.losses}<small>League</small></div><div>${p.win_percentage}%<small>Win rate</small></div><div>${this.streak(p)}<small>Current</small></div></div>`).join("")}
buzz(){const x=this.data.insights||[];return x.length?x.slice(0,8).map(i=>`<div class="buzz">${this.esc(i)}</div>`).join(""):`<div class="empty">League Buzz gets smarter as more games are played.</div>`}
bars(){const e=Object.entries(this.data.games_by_day||{}).slice(-14),m=Math.max(1,...e.map(x=>x[1]));return e.map(([d,n])=>`<div class="bar"><span>${d.slice(5)}</span><i><b style="width:${n/m*100}%"></b></i><strong>${n}</strong></div>`).join("")||`<div class="empty">No history yet.</div>`}
history(){const groups={};(this.data.all_games||[]).forEach(g=>(groups[g.date]??=[]).push(g));return Object.entries(groups).map(([date,items])=>`<h3>${date} · ${items.length} game(s)</h3>${items.map(g=>`<div class="game"><div><b>${this.esc(g.result)}</b><small>${this.esc(g.display_time)}${g.qualifying?"":" · Casual"}</small></div><button data-delete="${g.id}">Delete</button></div>`).join("")}`).join("")||`<div class="empty">No games yet.</div>`}
players(){return(this.data.players||[]).map(p=>`<div class="player"><b>${this.esc(p.name)}</b><label><input data-ranked type="checkbox" ${p.ranked?"checked":""}> Ranked</label><label><input data-count type="checkbox" ${p.counts_for_rankings?"checked":""}> Counts toward opponent %</label><label><input data-podium type="checkbox" ${p.podium_enabled?"checked":""}> Podium eligible</label><button data-save="${this.esc(p.name)}">Save</button></div>`).join("")}
render(){if(!this.shadowRoot||!this._hass)return;if(!this.cfg.entry_id){this.shadowRoot.innerHTML=`<style>${this.styles}</style><div class="error">Add entry_id to panel config.</div>`;return}if(!this.data){this.shadowRoot.innerHTML=`<style>${this.styles}</style><div class="loading">Loading league…</div>`;return}
const rows=this.data.standings||[],w=this.state("select","winner"),l=this.state("select","loser"),opts=n=>this.data.players.map(p=>`<option ${p.name===n?"selected":""}>${this.esc(p.name)}</option>`).join("");
this.shadowRoot.innerHTML=`<style>${this.styles}</style><div class="app"><header><div><small>FAMILY ARCADE LEAGUE</small><h1>🎲 ${this.esc(this.cfg.title)}</h1></div><div class="stats"><b>${this.data.total_games}<small>ALL GAMES</small></b><b>${this.esc(this.data.leader)}<small>LEADER</small></b></div></header><main>
<section><h2>⚡ RECORD A GAME</h2><div class="pick"><select id="w">${opts(w)}</select><em>VS</em><select id="l">${opts(l)}</select></div><div class="actions">${this.recordControl()}<button id="history">🕒 GAME HISTORY</button><button id="players">➕ PLAYERS</button></div></section>
<section><h2>🏆 LIVE PODIUM</h2>${this.podium(rows)}</section>
<section class="wide"><h2>📋 STANDINGS</h2>${this.standings(rows)}</section>
<section><h2>🤖 LEAGUE BUZZ</h2>${this.buzz()}</section>
<section><h2>📊 GAMES BY DAY</h2>${this.bars()}</section></main>${this.notice?`<div class="notice ${this.notice.type}">${this.esc(this.notice.text)}</div>`:""}
<div class="drawer ${this.drawer?"open":""}"><div class="drawer-head"><h2>${this.drawer==="history"?"GAME HISTORY":"PLAYER SETTINGS"}</h2><button id="close">✕</button></div>${this.drawer==="history"?this.history():this.players()}${this.drawer==="players"?`<button id="add">+ ADD PLAYER</button>`:""}${this.drawer==="history"&&this.data.deleted_games?.length?`<h3>Recently deleted</h3>${this.data.deleted_games.map(g=>`<div class="game"><span>${this.esc(g.winner)} beat ${this.esc(g.loser)}</span><button data-restore="${g.id}">Restore</button></div>`).join("")}`:""}</div><div class="shade ${this.drawer?"show":""}"></div></div>`;
this.shadowRoot.querySelector("#w")?.addEventListener("change",e=>{this.clearPending();this._hass.callService("select","select_option",{entity_id:this.id("select","winner"),option:e.target.value})});
this.shadowRoot.querySelector("#l")?.addEventListener("change",e=>{this.clearPending();this._hass.callService("select","select_option",{entity_id:this.id("select","loser"),option:e.target.value})});
this.shadowRoot.querySelector("#record")?.addEventListener("click",()=>this.beginRecord());
this.shadowRoot.querySelector("#confirm-record")?.addEventListener("click",()=>this.confirmRecord(false));
this.shadowRoot.querySelector("#force-record")?.addEventListener("click",()=>this.confirmRecord(true));
this.shadowRoot.querySelector("#cancel-record")?.addEventListener("click",()=>{this.clearPending();this.render()});
this.shadowRoot.querySelector("#history")?.addEventListener("click",()=>{this.drawer="history";this.render()});this.shadowRoot.querySelector("#players")?.addEventListener("click",()=>{this.drawer="players";this.render()});this.shadowRoot.querySelector("#close")?.addEventListener("click",()=>{this.drawer=null;this.render()});this.shadowRoot.querySelector(".shade")?.addEventListener("click",()=>{this.drawer=null;this.render()});this.shadowRoot.querySelector("#add")?.addEventListener("click",()=>this.addPlayer());
this.shadowRoot.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>this.deleteGame(b.dataset.delete)));this.shadowRoot.querySelectorAll("[data-restore]").forEach(b=>b.addEventListener("click",()=>this.restoreGame(b.dataset.restore)));this.shadowRoot.querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>this.savePlayer(b.dataset.save,b.closest(".player"))))}
get styles(){return`:host{display:block;min-height:100vh;background:radial-gradient(circle at 15% 0,#24104a 0,transparent 35%),#070914;color:#fff;font-family:Inter,system-ui}.app{padding:22px;max-width:1500px;margin:auto}header{display:flex;justify-content:space-between;align-items:center;padding:22px;border:1px solid #27d9ff55;border-radius:22px;background:#11162be8}header small{color:#3cecff;letter-spacing:.22em;font-weight:900}h1{margin:6px 0 0;font-size:clamp(1.7rem,4vw,3rem)}.stats{display:flex;gap:12px}.stats b{padding:12px 18px;background:#ffffff0d;border-radius:14px;text-align:center;color:#ffd43b}.stats small,.row small,.game small,.empty small{display:block;color:#9ca8c8;font-size:.7rem}main{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}section{background:#11162be8;border:1px solid #ffffff15;border-radius:20px;padding:18px}.wide{grid-column:1/-1}h2{font-size:1rem;letter-spacing:.12em}.pick{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center}.pick em{color:#ff4fd8;font-weight:1000}select,button{border:0;border-radius:12px;padding:14px;background:#222946;color:#fff;font:inherit;font-weight:800}.actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.actions>#record{background:linear-gradient(90deg,#8b5cf6,#ec4899);flex:1}.confirm-card{flex:1 1 100%;padding:16px;border:1px solid #38e8ff88;border-radius:16px;background:#12243d;box-shadow:0 0 24px #35e7ff22;text-align:center}.confirm-card.warning{border-color:#ffb02099;background:#33220f}.confirm-card>b,.confirm-card>span,.confirm-card>small{display:block}.confirm-card>span{margin:8px 0 12px}.confirm-card>small{margin-top:8px;color:#9ca8c8}.confirm-card div{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.confirm-card #confirm-record,.confirm-card #force-record{background:linear-gradient(90deg,#16a34a,#22c55e)}.confirm-card #cancel-record{background:#343b58}.confirm-card button:disabled{opacity:.55}.notice{position:fixed;z-index:10;left:50%;bottom:28px;transform:translateX(-50%);max-width:min(520px,90vw);padding:14px 20px;border-radius:14px;font-weight:900;box-shadow:0 12px 40px #0008}.notice.success{background:#166534}.notice.error{background:#991b1b}.podium{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.gold{padding:24px;text-align:center;border-radius:18px;background:linear-gradient(145deg,#ffd43b33,#ff8c0011);border:1px solid #ffd43b77}.gold div{font-size:2rem}.gold b,.gold strong,.gold span{display:block}.gold b{font-size:1.5rem}.gold strong{font-size:2.4rem;color:#ffd43b}.row{display:grid;grid-template-columns:60px 1.4fr .8fr .8fr .9fr;gap:10px;align-items:center;padding:12px;border-bottom:1px solid #ffffff12}.row>div:not(:nth-child(2)){text-align:center}.leader{background:#ffd43b0e;border:1px solid #ffd43b44;border-radius:12px}.soft{opacity:.58}.buzz{padding:12px;margin:8px 0;border-radius:12px;background:#ffffff0b}.bar{display:grid;grid-template-columns:55px 1fr 28px;gap:10px;align-items:center;margin:10px 0}.bar i{height:14px;background:#ffffff0c;border-radius:999px;overflow:hidden}.bar i b{display:block;height:100%;background:linear-gradient(90deg,#8b5cf6,#35e7ff)}.drawer{position:fixed;z-index:5;top:0;right:0;height:100vh;width:min(620px,92vw);background:#0b1022;padding:22px;overflow:auto;transform:translateX(105%);transition:.25s}.drawer.open{transform:none}.drawer-head{display:flex;justify-content:space-between;align-items:center}.shade{position:fixed;inset:0;background:#0009;display:none}.shade.show{display:block}.game,.player{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px;margin:8px 0;background:#ffffff0b;border-radius:12px}.player{align-items:flex-start;flex-wrap:wrap}.player label{font-size:.8rem}.empty,.loading,.error{padding:40px;text-align:center;color:#aab5d6}@media(max-width:800px){main{grid-template-columns:1fr}.wide{grid-column:auto}.row{grid-template-columns:45px 1fr 65px 65px 80px;font-size:.8rem}.stats{display:none}.pick{grid-template-columns:1fr}.pick em{text-align:center}}`}}
customElements.define("trouble-league-panel",TroubleLeaguePanel);
