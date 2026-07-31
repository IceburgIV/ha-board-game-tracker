
from homeassistant.components.select import SelectEntity
from .entity import TroubleEntity
async def async_setup_entry(hass,entry,async_add_entities):
    async_add_entities([PlayerSelect(entry.runtime_data,"winner"),PlayerSelect(entry.runtime_data,"loser")])
class PlayerSelect(TroubleEntity,SelectEntity):
    def __init__(self,model,role):
        super().__init__(model); self.role=role; self._attr_name=role.title(); self._attr_unique_id=f"{model.entry.entry_id}_{role}"
        self._attr_icon="mdi:trophy" if role=="winner" else "mdi:emoticon-sad-outline"
    @property
    def options(self): return self.model.player_names
    @property
    def current_option(self): return self.model.winner_selection if self.role=="winner" else self.model.loser_selection
    async def async_select_option(self,option):
        self.model.set_winner(option) if self.role=="winner" else self.model.set_loser(option)
