from homeassistant.exceptions import HomeAssistantError
from .model import DuplicateGameError

from homeassistant.components.button import ButtonEntity
from .entity import TroubleEntity
async def async_setup_entry(hass,entry,async_add_entities):
    async_add_entities([RecordButton(entry.runtime_data),UndoButton(entry.runtime_data)])
class RecordButton(TroubleEntity,ButtonEntity):
    _attr_name="Record Game"; _attr_icon="mdi:trophy"
    def __init__(self,model): super().__init__(model); self._attr_unique_id=f"{model.entry.entry_id}_record_game"
    async def async_press(self):
        try:
            await self.model.async_record_game()
        except DuplicateGameError as err:
            raise HomeAssistantError(
                f"{err.game['winner']} defeating {err.game['loser']} was just recorded. "
                "Use the Trouble League panel to record it again intentionally."
            ) from err
class UndoButton(TroubleEntity,ButtonEntity):
    _attr_name="Undo Last Game"; _attr_icon="mdi:undo"
    def __init__(self,model): super().__init__(model); self._attr_unique_id=f"{model.entry.entry_id}_undo_last_game"
    @property
    def available(self): return bool(self.model.games)
    async def async_press(self): await self.model.async_undo_last()
