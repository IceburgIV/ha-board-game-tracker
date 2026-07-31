class TroubleChampionshipPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._panel = null;
    this._lastGameCount = null;
    this._lastLeader = null;
    this._toastTimer = null;
  }

  set hass(value) {
    const previousCount = this._totalGames();
    const previousLeader = this._leader();
    this._hass = value;
    this._render();

    const nextCount = this._totalGames();
    const nextLeader = this._leader();

    if (this._lastGameCount !== null && nextCount > this._lastGameCount) {
      this._celebrate("GAME RECORDED!", this._state("last_result", "A new result was saved"));
      this._confetti();
    }
    if (
      this._lastLeader &&
      nextLeader &&
      nextLeader !== "No games yet" &&
      nextLeader !== this._lastLeader
    ) {
      this._celebrate("NEW LEADER!", nextLeader);
      this._confetti();
    }

    this._lastGameCount = nextCount;
    this._lastLeader = nextLeader;
  }

  get hass() {
    return this._hass;
  }

  set panel(value) {
    this._panel = value;
    this._render();
  }

  get panel() {
    return this._panel;
  }

  connectedCallback() {
    this._render();
  }

  _cfg() {
    return {
      prefix: "trouble_championship",
      title: "TROUBLE CHAMPIONSHIP",
      ...((this._panel && this._panel.config) || {}),
    };
  }

  _id(kind, suffix) {
    return `${kind}.${this._cfg().prefix}_${suffix}`;
  }

  _entity(kind, suffix) {
    if (!this._hass) return null;
    return this._hass.states[this._id(kind, suffix)] || null;
  }

  _state(suffix, fallback = "—", kind = "sensor") {
    const entity = this._entity(kind, suffix);
    return entity ? entity.state : fallback;
  }

  _attrs(suffix, kind = "sensor") {
    const entity = this._entity(kind, suffix);
    return entity ? entity.attributes || {} : {};
  }

  _totalGames() {
    return Number(this._state("total_games", "0")) || 0;
  }

  _leader() {
    return this._state("leader", "No games yet");
  }

  _standings() {
    const rows = this._attrs("standings").standings;
    return Array.isArray(rows) ? rows : [];
  }

  _recentGames() {
    const games = this._attrs("recent_games").games;
    return Array.isArray(games) ? games : [];
  }

  _matrix() {
    return this._attrs("head_to_head").matrix || {};
  }

  _gamesByDay() {
    return this._attrs("daily_games").games_by_day || {};
  }

  _esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _call(domain, service, data) {
    if (!this._hass) return;
    return this._hass.callService(domain, service, data);
  }

  _setSelect(role, value) {
    this._call("select", "select_option", {
      entity_id: this._id("select", role),
      option: value,
    });
  }

  _record() {
    const winner = this._state("winner", "", "select");
    const loser = this._state("loser", "", "select");
    if (!winner || !loser || winner === loser) {
      this._celebrate("PICK TWO PLAYERS", "Winner and loser must be different.");
      return;
    }
    this._call("button", "press", {
      entity_id: this._id("button", "record_game"),
    });
  }

  _undo() {
    this._call("button", "press", {
      entity_id: this._id("button", "undo_last_game"),
    });
  }

  _rankLabel(row) {
    if (row.rank == null) return "UNRANKED";
    return `${row.tied ? "T-" : ""}${row.rank}`;
  }

  _medal(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "🎮";
  }

  _playerOptions(selected) {
    const options = this._entity("select", "winner")?.attributes?.options || [];
    return options
      .map(
        (name) =>
          `<option value="${this._esc(name)}" ${name === selected ? "selected" : ""}>${this._esc(name)}</option>`
      )
      .join("");
  }

  _podium(active) {
    if (!active.length) {
      return `<div class="empty"><div class="empty-icon">🎲</div><h2>No games yet</h2><p>Record the first game to begin the championship.</p></div>`;
    }

    const first = active.filter((p) => p.rank === 1);
    const second = active.find((p) => p.rank === 2);
    const third = active.find((p) => p.rank === 3);

    if (first.length > 1) {
      return `
        <div class="tie-banner">🤝 TIED FOR FIRST</div>
        <div class="tie-podium">
          ${first
            .map(
              (p) => `
              <div class="podium-card gold">
                <div class="crown">👑</div>
                <div class="medal">🥇 T-1</div>
                <div class="podium-name">${this._esc(p.player)}</div>
                <div class="podium-percent">${p.win_percentage}%</div>
                <div class="podium-record">${p.wins}–${p.losses} · 🔥 ${p.current_win_streak}</div>
              </div>`
            )
            .join("")}
        </div>`;
    }

    const champion = first[0];
    return `
      <div class="podium-stage">
        <div class="podium-slot second">
          ${
            second
              ? `<div class="podium-person"><span>🥈</span><strong>${this._esc(second.player)}</strong><b>${second.win_percentage}%</b><small>${second.wins}–${second.losses}</small></div>`
              : ""
          }
          <div class="block block-2">2</div>
        </div>
        <div class="podium-slot first">
          <div class="podium-person champion">
            <span class="floating-crown">👑</span>
            <span>🥇</span>
            <strong>${this._esc(champion.player)}</strong>
            <b>${champion.win_percentage}%</b>
            <small>${champion.wins}–${champion.losses} · 🔥 ${champion.current_win_streak}</small>
          </div>
          <div class="block block-1">1</div>
        </div>
        <div class="podium-slot third">
          ${
            third
              ? `<div class="podium-person"><span>🥉</span><strong>${this._esc(third.player)}</strong><b>${third.win_percentage}%</b><small>${third.wins}–${third.losses}</small></div>`
              : ""
          }
          <div class="block block-3">3</div>
        </div>
      </div>`;
  }

  _standingsCards(rows) {
    return rows
      .map((p) => {
        const active = p.games > 0;
        return `
          <article class="player-card ${p.rank === 1 ? "leader-card" : ""} ${!active ? "inactive" : ""}">
            <div class="rank">${active ? this._medal(p.rank) + " " + this._rankLabel(p) : "—"}</div>
            <div class="player-main">
              <h3>${this._esc(p.player)}</h3>
              <div class="record">${active ? `${p.wins}–${p.losses}` : "No games"}</div>
            </div>
            <div class="percentage">${active ? `${p.win_percentage}%` : "—"}</div>
            <div class="mini-stat"><span>🔥 Current</span><b>${p.current_win_streak}</b></div>
            <div class="mini-stat"><span>🏅 Best</span><b>${p.longest_win_streak}</b></div>
          </article>`;
      })
      .join("");
  }

  _dailyBars() {
    const byDay = this._gamesByDay();
    const entries = Object.entries(byDay).slice(-14);
    if (!entries.length) {
      return `<div class="empty small"><p>No daily history yet.</p></div>`;
    }
    const max = Math.max(...entries.map(([, count]) => Number(count) || 0), 1);
    return `
      <div class="bar-chart">
        ${entries
          .map(([date, count]) => {
            const parsed = new Date(`${date}T12:00:00`);
            const label = parsed.toLocaleDateString(undefined, { weekday: "short" });
            const dateLabel = parsed.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
            const width = Math.max(6, (Number(count) / max) * 100);
            return `
              <div class="bar-row">
                <div class="bar-label"><b>${label}</b><small>${dateLabel}</small></div>
                <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
                <div class="bar-value">${count}</div>
              </div>`;
          })
          .join("")}
      </div>`;
  }

  _recent() {
    const games = this._recentGames().slice(0, 8);
    if (!games.length) return `<div class="empty small"><p>No games recorded yet.</p></div>`;
    return games
      .map(
        (game, i) => `
          <div class="recent-row">
            <div class="recent-number">${i + 1}</div>
            <div><strong>🏆 ${this._esc(game.result)}</strong><small>${this._esc(game.display_time)}</small></div>
          </div>`
      )
      .join("");
  }

  _headToHead(rows) {
    const activeNames = rows.map((r) => r.player);
    const matrix = this._matrix();
    if (!activeNames.length) return "";
    return `
      <div class="matrix-wrap">
        <table class="matrix">
          <thead><tr><th></th>${activeNames.map((p) => `<th>${this._esc(p)}</th>`).join("")}</tr></thead>
          <tbody>
            ${activeNames
              .map(
                (row) => `
                <tr>
                  <th>${this._esc(row)}</th>
                  ${activeNames
                    .map((col) => `<td class="${row === col ? "diagonal" : ""}">${row === col ? "—" : matrix?.[row]?.[col] || 0}</td>`)
                    .join("")}
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  _hallOfFame(rows) {
    const active = rows.filter((r) => r.games > 0);
    if (!active.length) return `<div class="empty small"><p>Records appear after the first game.</p></div>`;

    const mostWins = [...active].sort((a, b) => b.wins - a.wins)[0];
    const longest = [...active].sort((a, b) => b.longest_win_streak - a.longest_win_streak)[0];
    const mostGames = [...active].sort((a, b) => b.games - a.games)[0];
    const bestPct = [...active].sort((a, b) => b.win_percentage - a.win_percentage || b.wins - a.wins)[0];
    const daily = this._attrs("daily_games");

    const items = [
      ["🏆", "MOST WINS", mostWins.player, mostWins.wins],
      ["🔥", "LONGEST STREAK", longest.player, longest.longest_win_streak],
      ["🎮", "MOST GAMES", mostGames.player, mostGames.games],
      ["📈", "BEST WIN %", bestPct.player, `${bestPct.win_percentage}%`],
      ["📅", "DAILY RECORD", (daily.busiest_days || [])[0] || "—", daily.busiest_day_count || 0],
    ];

    return `<div class="hof-grid">${items
      .map(
        ([icon, label, name, value]) => `
          <div class="hof-card"><span>${icon}</span><small>${label}</small><strong>${this._esc(name)}</strong><b>${this._esc(value)}</b></div>`
      )
      .join("")}</div>`;
  }

  _celebrate(title, message) {
    const toast = this.shadowRoot?.querySelector(".toast");
    if (!toast) return;
    toast.innerHTML = `<strong>${this._esc(title)}</strong><span>${this._esc(message)}</span>`;
    toast.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
  }

  _confetti() {
    const layer = this.shadowRoot?.querySelector(".confetti-layer");
    if (!layer) return;
    layer.innerHTML = "";
    const symbols = ["🎉", "⭐", "🏆", "🎲", "✨"];
    for (let i = 0; i < 32; i += 1) {
      const piece = document.createElement("span");
      piece.textContent = symbols[i % symbols.length];
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
      layer.appendChild(piece);
    }
    setTimeout(() => (layer.innerHTML = ""), 3500);
  }

  _render() {
    if (!this.shadowRoot || !this._hass) return;

    const rows = this._standings();
    const active = rows.filter((r) => r.games > 0);
    const winner = this._state("winner", "", "select");
    const loser = this._state("loser", "", "select");
    const total = this._totalGames();
    const today = Number(this._state("games_today", "0")) || 0;
    const lastResult = this._state("last_result", "No games yet");
    const leader = this._leader();

    this.shadowRoot.innerHTML = `
      <style>${TroubleChampionshipPanel.styles}</style>
      <div class="app">
        <div class="scanlines"></div>
        <div class="confetti-layer"></div>
        <div class="toast"></div>

        <header class="hero">
          <div>
            <div class="eyebrow">FAMILY ARCADE LEAGUE</div>
            <h1>🎲 ${this._esc(this._cfg().title)}</h1>
            <p>Every game counts. Every rivalry matters.</p>
          </div>
          <div class="hero-stats">
            <div><span>TODAY</span><b>${today}</b></div>
            <div><span>ALL TIME</span><b>${total}</b></div>
            <div><span>LEADER</span><b>${this._esc(leader)}</b></div>
          </div>
        </header>

        <main>
          <section class="panel score-entry">
            <div class="section-title"><span>⚡</span><h2>RECORD A GAME</h2></div>
            <div class="versus">
              <label>
                <span>🏆 WINNER</span>
                <select id="winner">${this._playerOptions(winner)}</select>
              </label>
              <div class="vs">VS</div>
              <label>
                <span>😢 LOSER</span>
                <select id="loser">${this._playerOptions(loser)}</select>
              </label>
            </div>
            <div class="entry-actions">
              <button class="record-btn" id="record">🏆 RECORD GAME</button>
              <button class="undo-btn" id="undo" ${total ? "" : "disabled"}>↶ UNDO LAST</button>
            </div>
            <div class="last-game">LAST RESULT · <strong>${this._esc(lastResult)}</strong></div>
          </section>

          <section class="panel podium-panel">
            <div class="section-title"><span>🏆</span><h2>LIVE PODIUM</h2></div>
            ${this._podium(active)}
          </section>

          <section class="panel standings-panel">
            <div class="section-title"><span>📋</span><h2>STANDINGS</h2></div>
            <div class="standings-grid">${this._standingsCards(rows)}</div>
          </section>

          <section class="panel chart-panel">
            <div class="section-title"><span>📊</span><h2>GAMES BY DAY</h2><small>LAST 14 ACTIVE DAYS</small></div>
            ${this._dailyBars()}
          </section>

          <section class="panel recent-panel">
            <div class="section-title"><span>🕒</span><h2>RECENT GAMES</h2></div>
            <div class="recent-list">${this._recent()}</div>
          </section>

          <section class="panel rivalry-panel">
            <div class="section-title"><span>⚔️</span><h2>RIVALRIES</h2></div>
            ${this._headToHead(rows)}
          </section>

          <section class="panel hall-panel">
            <div class="section-title"><span>🌟</span><h2>HALL OF FAME</h2></div>
            ${this._hallOfFame(rows)}
          </section>
        </main>
      </div>
    `;

    this.shadowRoot.querySelector("#winner")?.addEventListener("change", (event) => this._setSelect("winner", event.target.value));
    this.shadowRoot.querySelector("#loser")?.addEventListener("change", (event) => this._setSelect("loser", event.target.value));
    this.shadowRoot.querySelector("#record")?.addEventListener("click", () => this._record());
    this.shadowRoot.querySelector("#undo")?.addEventListener("click", () => {
      if (confirm("Undo the most recently recorded game?")) this._undo();
    });
  }

  static styles = `
    :host {
      --bg: #070912;
      --panel: rgba(18, 22, 40, 0.92);
      --panel-2: rgba(28, 33, 59, 0.92);
      --text: #f8fbff;
      --muted: #aab5d6;
      --cyan: #35e7ff;
      --pink: #ff4fd8;
      --gold: #ffd43b;
      --purple: #8b5cf6;
      --green: #46f59a;
      display: block;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(circle at 20% 0%, rgba(139,92,246,.22), transparent 35%),
        radial-gradient(circle at 80% 10%, rgba(53,231,255,.15), transparent 30%),
        linear-gradient(180deg, #090b18, var(--bg));
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    .app { min-height: 100vh; padding: 24px; position: relative; overflow: hidden; }
    .scanlines { position: fixed; inset: 0; pointer-events: none; opacity: .05; background: repeating-linear-gradient(0deg, transparent, transparent 3px, #fff 4px); }
    .hero { max-width: 1500px; margin: 0 auto 22px; padding: 24px 28px; border: 1px solid rgba(53,231,255,.25); border-radius: 24px; background: linear-gradient(135deg, rgba(19,23,44,.96), rgba(11,13,27,.94)); display: flex; align-items: center; justify-content: space-between; gap: 24px; box-shadow: 0 18px 60px rgba(0,0,0,.35), inset 0 0 30px rgba(53,231,255,.04); }
    .eyebrow { color: var(--cyan); letter-spacing: .24em; font-size: .75rem; font-weight: 900; }
    h1 { margin: 7px 0 4px; font-size: clamp(1.7rem, 4vw, 3.2rem); line-height: 1; text-shadow: 0 0 22px rgba(53,231,255,.35); }
    .hero p { color: var(--muted); margin: 0; }
    .hero-stats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .hero-stats div { min-width: 105px; padding: 13px 16px; border-radius: 16px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); text-align: center; }
    .hero-stats span { display: block; font-size: .68rem; color: var(--muted); letter-spacing: .12em; font-weight: 800; }
    .hero-stats b { display: block; margin-top: 5px; font-size: 1.2rem; color: var(--gold); }
    main { max-width: 1500px; margin: 0 auto; display: grid; grid-template-columns: repeat(12, 1fr); gap: 18px; align-items: start; }
    .panel { background: linear-gradient(145deg, var(--panel), rgba(10,12,24,.94)); border: 1px solid rgba(255,255,255,.09); border-radius: 22px; padding: 20px; box-shadow: 0 18px 50px rgba(0,0,0,.28); overflow: hidden; }
    .score-entry { grid-column: span 5; }
    .podium-panel { grid-column: span 7; min-height: 360px; }
    .standings-panel { grid-column: span 7; }
    .chart-panel { grid-column: span 5; }
    .recent-panel { grid-column: span 5; }
    .rivalry-panel { grid-column: span 7; }
    .hall-panel { grid-column: 1 / -1; }
    .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .section-title > span { font-size: 1.35rem; }
    .section-title h2 { margin: 0; font-size: 1rem; letter-spacing: .12em; }
    .section-title small { margin-left: auto; color: var(--muted); font-size: .63rem; }
    .versus { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 14px; }
    label span { display: block; color: var(--muted); font-size: .73rem; font-weight: 900; letter-spacing: .08em; margin: 0 0 7px 3px; }
    select { width: 100%; appearance: none; padding: 16px; color: var(--text); background: var(--panel-2); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; font: inherit; font-weight: 800; outline: none; }
    select:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(53,231,255,.12); }
    .vs { color: var(--pink); font-weight: 1000; font-style: italic; padding-bottom: 15px; text-shadow: 0 0 12px rgba(255,79,216,.55); }
    .entry-actions { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-top: 16px; }
    button { border: 0; border-radius: 14px; padding: 15px 18px; color: white; font: inherit; font-weight: 1000; cursor: pointer; transition: transform .15s ease, filter .15s ease; }
    button:hover { transform: translateY(-2px); filter: brightness(1.12); }
    button:active { transform: translateY(1px); }
    button:disabled { opacity: .35; cursor: not-allowed; transform: none; }
    .record-btn { background: linear-gradient(135deg, #8b5cf6, #ec4899); box-shadow: 0 9px 24px rgba(236,72,153,.25); }
    .undo-btn { background: rgba(255,255,255,.08); }
    .last-game { margin-top: 14px; padding: 12px; border-radius: 12px; color: var(--muted); background: rgba(255,255,255,.035); font-size: .8rem; }
    .last-game strong { color: white; }
    .tie-banner { text-align: center; color: var(--gold); letter-spacing: .18em; font-weight: 1000; margin: 5px 0 16px; }
    .tie-podium { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 14px; }
    .podium-card { text-align: center; padding: 24px 15px; border-radius: 20px; }
    .podium-card.gold { background: linear-gradient(145deg, rgba(255,212,59,.22), rgba(255,150,25,.08)); border: 1px solid rgba(255,212,59,.38); box-shadow: inset 0 0 35px rgba(255,212,59,.06); }
    .crown { font-size: 2rem; animation: float 2s ease-in-out infinite; }
    .medal { color: var(--gold); font-weight: 1000; margin-top: 8px; }
    .podium-name { font-size: 1.7rem; font-weight: 1000; margin-top: 5px; }
    .podium-percent { font-size: 2.4rem; font-weight: 1000; color: var(--gold); }
    .podium-record { color: var(--muted); }
    .podium-stage { min-height: 285px; display: flex; justify-content: center; align-items: end; gap: 8px; padding-top: 35px; }
    .podium-slot { width: 31%; max-width: 220px; display: flex; flex-direction: column; justify-content: flex-end; }
    .podium-person { display: flex; flex-direction: column; align-items: center; gap: 3px; padding-bottom: 10px; }
    .podium-person > span { font-size: 1.8rem; }
    .podium-person strong { font-size: 1.2rem; }
    .podium-person b { font-size: 1.6rem; color: var(--cyan); }
    .podium-person small { color: var(--muted); }
    .champion { position: relative; }
    .floating-crown { position: absolute; top: -30px; animation: float 2s ease-in-out infinite; }
    .block { display: grid; place-items: center; font-size: 2rem; font-weight: 1000; color: rgba(255,255,255,.8); border-radius: 12px 12px 4px 4px; }
    .block-1 { height: 130px; background: linear-gradient(#d9a928, #8a5b09); }
    .block-2 { height: 92px; background: linear-gradient(#8894a6, #4c5868); }
    .block-3 { height: 65px; background: linear-gradient(#b96f3f, #6b3b22); }
    .standings-grid { display: grid; gap: 9px; }
    .player-card { display: grid; grid-template-columns: 70px 1fr 95px 95px 95px; gap: 10px; align-items: center; padding: 13px 15px; border-radius: 15px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.07); }
    .player-card.leader-card { border-color: rgba(255,212,59,.35); background: linear-gradient(90deg, rgba(255,212,59,.1), rgba(255,255,255,.025)); }
    .player-card.inactive { opacity: .5; }
    .rank { font-weight: 1000; color: var(--gold); }
    .player-main h3 { margin: 0; font-size: 1.05rem; }
    .record { color: var(--muted); font-size: .8rem; }
    .percentage { font-size: 1.25rem; font-weight: 1000; color: var(--cyan); text-align: right; }
    .mini-stat { text-align: right; }
    .mini-stat span { display: block; font-size: .63rem; color: var(--muted); }
    .mini-stat b { font-size: 1.05rem; }
    .bar-chart { display: grid; gap: 10px; }
    .bar-row { display: grid; grid-template-columns: 62px 1fr 28px; align-items: center; gap: 10px; }
    .bar-label b, .bar-label small { display: block; }
    .bar-label small { color: var(--muted); font-size: .65rem; }
    .bar-track { height: 14px; border-radius: 999px; background: rgba(255,255,255,.06); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--purple), var(--cyan)); box-shadow: 0 0 12px rgba(53,231,255,.35); }
    .bar-value { font-weight: 1000; color: var(--cyan); }
    .recent-list { display: grid; gap: 9px; }
    .recent-row { display: grid; grid-template-columns: 34px 1fr; gap: 10px; align-items: center; padding: 10px; border-radius: 12px; background: rgba(255,255,255,.035); }
    .recent-number { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: rgba(139,92,246,.25); color: #d9c9ff; font-weight: 1000; }
    .recent-row strong, .recent-row small { display: block; }
    .recent-row small { color: var(--muted); margin-top: 3px; }
    .matrix-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 540px; }
    th, td { padding: 11px 9px; border-bottom: 1px solid rgba(255,255,255,.07); text-align: center; }
    th:first-child { text-align: left; }
    thead th { color: var(--cyan); font-size: .72rem; }
    .diagonal { color: var(--muted); background: rgba(255,255,255,.025); }
    .hof-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .hof-card { min-height: 135px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 15px; text-align: center; border-radius: 16px; background: linear-gradient(145deg, rgba(139,92,246,.12), rgba(53,231,255,.05)); border: 1px solid rgba(255,255,255,.08); }
    .hof-card > span { font-size: 1.7rem; }
    .hof-card small { color: var(--muted); letter-spacing: .08em; font-weight: 900; margin: 6px 0; }
    .hof-card strong { font-size: 1rem; }
    .hof-card b { color: var(--gold); font-size: 1.7rem; }
    .empty { text-align: center; padding: 48px 20px; color: var(--muted); }
    .empty.small { padding: 18px; }
    .empty-icon { font-size: 3rem; }
    .toast { position: fixed; z-index: 20; left: 50%; top: 28px; transform: translate(-50%, -140%); min-width: 300px; max-width: 90vw; padding: 18px 24px; border-radius: 18px; background: linear-gradient(135deg, #8b5cf6, #ec4899); box-shadow: 0 20px 70px rgba(0,0,0,.45); text-align: center; transition: transform .35s cubic-bezier(.2,.9,.2,1.2); }
    .toast.show { transform: translate(-50%, 0); }
    .toast strong, .toast span { display: block; }
    .toast strong { font-size: 1.25rem; letter-spacing: .1em; }
    .toast span { margin-top: 4px; }
    .confetti-layer { position: fixed; z-index: 19; inset: 0; pointer-events: none; overflow: hidden; }
    .confetti-layer span { position: absolute; top: -40px; font-size: 1.5rem; animation: fall linear forwards; }
    @keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }
    @keyframes float { 50% { transform: translateY(-7px) rotate(4deg); } }

    @media (max-width: 1050px) {
      .score-entry, .podium-panel, .standings-panel, .chart-panel, .recent-panel, .rivalry-panel { grid-column: 1 / -1; }
      .hof-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 700px) {
      .app { padding: 10px; }
      .hero { align-items: stretch; flex-direction: column; padding: 19px; }
      .hero-stats { justify-content: stretch; display: grid; grid-template-columns: repeat(3,1fr); }
      .hero-stats div { min-width: 0; padding: 10px 5px; }
      main { gap: 11px; }
      .panel { border-radius: 17px; padding: 15px; }
      .versus { grid-template-columns: 1fr; }
      .vs { text-align: center; padding: 0; }
      .entry-actions { grid-template-columns: 1fr; }
      .podium-stage { min-height: 240px; }
      .podium-person strong { font-size: .9rem; }
      .podium-person b { font-size: 1.2rem; }
      .podium-person small { font-size: .62rem; text-align: center; }
      .player-card { grid-template-columns: 58px 1fr 70px; }
      .mini-stat { display: none; }
      .hof-grid { grid-template-columns: repeat(2, 1fr); }
      .bar-row { grid-template-columns: 50px 1fr 24px; }
    }
  `;
}

if (!customElements.get("trouble-championship-panel")) {
  customElements.define("trouble-championship-panel", TroubleChampionshipPanel);
}
