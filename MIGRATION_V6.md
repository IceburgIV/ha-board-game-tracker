# Upgrade to v6.0.2

Remove the old Trouble-specific `panel_custom` item from `configuration.yaml`.

Then deploy or install through HACS and restart Home Assistant.

The integration now uses Home Assistant's supported programmatic custom-panel
registration API with its bundled module URL. No files in `/config/www` are used.

Saved games remain in Home Assistant storage version 1.
