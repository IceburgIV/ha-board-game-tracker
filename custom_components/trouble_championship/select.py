"""Winner and loser selection entities."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import TroubleConfigEntry
from .entity import TroubleEntity
from .model import TroubleChampionship


async def async_setup_entry(
    hass,
    entry: TroubleConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up selection entities."""
    championship = entry.runtime_data
    async_add_entities(
        [
            TroublePlayerSelect(championship, "winner"),
            TroublePlayerSelect(championship, "loser"),
        ]
    )


class TroublePlayerSelect(TroubleEntity, SelectEntity):
    """Player selector."""

    def __init__(self, championship: TroubleChampionship, role: str) -> None:
        super().__init__(championship)
        self.role = role
        self._attr_name = role.title()
        self._attr_unique_id = f"{championship.entry.entry_id}_{role}"
        self._attr_icon = "mdi:trophy" if role == "winner" else "mdi:emoticon-sad-outline"
        self._attr_options = championship.players

    @property
    def current_option(self) -> str:
        """Return selected player."""
        if self.role == "winner":
            return self.championship.winner_selection
        return self.championship.loser_selection

    async def async_select_option(self, option: str) -> None:
        """Set selected player."""
        if self.role == "winner":
            self.championship.set_winner(option)
        else:
            self.championship.set_loser(option)
