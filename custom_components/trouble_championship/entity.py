
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity
from .const import DOMAIN
class TroubleEntity(Entity):
    _attr_has_entity_name=True
    def __init__(self,model):
        self.model=model
        self._attr_device_info=DeviceInfo(identifiers={(DOMAIN,model.entry.entry_id)},name=model.name,
                                          manufacturer="Family Game Tracker",model="Trouble Championship Rev 5",sw_version="5.0.0")
    async def async_added_to_hass(self):
        self.async_on_remove(async_dispatcher_connect(self.hass,self.model.signal,self.async_write_ha_state))
