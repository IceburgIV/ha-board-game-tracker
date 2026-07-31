
"""Trouble Championship Rev 5 integration."""
from __future__ import annotations

from pathlib import Path
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import async_register_panel
from .const import *
from .model import DuplicateGameError

def _model(hass, entry_id):
    entry=hass.config_entries.async_get_entry(entry_id)
    if entry is None or not hasattr(entry,"runtime_data"): raise ValueError("Championship not found")
    return entry.runtime_data

@websocket_api.websocket_command({vol.Required("type"):"trouble_championship/get_data",vol.Required("entry_id"):str})
@websocket_api.async_response
async def ws_get(hass,connection,msg): connection.send_result(msg["id"],_model(hass,msg["entry_id"]).snapshot())

@websocket_api.websocket_command({
    vol.Required("type"): "trouble_championship/record_game",
    vol.Required("entry_id"): str,
    vol.Required("winner"): str,
    vol.Required("loser"): str,
    vol.Optional("force", default=False): bool,
})
@websocket_api.async_response
async def ws_record(hass, connection, msg):
    try:
        model = _model(hass, msg["entry_id"])
        game = await model.async_record_game(
            winner=msg["winner"],
            loser=msg["loser"],
            force=msg["force"],
        )
        connection.send_result(
            msg["id"],
            {"status": "recorded", "game": game, "data": model.snapshot()},
        )
    except DuplicateGameError as err:
        connection.send_result(
            msg["id"],
            {
                "status": "duplicate",
                "duplicate": {
                    **err.game,
                    "seconds_ago": round(err.seconds_ago, 1),
                },
                "data": _model(hass, msg["entry_id"]).snapshot(),
            },
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_request", str(err))


@websocket_api.websocket_command({vol.Required("type"):"trouble_championship/add_player",vol.Required("entry_id"):str,vol.Required("name"):str,
                                  vol.Optional("ranked",default=True):bool,vol.Optional("counts_for_rankings",default=True):bool,
                                  vol.Optional("podium_enabled",default=True):bool})
@websocket_api.async_response
async def ws_add_player(hass,connection,msg):
    try:
        m=_model(hass,msg["entry_id"]); await m.async_add_player(msg["name"],msg["ranked"],msg["counts_for_rankings"],msg["podium_enabled"])
        connection.send_result(msg["id"],m.snapshot())
    except ValueError as e: connection.send_error(msg["id"],"invalid_request",str(e))

@websocket_api.websocket_command({vol.Required("type"):"trouble_championship/update_player",vol.Required("entry_id"):str,vol.Required("name"):str,
                                  vol.Required("ranked"):bool,vol.Required("counts_for_rankings"):bool,vol.Required("podium_enabled"):bool})
@websocket_api.async_response
async def ws_update_player(hass,connection,msg):
    try:
        m=_model(hass,msg["entry_id"]); await m.async_update_player(msg["name"],msg["ranked"],msg["counts_for_rankings"],msg["podium_enabled"])
        connection.send_result(msg["id"],m.snapshot())
    except ValueError as e: connection.send_error(msg["id"],"invalid_request",str(e))

@websocket_api.websocket_command({vol.Required("type"):"trouble_championship/delete_game",vol.Required("entry_id"):str,vol.Required("game_id"):str})
@websocket_api.async_response
async def ws_delete(hass,connection,msg):
    try:
        m=_model(hass,msg["entry_id"]); await m.async_delete_game(msg["game_id"]); connection.send_result(msg["id"],m.snapshot())
    except ValueError as e: connection.send_error(msg["id"],"invalid_request",str(e))

@websocket_api.websocket_command({vol.Required("type"):"trouble_championship/restore_game",vol.Required("entry_id"):str,vol.Optional("game_id"):str})
@websocket_api.async_response
async def ws_restore(hass,connection,msg):
    try:
        m=_model(hass,msg["entry_id"]); await m.async_restore_game(msg.get("game_id")); connection.send_result(msg["id"],m.snapshot())
    except ValueError as e: connection.send_error(msg["id"],"invalid_request",str(e))


_FRONTEND_REGISTERED = "trouble_championship_frontend_registered"


async def _async_register_frontend(hass) -> None:
    """Serve the bundled frontend exactly once."""
    if hass.data.get(_FRONTEND_REGISTERED):
        return

    frontend_file = Path(__file__).parent / "frontend" / "trouble-league-panel.js"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL, str(frontend_file), False)]
    )
    hass.data[_FRONTEND_REGISTERED] = True


async def _async_register_panel(hass, entry) -> None:
    """Register the custom panel using Home Assistant's custom-panel loader."""
    await async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_COMPONENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{FRONTEND_URL}?v=0.0.2",
        config={
            "entry_id": entry.entry_id,
            "prefix": "trouble_championship",
            "title": "TROUBLE CHAMPIONSHIP",
        },
        require_admin=False,
    )


async def async_setup(hass,config):
    for command in (ws_get,ws_record,ws_add_player,ws_update_player,ws_delete,ws_restore):
        websocket_api.async_register_command(hass,command)
    return True

async def async_setup_entry(hass,entry):
    from .model import TroubleChampionship
    players=[entry.data[CONF_PLAYER_1],entry.data[CONF_PLAYER_2],entry.data[CONF_PLAYER_3],entry.data[CONF_PLAYER_4],entry.data[CONF_PLAYER_5]]
    m=TroubleChampionship(hass,entry,entry.data[CONF_CHAMPIONSHIP_NAME],players)
    await m.async_load(); entry.runtime_data=m
    await _async_register_frontend(hass)
    await _async_register_panel(hass, entry)
    await hass.config_entries.async_forward_entry_setups(entry,PLATFORMS)
    return True

async def async_unload_entry(hass,entry):
    unloaded = await hass.config_entries.async_unload_platforms(entry,PLATFORMS)
    if unloaded:
        async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
    return unloaded
