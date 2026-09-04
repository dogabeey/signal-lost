# Steamworks integration

Asteroid Belt uses `steamworks.js` in Electron's main process. The renderer receives only a narrow IPC bridge for Steam status and the game's approved achievement IDs.

## Configure achievements

In Steamworks **App Admin → Steamworks Settings → Achievement Configuration**, create the following API names exactly:

- `ARTIFACT_BROKEN_RADAR`
- `ARTIFACT_FTL_SCHEMATICS`
- `ARTIFACT_SUPPLY_DEPOT`
- `ARTIFACT_BROKEN_EXTRACTOR`
- `ARTIFACT_CONSTRUCTION_BOT`
- `ARTIFACT_ALIENTECH_GIZMO`
- `ARTIFACT_BROKEN_HARD_DRIVE`
- `ARTIFACT_HUBBLE_TELESCOPE`
- `ARTIFACT_DARK_CORE`
- `ARTIFACT_MAP_TO_EARTH`

Each artifact unlocks its matching Steam achievement. `ARTIFACT_DARK_CORE` is repeatable in the game but intentionally unlocks only one Steam achievement.

## Local test with Spacewar

With Steam running, set a temporary test AppID before creating a Steam build:

```powershell
$env:STEAM_APP_ID = '480'
npm run build:steam
```

This verifies Steam initialization and the overlay with Spacewar. Its achievement schema is not Asteroid Belt's schema, so test the artifact achievements using your own unreleased Steam app after configuring the IDs above.

For normal Steam uploads, do not set `STEAM_APP_ID`; Steam supplies your real AppID when it launches the game. Do not upload a `steam_appid.txt` file. The production package explicitly unpacks the native Steamworks files so the Steam API DLL can load.

## Multiplayer

The integration initializes the Steam client and overlay, ready for Steam lobbies/P2P. It does not turn this single-player game into multiplayer by itself; that requires gameplay synchronization, authoritative state rules, lobby UI, and a networking design.
