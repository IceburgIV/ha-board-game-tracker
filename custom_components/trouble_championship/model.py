
"""Persistent league model."""

from __future__ import annotations
from collections import Counter
from datetime import timedelta
from typing import Any
from uuid import uuid4
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from .const import (
    DEFAULT_ACTIVE_DAYS,
    DEFAULT_MIN_GAMES,
    DUPLICATE_WINDOW_SECONDS,
    STORAGE_KEY_PREFIX,
    STORAGE_VERSION,
    UPDATE_SIGNAL,
)


class DuplicateGameError(ValueError):
    """Raised when an identical result was recorded moments ago."""

    def __init__(self, game: dict[str, str], seconds_ago: float) -> None:
        super().__init__("An identical result was just recorded")
        self.game = game
        self.seconds_ago = seconds_ago


class TroubleChampionship:
    def __init__(self, hass, entry, name: str, initial_players: list[str]) -> None:
        self.hass, self.entry, self.name = hass, entry, name
        self.initial_players = initial_players
        self.players: list[dict[str, Any]] = []
        self.games: list[dict[str, str]] = []
        self.deleted_games: list[dict[str, str]] = []
        self.active_days = DEFAULT_ACTIVE_DAYS
        self.minimum_games = DEFAULT_MIN_GAMES
        self.winner_selection, self.loser_selection = initial_players[0], initial_players[1]
        self._store = Store(hass, STORAGE_VERSION, f"{STORAGE_KEY_PREFIX}.{entry.entry_id}")

    @property
    def signal(self): return f"{UPDATE_SIGNAL}_{self.entry.entry_id}"
    @property
    def player_names(self): return [p["name"] for p in self.players]

    def _default_player(self, name):
        guest = name.casefold() == "guest"
        return {"name": name, "ranked": not guest, "counts_for_rankings": not guest,
                "podium_enabled": not guest, "generic_guest": guest}

    async def async_load(self):
        data = await self._store.async_load() or {}
        stored = data.get("players")
        self.players = [
            {"name": str(p.get("name","")).strip(), "ranked": bool(p.get("ranked",True)),
             "counts_for_rankings": bool(p.get("counts_for_rankings",True)),
             "podium_enabled": bool(p.get("podium_enabled",True)),
             "generic_guest": bool(p.get("generic_guest",False))}
            for p in stored if isinstance(p,dict) and str(p.get("name","")).strip()
        ] if isinstance(stored,list) and stored else [self._default_player(n) for n in self.initial_players]
        names=set(self.player_names)
        self.games=[g for g in data.get("games",[]) if isinstance(g,dict) and g.get("winner") in names and g.get("loser") in names and g.get("winner")!=g.get("loser") and isinstance(g.get("timestamp"),str)]
        self.deleted_games=[g for g in data.get("deleted_games",[]) if isinstance(g,dict) and isinstance(g.get("timestamp"),str)]
        self.active_days=int(data.get("active_days",DEFAULT_ACTIVE_DAYS))
        self.minimum_games=int(data.get("minimum_games",DEFAULT_MIN_GAMES))
        await self._save()

    async def _save(self):
        await self._store.async_save({"players":self.players,"games":self.games,"deleted_games":self.deleted_games[-25:],
                                      "active_days":self.active_days,"minimum_games":self.minimum_games})
    async def _changed(self):
        await self._save(); async_dispatcher_send(self.hass,self.signal)

    def player_config(self,name):
        return next((p for p in self.players if p["name"]==name), self._default_player(name))
    def set_winner(self,p):
        if p in self.player_names: self.winner_selection=p; async_dispatcher_send(self.hass,self.signal)
    def set_loser(self,p):
        if p in self.player_names: self.loser_selection=p; async_dispatcher_send(self.hass,self.signal)

    async def async_add_player(self,name,ranked=True,counts_for_rankings=True,podium_enabled=True):
        name=name.strip()
        if not name: raise ValueError("Player name cannot be blank")
        if any(p["name"].casefold()==name.casefold() for p in self.players): raise ValueError("Player already exists")
        self.players.append({"name":name,"ranked":ranked,"counts_for_rankings":counts_for_rankings,
                             "podium_enabled":podium_enabled,"generic_guest":False})
        await self._changed()

    async def async_update_player(self,name,ranked,counts_for_rankings,podium_enabled):
        p=next((x for x in self.players if x["name"]==name),None)
        if not p: raise ValueError("Unknown player")
        p.update({"ranked":ranked,"counts_for_rankings":counts_for_rankings,"podium_enabled":podium_enabled})
        await self._changed()

    def recent_duplicate(self, winner, loser, now=None):
        """Return a matching result recorded inside the duplicate safety window."""
        now = now or dt_util.now()
        for game in reversed(self.games):
            if game.get("winner") != winner or game.get("loser") != loser:
                continue
            recorded = dt_util.parse_datetime(game.get("timestamp"))
            if recorded is None:
                return None
            seconds_ago = (now - recorded).total_seconds()
            if 0 <= seconds_ago <= DUPLICATE_WINDOW_SECONDS:
                return game, seconds_ago
            return None
        return None

    async def async_record_game(self,winner=None,loser=None,timestamp=None,force=False):
        winner,loser=winner or self.winner_selection,loser or self.loser_selection
        if winner not in self.player_names or loser not in self.player_names: raise ValueError("Unknown player")
        if winner==loser: raise ValueError("Winner and loser must be different")
        parsed=dt_util.parse_datetime(timestamp) if timestamp else None
        now=parsed or dt_util.now()
        duplicate=self.recent_duplicate(winner,loser,now)
        if duplicate and not force:
            raise DuplicateGameError(duplicate[0],duplicate[1])
        g={"id":uuid4().hex,"winner":winner,"loser":loser,"timestamp":now.isoformat()}
        self.games.append(g); await self._changed(); return g

    async def async_undo_last(self):
        if not self.games: return False
        self.deleted_games.append(self.games.pop()); await self._changed(); return True
    async def async_delete_game(self,game_id):
        for i,g in enumerate(self.games):
            if g["id"]==game_id:
                self.deleted_games.append(self.games.pop(i)); await self._changed(); return
        raise ValueError("Game not found")
    async def async_restore_game(self,game_id=None):
        if not self.deleted_games: raise ValueError("Nothing to restore")
        g=self.deleted_games.pop() if game_id is None else next((x for x in self.deleted_games if x["id"]==game_id),None)
        if g is None: raise ValueError("Deleted game not found")
        if game_id is not None: self.deleted_games.remove(g)
        self.games.append(g); self.games.sort(key=lambda x:x["timestamp"]); await self._changed()

    def _local(self,g):
        dt=dt_util.parse_datetime(g["timestamp"]); return dt_util.as_local(dt) if dt else dt_util.now()
    def game_is_qualifying(self,g):
        return self.player_config(g["winner"])["counts_for_rankings"] and self.player_config(g["loser"])["counts_for_rankings"]
    def _for(self,p,qualified=False):
        return [g for g in self.games if p in (g["winner"],g["loser"]) and (not qualified or self.game_is_qualifying(g))]
    def _streak(self,p,games):
        rel=[g for g in games if p in (g["winner"],g["loser"])]
        if not rel:return None,0
        win=rel[-1]["winner"]==p; n=0
        for g in reversed(rel):
            if (g["winner"]==p)!=win: break
            n+=1
        return ("W" if win else "L"),n
    def _best(self,p,games):
        run=best=0
        for g in games:
            if p not in (g["winner"],g["loser"]): continue
            run=run+1 if g["winner"]==p else 0; best=max(best,run)
        return best

    def player_stats(self,p):
        allg,league=self._for(p),self._for(p,True)
        aw=sum(g["winner"]==p for g in allg); lw=sum(g["winner"]==p for g in league)
        st,sc=self._streak(p,allg)
        lastq=league[-1] if league else None
        qdt=dt_util.parse_datetime(lastq["timestamp"]) if lastq else None
        active=bool(qdt and qdt>=dt_util.now()-timedelta(days=self.active_days))
        cfg=self.player_config(p)
        qualified=cfg["ranked"] and cfg["podium_enabled"] and active and len(league)>=self.minimum_games
        return {"wins":lw,"losses":len(league)-lw,"games":len(league),
                "win_percentage":round(lw/len(league)*100,1) if league else 0.0,
                "all_wins":aw,"all_losses":len(allg)-aw,"all_games":len(allg),
                "all_win_percentage":round(aw/len(allg)*100,1) if allg else 0.0,
                "streak_type":st,"streak_count":sc,"streak_label":f"{st}{sc}" if st else "—",
                "longest_win_streak":self._best(p,allg),"active":active,"qualified":qualified,
                "provisional_games_needed":max(0,self.minimum_games-len(league)),**cfg}

    def standings(self):
        rows=[{"player":p,**self.player_stats(p)} for p in self.player_names]
        eligible=[r for r in rows if r["qualified"]]
        eligible.sort(key=lambda r:(-r["win_percentage"],-r["wins"],r["player"].casefold()))
        last=None; rank=0
        for pos,r in enumerate(eligible,1):
            key=(r["win_percentage"],r["wins"])
            if key!=last: rank=pos; last=key
            r["rank"]=rank; r["tied"]=sum(1 for x in eligible if (x["win_percentage"],x["wins"])==key)>1
        others=[r for r in rows if not r["qualified"]]
        for r in others:r["rank"]=None;r["tied"]=False
        return eligible+others

    def head_to_head(self):
        m={p:{} for p in self.player_names}
        for p in self.player_names:
            for o in self.player_names:
                if p==o: continue
                gs=[g for g in self.games if {g["winner"],g["loser"]}=={p,o}]
                w=sum(g["winner"]==p for g in gs); st,sc=self._streak(p,gs)
                m[p][o]={"wins":w,"losses":len(gs)-w,"games":len(gs),
                         "win_percentage":round(w/len(gs)*100,1) if gs else 0.0,
                         "streak_type":st,"streak_count":sc,"streak_label":f"{st}{sc}" if st else "—"}
        return m

    def games_by_day(self):
        c=Counter()
        for g in self.games:c[self._local(g).date().isoformat()]+=1
        return dict(sorted(c.items()))
    def recent_games(self,limit=20):
        out=[]
        for g in reversed(self.games[-limit:]):
            local=self._local(g); out.append({**g,"date":local.date().isoformat(),
                "display_time":local.strftime("%b %-d, %Y %-I:%M %p"),
                "result":f"{g['winner']} defeated {g['loser']}","qualifying":self.game_is_qualifying(g)})
        return out

    def insights(self):
        out=[]; rows=self.standings(); m=self.head_to_head()
        for r in rows:
            if r["streak_type"]=="W" and r["streak_count"]>=2: out.append(f"🔥 {r['player']} is riding a {r['streak_count']}-game winning streak.")
            if r["streak_type"]=="L" and r["streak_count"]>=2: out.append(f"🧊 {r['player']} has dropped {r['streak_count']} straight games.")
        for p in self.player_names:
            for o in self.player_names:
                if p>=o: continue
                a,b=m[p][o],m[o][p]
                if a["games"]>=3:
                    if a["streak_type"]=="L" and a["streak_count"]>=3: out.append(f"⚔️ {p} has not beaten {o} in {a['streak_count']} straight meetings.")
                    if b["streak_type"]=="L" and b["streak_count"]>=3: out.append(f"⚔️ {o} has not beaten {p} in {b['streak_count']} straight meetings.")
                    if abs(a["wins"]-b["wins"])>=3:
                        leader=p if a["wins"]>b["wins"] else o; other=o if leader==p else p
                        out.append(f"📈 {leader} owns a {m[leader][other]['win_percentage']}% lifetime win rate against {other}.")
                    elif a["wins"]==b["wins"]: out.append(f"🤝 {p} and {o} are deadlocked {a['wins']}–{b['wins']}.")
        rivalry=max(((m[p][o]["games"],p,o) for p in self.player_names for o in self.player_names if p<o),default=None)
        if rivalry and rivalry[0]: out.append(f"🎮 The busiest rivalry is {rivalry[1]} vs {rivalry[2]} with {rivalry[0]} games.")
        return list(dict.fromkeys(out))[:12]

    def leader_text(self):
        x=[r for r in self.standings() if r["rank"]==1]
        return " & ".join(r["player"] for r in x) if x else "No qualified leader"
    def snapshot(self):
        return {"name":self.name,"players":self.players,"active_days":self.active_days,"minimum_games":self.minimum_games,
                "total_games":len(self.games),"leader":self.leader_text(),"standings":self.standings(),
                "head_to_head":self.head_to_head(),"games_by_day":self.games_by_day(),
                "recent_games":self.recent_games(50),"all_games":self.recent_games(len(self.games)),
                "deleted_games":list(reversed(self.deleted_games[-10:])), "insights":self.insights()}
