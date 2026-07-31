"""Config flow for Trouble Championship."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import (
    CONF_CHAMPIONSHIP_NAME,
    CONF_PLAYER_1,
    CONF_PLAYER_2,
    CONF_PLAYER_3,
    CONF_PLAYER_4,
    CONF_PLAYER_5,
    DEFAULT_NAME,
    DEFAULT_PLAYERS,
    DOMAIN,
)


class TroubleChampionshipConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Configure a championship."""

    VERSION = 1

    async def async_step_user(
        self,
        user_input: dict | None = None,
    ) -> FlowResult:
        """Handle initial setup."""
        errors: dict[str, str] = {}

        if user_input is not None:
            players = [
                user_input[CONF_PLAYER_1].strip(),
                user_input[CONF_PLAYER_2].strip(),
                user_input[CONF_PLAYER_3].strip(),
                user_input[CONF_PLAYER_4].strip(),
                user_input[CONF_PLAYER_5].strip(),
            ]
            normalized = [player.casefold() for player in players]
            if any(not player for player in players):
                errors["base"] = "empty_player"
            elif len(set(normalized)) != len(normalized):
                errors["base"] = "duplicate_players"
            else:
                await self.async_set_unique_id(
                    user_input[CONF_CHAMPIONSHIP_NAME].strip().casefold()
                )
                self._abort_if_unique_id_configured()
                data = dict(user_input)
                for index, player in enumerate(players, start=1):
                    data[f"player_{index}"] = player
                return self.async_create_entry(
                    title=user_input[CONF_CHAMPIONSHIP_NAME].strip(),
                    data=data,
                )

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_CHAMPIONSHIP_NAME,
                    default=DEFAULT_NAME,
                ): str,
                vol.Required(CONF_PLAYER_1, default=DEFAULT_PLAYERS[0]): str,
                vol.Required(CONF_PLAYER_2, default=DEFAULT_PLAYERS[1]): str,
                vol.Required(CONF_PLAYER_3, default=DEFAULT_PLAYERS[2]): str,
                vol.Required(CONF_PLAYER_4, default=DEFAULT_PLAYERS[3]): str,
                vol.Required(CONF_PLAYER_5, default=DEFAULT_PLAYERS[4]): str,
            }
        )
        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
        )
