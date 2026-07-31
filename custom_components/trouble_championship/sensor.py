
from homeassistant.components.sensor import SensorEntity,SensorStateClass
from homeassistant.util import dt as dt_util
from .entity import TroubleEntity
async def async_setup_entry(hass,entry,async_add_entities):
    m=entry.runtime_data
    async_add_entities([Total(m),Today(m),Leader(m),Last(m),Standings(m),Recent(m),Head(m),Daily(m),Buzz(m)])
class Base(TroubleEntity,SensorEntity):
    def __init__(self,m,name,key,icon): super().__init__(m); self._attr_name=name; self._attr_unique_id=f"{m.entry.entry_id}_{key}"; self._attr_icon=icon
class Total(Base):
    _attr_native_unit_of_measurement="games"; _attr_state_class=SensorStateClass.TOTAL_INCREASING
    def __init__(self,m): super().__init__(m,"Total Games","total_games","mdi:dice-multiple")
    @property
    def native_value(self): return len(self.model.games)
class Today(Base):
    _attr_native_unit_of_measurement="games"; _attr_state_class=SensorStateClass.MEASUREMENT
    def __init__(self,m): super().__init__(m,"Games Today","games_today","mdi:calendar-today")
    @property
    def native_value(self): return self.model.games_by_day().get(dt_util.now().date().isoformat(),0)
class Leader(Base):
    def __init__(self,m): super().__init__(m,"Leader","leader","mdi:crown")
    @property
    def native_value(self): return self.model.leader_text()
class Last(Base):
    def __init__(self,m): super().__init__(m,"Last Result","last_result","mdi:history")
    @property
    def native_value(self):
        x=self.model.recent_games(1); return x[0]["result"] if x else "No games yet"
class Standings(Base):
    def __init__(self,m): super().__init__(m,"Standings","standings","mdi:podium")
    @property
    def native_value(self): return len(self.model.standings())
    @property
    def extra_state_attributes(self): return {"standings":self.model.standings(),"active_days":self.model.active_days,"minimum_games":self.model.minimum_games}
class Recent(Base):
    def __init__(self,m): super().__init__(m,"Recent Games","recent_games","mdi:format-list-numbered")
    @property
    def native_value(self): return len(self.model.games)
    @property
    def extra_state_attributes(self): return {"games":self.model.recent_games(20)}
class Head(Base):
    def __init__(self,m): super().__init__(m,"Head to Head","head_to_head","mdi:sword-cross")
    @property
    def native_value(self): return len(self.model.games)
    @property
    def extra_state_attributes(self): return {"matrix":self.model.head_to_head()}
class Daily(Base):
    def __init__(self,m): super().__init__(m,"Daily Games","daily_games","mdi:chart-bar")
    @property
    def native_value(self): return max(self.model.games_by_day().values(),default=0)
    @property
    def extra_state_attributes(self): return {"games_by_day":self.model.games_by_day()}
class Buzz(Base):
    def __init__(self,m): super().__init__(m,"League Buzz","league_buzz","mdi:robot-excited")
    @property
    def native_value(self): return len(self.model.insights())
    @property
    def extra_state_attributes(self): return {"insights":self.model.insights()}
