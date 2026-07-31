"""Shared entity base for Trouble Championship."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from .const import DOMAIN
from .model import TroubleChampionship


class TroubleEntity(Entity):
    """Base entity tied to one championship."""

    _attr_has_entity_name = True

    def __init__(self, championship: TroubleChampionship) -> None:
        self.championship = championship
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, championship.entry.entry_id)},
            name=championship.name,
            manufacturer="Family Game Tracker",
            model="Trouble Championship Rev 3",
            sw_version="3.0.0",
        )

    async def async_added_to_hass(self) -> None:
        """Subscribe to model updates."""
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                self.championship.signal,
                self.async_write_ha_state,
            )
        )
