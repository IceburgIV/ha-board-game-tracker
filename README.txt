Trouble Championship 5.1 — League Intelligence

A custom Home Assistant integration and arcade panel for a head-to-head family board-game league.

#What changed in 5.1

- Two-step game recording: Record Game followed by Confirm Result.
- Confirmation displays the selected winner and loser.
- Confirmation expires automatically after six seconds.
- Backend duplicate protection blocks an identical result recorded within eight seconds.
- A Record Anyway option permits legitimate rapid rematches.
- Success and error notices make it clear whether a game was saved.
- Direct presses of the Home Assistant `Record Game` button also receive backend duplicate protection.

#Installation

1. Create a full Home Assistant backup.
2. Copy `custom_components/trouble_championship` to `/config/custom_components/`.
3. Copy `www/trouble-league-panel.js` to `/config/www/`.
4. Add the contents of `configuration_snippet.yaml` at the root of `configuration.yaml`.
5. Replace `YOUR_CONFIG_ENTRY_ID` with the integration's config-entry ID.
6. Restart Home Assistant and hard-refresh the browser.

The config-entry ID appears in the URL after opening:

Settings → Devices & services → Trouble Championship

#Safe upgrade from 5.0

The storage key and storage version are unchanged. Existing players, games, deleted games, ranking preferences, and league settings remain in place.

For a safe Git workflow:

```bash
git checkout -b feature/record-confirmation
Copy these files into the repository, test, then:
git add .
git commit -m "Add confirmed recording and duplicate protection"
git tag v5.1.0
```

#Behavior

1. Select the winner and loser.
2. Press Record Game.
3. Check the displayed result.
4. Press Confirm Result.
5. The panel shows a green recorded notice.

If the exact same winner and loser were recorded within eight seconds, the integration does not add another game. The panel offers Record Anyway or Cancel.

#Existing League Intelligence features

- Dynamic players and guest-ranking controls
- Seven-day podium activity rule
- Minimum-game qualification
- Overall and head-to-head streaks
- League Buzz insights
- Date-grouped game history
- Delete and restore historical games
- Automatic recalculation from the event log
