
"""Config flow."""
import voluptuous as vol
from homeassistant import config_entries
from .const import *
class TroubleChampionshipConfigFlow(config_entries.ConfigFlow,domain=DOMAIN):
    VERSION=1
    async def async_step_user(self,user_input=None):
        errors={}
        if user_input is not None:
            players=[user_input[CONF_PLAYER_1].strip(),user_input[CONF_PLAYER_2].strip(),user_input[CONF_PLAYER_3].strip(),user_input[CONF_PLAYER_4].strip(),user_input[CONF_PLAYER_5].strip()]
            if any(not p for p in players): errors["base"]="empty_player"
            elif len({p.casefold() for p in players})!=len(players): errors["base"]="duplicate_players"
            else:
                await self.async_set_unique_id(user_input[CONF_CHAMPIONSHIP_NAME].strip().casefold()); self._abort_if_unique_id_configured()
                return self.async_create_entry(title=user_input[CONF_CHAMPIONSHIP_NAME].strip(),data=user_input)
        return self.async_show_form(step_id="user",data_schema=vol.Schema({
            vol.Required(CONF_CHAMPIONSHIP_NAME,default=DEFAULT_NAME):str,
            vol.Required(CONF_PLAYER_1,default=DEFAULT_PLAYERS[0]):str,
            vol.Required(CONF_PLAYER_2,default=DEFAULT_PLAYERS[1]):str,
            vol.Required(CONF_PLAYER_3,default=DEFAULT_PLAYERS[2]):str,
            vol.Required(CONF_PLAYER_4,default=DEFAULT_PLAYERS[3]):str,
            vol.Required(CONF_PLAYER_5,default=DEFAULT_PLAYERS[4]):str}),errors=errors)
