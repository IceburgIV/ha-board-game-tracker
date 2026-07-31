"""Record and undo buttons."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import TroubleConfigEntry
from .entity import TroubleEntity
from .model import TroubleChampionship


async def async_setup_entry(
    hass,
    entry: TroubleConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up button entities."""
    championship = entry.runtime_data
    async_add_entities(
        [
            RecordGameButton(championship),
            UndoGameButton(championship),
            ClearAllButton(championship),
        ]
    )


class RecordGameButton(TroubleEntity, ButtonEntity):
    """Record the selected result."""

    _attr_name = "Record Game"
    _attr_icon = "mdi:trophy"

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_record_game"

    async def async_press(self) -> None:
        """Record the game."""
        await self.championship.async_record_game()


class UndoGameButton(TroubleEntity, ButtonEntity):
    """Undo the most recent game."""

    _attr_name = "Undo Last Game"
    _attr_icon = "mdi:undo"

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_undo_last_game"

    @property
    def available(self) -> bool:
        """Only enable undo when history exists."""
        return bool(self.championship.games)

    async def async_press(self) -> None:
        """Undo the latest game."""
        await self.championship.async_undo_last()


class ClearAllButton(TroubleEntity, ButtonEntity):
    """Clear the complete event log."""

    _attr_name = "Clear All Games"
    _attr_icon = "mdi:delete-forever"
    _attr_entity_registry_enabled_default = False

    def __init__(self, championship: TroubleChampionship) -> None:
        super().__init__(championship)
        self._attr_unique_id = f"{championship.entry.entry_id}_clear_all_games"

    async def async_press(self) -> None:
        """Clear every game."""
        await self.championship.async_clear_all()
