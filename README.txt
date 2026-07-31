Trouble Championship Rev 4 — Arcade Panel
=========================================

REQUIRES
--------
Trouble Championship Rev 3 must already be installed and working. Rev 4 is a
new full-screen frontend panel that uses the Rev 3 event log and entities.

WHAT REV 4 ADDS
---------------
- A dedicated sidebar app instead of a Lovelace dashboard
- Arcade-style visual design
- True gold/silver/bronze podium blocks
- Proper tied-for-first presentation
- Large child-friendly winner/loser controls
- Confetti and result popups
- Clean standings cards
- Rivalry matrix
- Recent game feed
- Hall of Fame records
- Games-by-day bars calculated directly from the event log
- Responsive tablet and phone layout

The Games by Day chart does NOT use Recorder statistics. It reads the complete
daily totals stored by the Rev 3 integration, so there is no statistics delay.

INSTALL
-------
1. Keep Rev 3 installed.
2. Copy:
      www/trouble-championship-panel.js
   to:
      /config/www/trouble-championship-panel.js

3. Add the contents of configuration_snippet.yaml to configuration.yaml.

   IMPORTANT:
   panel_custom: must be at the root level. Do not put this snippet in the
   packages folder.

4. Check configuration.
5. Restart Home Assistant.
6. Hard-refresh the browser or fully close and reopen the Companion App.
7. Open "Trouble Arcade" from the sidebar.

UPDATING THE JAVASCRIPT
-----------------------
Home Assistant caches frontend files aggressively. The supplied snippet uses:

  module_url: /local/trouble-championship-panel.js?v=4.0.0

When replacing the JavaScript later, change the version query, for example:

  ?v=4.0.1

ENTITY PREFIX
-------------
The panel assumes the fresh Rev 3 entity prefix:

  trouble_championship

If your entities have a suffix, such as:

  sensor.trouble_championship_2_standings

change the panel config prefix to:

  prefix: trouble_championship_2

TEST
----
1. Open Trouble Arcade.
2. Confirm the existing Rev 3 scores appear.
3. Record one game.
4. Confirm confetti, recent games, standings, podium, daily bar, and rivalry
   table all update.
5. Press Undo and confirm all views roll back.
6. Restart Home Assistant and confirm the event log remains.

ROLLBACK
--------
Remove or comment out the panel_custom entry, then restart Home Assistant.
Rev 3 data is untouched because Rev 4 is only a frontend.
