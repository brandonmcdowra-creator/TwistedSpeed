# Twisted Speed

**Arcade combat-racer** — night-street speed feel crossed with vehicular combat identity.  
Original cast, names, and liveries only (homage patterns; not a TM/NFS clone).

> *Drive like Heat · Kill like Black · Finish like a prison break.*

| | |
|---|---|
| **Genre** | 3D arcade combat-racer |
| **Fantasy** | Night Circuit parole sport — pick a sentenced rig, survive a living neon track, finish at the Freedom Gate |
| **Runtimes** | Browser (`web/` three.js) + Unity URP (`unity/TwistedSpeed/`) |
| **Source of truth** | Shared design docs + GLB data (one primary runtime per session) |
| **Slice** | 8–10 min meaningful play · 5–8 cars · one excellent living track first |

This GitHub repo holds the **design and production docs** for collaborators and AI agents. The full local build pack (binaries, Unity Library, web assets) lives separately on the director machine.

---

## Read these first

| Doc | Why |
|-----|-----|
| [BUILD-CONTEXT.md](BUILD-CONTEXT.md) | Master design contract: hook, loop, pillars, scope |
| [DESIGN-RESEARCH.md](DESIGN-RESEARCH.md) | Research lock and competitive framing |
| [STYLE-CONTRACT.md](STYLE-CONTRACT.md) | Palette, tone, dual-ship rules |
| [ASSET-BIBLE.md](ASSET-BIBLE.md) | Roster fiction, stats, signatures |
| [PROGRESS.md](PROGRESS.md) | Current build version and session handoff |
| [GATE-A-AUDIT.md](GATE-A-AUDIT.md) | Design-lock audit status |
| [.grok/skills/twisted-speed/SKILL.md](.grok/skills/twisted-speed/SKILL.md) | Project locks for AI agents |

## Deeper reference

| Doc | Topic |
|-----|--------|
| [docs/MAP-OVERVIEW.md](docs/MAP-OVERVIEW.md) | Track / map overview |
| [docs/MARROW-STANDARD.md](docs/MARROW-STANDARD.md) | Hero vehicle standard |
| [docs/CREDITS-MODELS.md](docs/CREDITS-MODELS.md) | Model credits |
| [docs/UNITY-AI-NOTES.md](docs/UNITY-AI-NOTES.md) | Unity + AI pipeline notes |
| [PLAY-SLICE.md](PLAY-SLICE.md) | Vertical slice play goals |
| [CHANGELOG.md](CHANGELOG.md) | Session history |
| [FI-PLAYBOOK.md](FI-PLAYBOOK.md) | FutureIndustries craft playbook |
| [FI-GRAPHICS.md](FI-GRAPHICS.md) / [FI-AUDIO.md](FI-AUDIO.md) | Art and audio doctrine |
| [web/README.md](web/README.md) | How to run the browser build (when code is present) |
| [unity/README.md](unity/README.md) | Unity project play notes |

## Design pillars (locked)

1. **Every rig is a sentence** — silhouette + stats + signature special  
2. **The track is the warden** — hazards punish, don’t brick  
3. **Speed is armor and sin**  
4. **Neon over rust**  
5. **One shared kit + one signature special**

## Combat stack

Infinite weak MG (overheat) → limited heavies (rockets / mines / …) → per-rig recharge special.  
Shield energy before Health HP when implemented.

## Agent onboarding

1. Paste [START-HERE.txt](START-HERE.txt) into your coding agent, **or** read [llms.txt](llms.txt)  
2. Load process skill `game-developer`, then project skill `twisted-speed`  
3. Treat BUILD-CONTEXT + STYLE-CONTRACT + ASSET-BIBLE as the contract  
4. Update CHANGELOG + PROGRESS at end of real sessions  
5. Override phrase for process gates: **`send it!`**

## What is not in this repo

- Unity `Library/` and large binary GLB/FBX fleets  
- Full `web/` runtime + screenshots (docs-only mirror)  
- Secrets / API keys (see `tools/env.example`)

## License / IP

Original fiction and roster. Free asset credits in [docs/CREDITS-MODELS.md](docs/CREDITS-MODELS.md) and [FREE-ASSETS.md](FREE-ASSETS.md). Do not ship third-party IP names, characters, or liveries.
