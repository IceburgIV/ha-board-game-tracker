"""Persistent game model for Trouble Championship."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from typing import Any
from uuid import uuid4

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, STORAGE_KEY_PREFIX, STORAGE_VERSION, UPDATE_SIGNAL


class TroubleChampionship:
    """Own the event log and calculate all championship statistics."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        name: str,
        players: list[str],
    ) -> None:
        self.hass = hass
        self.entry = entry
        self.name = name
        self.players = players
        self.games: list[dict[str, str]] = []
        self.winner_selection = players[0]
        self.loser_selection = players[1]
        self._store: Store[dict[str, Any]] = Store(
            hass,
            STORAGE_VERSION,
            f"{STORAGE_KEY_PREFIX}.{entry.entry_id}",
        )

    @property
    def signal(self) -> str:
        """Return this entry's dispatcher signal."""
        return f"{UPDATE_SIGNAL}_{self.entry.entry_id}"

    async def async_load(self) -> None:
        """Load the event log."""
        data = await self._store.async_load()
        if not data:
            return
        games = data.get("games", [])
        if isinstance(games, list):
            self.games = [
                game
                for game in games
                if isinstance(game, dict)
                and game.get("winner") in self.players
                and game.get("loser") in self.players
                and game.get("winner") != game.get("loser")
                and isinstance(game.get("timestamp"), str)
            ]

    async def _async_save_and_update(self) -> None:
        """Persist and notify entities."""
        await self._store.async_save({"games": self.games})
        async_dispatcher_send(self.hass, self.signal)

    def set_winner(self, player: str) -> None:
        """Set winner selection."""
        if player in self.players:
            self.winner_selection = player
            async_dispatcher_send(self.hass, self.signal)

    def set_loser(self, player: str) -> None:
        """Set loser selection."""
        if player in self.players:
            self.loser_selection = player
            async_dispatcher_send(self.hass, self.signal)

    async def async_record_game(self) -> None:
        """Append one game to the immutable-style event log."""
        if self.winner_selection == self.loser_selection:
            raise ValueError("Winner and loser must be different players")

        now = dt_util.now()
        self.games.append(
            {
                "id": uuid4().hex,
                "winner": self.winner_selection,
                "loser": self.loser_selection,
                "timestamp": now.isoformat(),
            }
        )
        await self._async_save_and_update()

    async def async_undo_last(self) -> bool:
        """Remove the most recent game."""
        if not self.games:
            return False
        self.games.pop()
        await self._async_save_and_update()
        return True

    async def async_clear_all(self) -> None:
        """Clear the complete event log."""
        self.games = []
        await self._async_save_and_update()

    def _local_datetime(self, game: dict[str, str]) -> datetime:
        """Convert a stored ISO timestamp to local time."""
        parsed = dt_util.parse_datetime(game["timestamp"])
        if parsed is None:
            return dt_util.now()
        return dt_util.as_local(parsed)

    def player_stats(self, player: str) -> dict[str, Any]:
        """Return all stats for a player."""
        wins = 0
        losses = 0
        current_win_streak = 0
        current_loss_streak = 0
        longest_win_streak = 0
        running_win_streak = 0
        last_played: str | None = None
        last_result: str | None = None
        opponents: Counter[str] = Counter()

        for game in self.games:
            if game["winner"] == player:
                wins += 1
                running_win_streak += 1
                longest_win_streak = max(longest_win_streak, running_win_streak)
                current_win_streak = running_win_streak
                current_loss_streak = 0
                last_played = game["timestamp"]
                last_result = f"Won vs {game['loser']}"
                opponents[game["loser"]] += 1
            elif game["loser"] == player:
                losses += 1
                running_win_streak = 0
                current_win_streak = 0
                current_loss_streak += 1
                last_played = game["timestamp"]
                last_result = f"Lost vs {game['winner']}"

        games = wins + losses
        win_percentage = round((wins / games) * 100, 1) if games else 0.0
        return {
            "wins": wins,
            "losses": losses,
            "games": games,
            "win_percentage": win_percentage,
            "current_win_streak": current_win_streak,
            "current_loss_streak": current_loss_streak,
            "longest_win_streak": longest_win_streak,
            "last_played": last_played,
            "last_result": last_result,
            "opponents_defeated": dict(opponents),
        }

    def standings(self) -> list[dict[str, Any]]:
        """Return tie-aware competition standings."""
        rows = []
        for player in self.players:
            stats = self.player_stats(player)
            rows.append({"player": player, **stats})

        active = [row for row in rows if row["games"] > 0]
        active.sort(
            key=lambda row: (
                -row["win_percentage"],
                -row["wins"],
                row["player"].casefold(),
            )
        )

        last_key: tuple[float, int] | None = None
        rank = 0
        for position, row in enumerate(active, start=1):
            key = (row["win_percentage"], row["wins"])
            if key != last_key:
                rank = position
                last_key = key
            row["rank"] = rank
            row["tied"] = sum(
                1
                for candidate in active
                if (
                    candidate["win_percentage"],
                    candidate["wins"],
                )
                == key
            ) > 1

        inactive = [row for row in rows if row["games"] == 0]
        for row in inactive:
            row["rank"] = None
            row["tied"] = False

        return active + inactive

    def head_to_head(self) -> dict[str, dict[str, int]]:
        """Return directed wins matrix."""
        matrix = {
            player: {opponent: 0 for opponent in self.players if opponent != player}
            for player in self.players
        }
        for game in self.games:
            matrix[game["winner"]][game["loser"]] += 1
        return matrix

    def games_by_day(self) -> dict[str, int]:
        """Return local-date game totals."""
        totals: Counter[str] = Counter()
        for game in self.games:
            totals[self._local_datetime(game).date().isoformat()] += 1
        return dict(sorted(totals.items()))

    def games_today(self) -> int:
        """Return today's total."""
        return self.games_by_day().get(dt_util.now().date().isoformat(), 0)

    def recent_games(self, limit: int = 20) -> list[dict[str, str]]:
        """Return newest games first, with friendly local timestamps."""
        result = []
        for game in reversed(self.games[-limit:]):
            local = self._local_datetime(game)
            result.append(
                {
                    **game,
                    "display_time": local.strftime("%b %-d, %Y %-I:%M %p"),
                    "result": f"{game['winner']} defeated {game['loser']}",
                }
            )
        return result

    def leader_text(self) -> str:
        """Return one leader or a tie statement."""
        active = [row for row in self.standings() if row["rank"] == 1]
        if not active:
            return "No games yet"
        if len(active) == 1:
            return active[0]["player"]
        return " & ".join(row["player"] for row in active)

    def summary(self) -> dict[str, Any]:
        """Return championship-wide computed attributes."""
        by_day = self.games_by_day()
        busiest_count = max(by_day.values(), default=0)
        busiest_days = [day for day, count in by_day.items() if count == busiest_count]
        last = self.recent_games(1)
        return {
            "total_games": len(self.games),
            "games_today": self.games_today(),
            "leader": self.leader_text(),
            "standings": self.standings(),
            "head_to_head": self.head_to_head(),
            "games_by_day": by_day,
            "busiest_day_count": busiest_count,
            "busiest_days": busiest_days,
            "last_result": last[0]["result"] if last else None,
            "recent_games": self.recent_games(20),
        }
