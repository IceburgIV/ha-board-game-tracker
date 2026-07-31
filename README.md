# Board Game Tracker — v5.1.2

Home Assistant head-to-head family league tracker with an arcade panel, persistent event history, standings, streaks, rivalries, daily totals, confirmation before recording, and historical-game deletion/restoration.

## Critical v5.1.2 fix

Rev 5.1 changed the Home Assistant `Store` major version from `1` to `2` without a supported migration path. Home Assistant therefore refused to load the existing event log and raised:

```text
NotImplementedError
homeassistant.helpers.storage.Store._async_migrate_func
```

v5.1.2 restores `STORAGE_VERSION = 1`. The Rev 5 fields are backward-compatible additions to the same JSON object, so a major-version migration is unnecessary. Existing Rev 3/4 history loads directly and is preserved.

## Deploy from a Git clone on Home Assistant

Clone once:

```bash
cd /config
git clone https://github.com/IceburgIV/ha-board-game-tracker.git
cd ha-board-game-tracker
git checkout v5.1.2
sh scripts/deploy_to_ha.sh
ha core restart
```

For later updates:

```bash
cd /config/ha-board-game-tracker
git checkout main
git pull --ff-only
sh scripts/deploy_to_ha.sh
ha core restart
```

The deployment script replaces only the integration source and frontend JavaScript. It never touches `/config/.storage`.

## Manual deployment

Copy:

```text
custom_components/trouble_championship
```

to:

```text
/config/custom_components/trouble_championship
```

Copy:

```text
www/trouble-league-panel.js
```

to:

```text
/config/www/trouble-league-panel.js
```

Restart Home Assistant and hard-refresh the browser.

## Safety

Before upgrading, create a full Home Assistant backup. Do not delete the Trouble Championship config entry and do not remove its file from `/config/.storage`.
