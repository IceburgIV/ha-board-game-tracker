"""Calculated sensors for Trouble Championship."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import TroubleConfigEntry
from .entity import TroubleEntity
from .model import TroubleChampionship


async def async_setup_entry(
    hass,
    entry: TroubleConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up championship sensors."""
    championship = entry.runtime_data
    entities: list[SensorEntity] = [
        TotalGamesSensor(championship),
        GamesTodaySensor(championship),
        LeaderSensor(championship),
        LastResultSensor(championship),
        StandingsSensor(championship),
        HistorySensor(championship),
        HeadToHeadSensor(championship),
        DailyGamesSensor(championship),
    ]
    entities.extend(PlayerSensor(championship, player) for player in championship.players)
    async_add_entities(entities)


class TotalGamesSensor(TroubleEntity, SensorEntity):
    """Lifetime game total."""

    _attr_name = "Total Games"
    _attr_icon = "mdi:dice-multiple"
    _attr_native_unit_of_measurement = "games"
    _attr_state_class = SensorStateClass.TOTAL_INCREASING

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_total_games"

    @property
    def native_value(self) -> int:
        return len(self.championship.games)


class GamesTodaySensor(TroubleEntity, SensorEntity):
    """Today's game count, suitable for daily max graphs."""

    _attr_name = "Games Today"
    _attr_icon = "mdi:calendar-today"
    _attr_native_unit_of_measurement = "games"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_games_today"

    @property
    def native_value(self) -> int:
        return self.championship.games_today()


class LeaderSensor(TroubleEntity, SensorEntity):
    """Current leader or tied leaders."""

    _attr_name = "Leader"
    _attr_icon = "mdi:crown"

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_leader"

    @property
    def native_value(self) -> str:
        return self.championship.leader_text()

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        first = [row for row in self.championship.standings() if row["rank"] == 1]
        return {"leaders": [row["player"] for row in first], "tied": len(first) > 1}


class LastResultSensor(TroubleEntity, SensorEntity):
    """Most recent result."""

    _attr_name = "Last Result"
    _attr_icon = "mdi:history"

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_last_result"

    @property
    def native_value(self) -> str:
        recent = self.championship.recent_games(1)
        return recent[0]["result"] if recent else "No games yet"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        recent = self.championship.recent_games(1)
        return recent[0] if recent else {}


class StandingsSensor(TroubleEntity, SensorEntity):
    """Tie-aware standings in attributes."""

    _attr_name = "Standings"
    _attr_icon = "mdi:podium"

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_standings"

    @property
    def native_value(self) -> int:
        return len([row for row in self.championship.standings() if row["games"] > 0])

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"standings": self.championship.standings()}


class HistorySensor(TroubleEntity, SensorEntity):
    """Recent event history."""

    _attr_name = "Recent Games"
    _attr_icon = "mdi:format-list-numbered"

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_recent_games"

    @property
    def native_value(self) -> int:
        return len(self.championship.games)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"games": self.championship.recent_games(20)}


class HeadToHeadSensor(TroubleEntity, SensorEntity):
    """Head-to-head matrix."""

    _attr_name = "Head to Head"
    _attr_icon = "mdi:sword-cross"

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_head_to_head"

    @property
    def native_value(self) -> int:
        return len(self.championship.games)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"matrix": self.championship.head_to_head()}


class DailyGamesSensor(TroubleEntity, SensorEntity):
    """Complete daily totals in attributes."""

    _attr_name = "Daily Games"
    _attr_icon = "mdi:chart-bar"

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_daily_games"

    @property
    def native_value(self) -> int:
        values = self.championship.games_by_day().values()
        return max(values, default=0)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        summary = self.championship.summary()
        return {
            "games_by_day": summary["games_by_day"],
            "busiest_day_count": summary["busiest_day_count"],
            "busiest_days": summary["busiest_days"],
        }


class PlayerSensor(TroubleEntity, SensorEntity):
    """One player's complete record."""

    _attr_icon = "mdi:account"
    _attr_native_unit_of_measurement = "%"

    def __init__(self, championship: TroubleChampionship, player: str) -> None:
        super().__init__(championship)
        self.player = player
        self._attr_name = f"{player} Record"
        slug = player.casefold().replace(" ", "_")
        self._attr_unique_id = f"{championship.entry.entry_id}_player_{slug}"

    @property
    def native_value(self) -> float:
        return self.championship.player_stats(self.player)["win_percentage"]

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return self.championship.player_stats(self.player)
