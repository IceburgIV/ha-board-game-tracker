# Board Game Tracker

Home Assistant family board-game league tracker.

> **Current status:** `v0.0.2` public preview  
> **Planned stable release:** `v1.0.0`

## Install with HACS

1. Open HACS.
2. Open **Custom repositories**.
3. Add:
   `https://github.com/IceburgIV/ha-board-game-tracker`
4. Select **Integration**.
5. Download Board Game Tracker.
6. Restart Home Assistant.
7. Add **Trouble Championship** from Settings → Devices & services.

The integration bundles and registers its own frontend. No `/config/www`
file, `panel_custom` YAML, manual cache version, or manual config-entry ID is
required.

## Data safety

Game history is stored by Home Assistant and remains on storage version 1.
Updating the integration does not delete championship history.

## Preview warning

This is a pre-1.0 release. Back up Home Assistant before upgrading.
