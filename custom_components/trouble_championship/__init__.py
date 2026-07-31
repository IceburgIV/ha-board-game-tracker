"""Trouble Championship integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    CONF_CHAMPIONSHIP_NAME,
    CONF_PLAYER_1,
    CONF_PLAYER_2,
    CONF_PLAYER_3,
    CONF_PLAYER_4,
    CONF_PLAYER_5,
    DOMAIN,
    PLATFORMS,
)
from .model import TroubleChampionship

type TroubleConfigEntry = ConfigEntry[TroubleChampionship]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: TroubleConfigEntry,
) -> bool:
    """Set up Trouble Championship from a config entry."""
    players = [
        entry.data[CONF_PLAYER_1],
        entry.data[CONF_PLAYER_2],
        entry.data[CONF_PLAYER_3],
        entry.data[CONF_PLAYER_4],
        entry.data[CONF_PLAYER_5],
    ]
    championship = TroubleChampionship(
        hass,
        entry,
        entry.data[CONF_CHAMPIONSHIP_NAME],
        players,
    )
    await championship.async_load()
    entry.runtime_data = championship
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: TroubleConfigEntry,
) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
