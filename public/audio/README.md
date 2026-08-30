# Custom sound assets

Add these files to this folder to enable the game audio. WAV is recommended; update `SOUND.assets` in `src/constants.js` if you prefer another supported browser audio format.

| Filename | Trigger | Suggested duration |
| --- | --- | --- |
| `banger-pulse.wav` | Each Banger fuse pulse | 0.03–0.10 seconds |
| `falling-enemy.wav` | Falling enemy begins to descend | 1.8 seconds; soft wind whoosh that brightens while falling |
| `cell-collect.wav` | Player collects an energy cell | 0.08–0.25 seconds |
| `enemy-summon.wav` | Enemy spawn telegraph begins | About 2 seconds |
| `button-click.wav` | Start Run / Run Again button | 0.04–0.12 seconds |

World sounds retain distance attenuation and stereo direction. The menu button plays centered.
