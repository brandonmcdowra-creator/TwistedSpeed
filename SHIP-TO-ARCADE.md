# SHIP-TO-ARCADE — Twisted Speed

Read this **before** uploading to FutureIndustries. Most failed ships are packaging mistakes, not bad games.

## What the Arcade hosts

FutureIndustries **plays browser builds in a tab**. That means a folder the browser can open:

- A real **`index.html`** (not empty, not a one-line stub)
- Scripts/assets next to it (`js/`, `css/`, wasm, etc.)
- Cap ~50 MB for hosted zips

It does **not** host: a full design pack, a blank `index.html` you made up to pass a check,
a desktop `.exe`, or a multi-hundred-MB Godot project tree.

## Pre-flight checklist (do this on YOUR machine first)

1. Open `web/index.html` (or your web export folder) in a browser.
2. Confirm **this game** boots — title says **Twisted Speed**, not a starter shell name like "AI Prompt Simulator".
3. Confirm a stranger could finish a short session with no devtools / no console errors.
4. Confirm `ai_manifest.json` is filled for **this** title (or sit next to the game files in the zip).
5. **Phone check:** open the game on a real phone or narrow DevTools (~390px). Desktop multi-column UIs
   clip in a small iframe. FI may scale desktop stages on host, but a real single-column / touch layout is better.
   Prefer `100dvh` over `100vh`; don't lock `html, body { overflow: hidden }` without a mobile path.

## What to zip (browser / HTML games)

In this pack the runnable game lives under **`web/`**.

**Correct:**

- Zip the **contents** of `web/` so the zip root has `index.html`, `js/`, `css/`, …
- **OR** zip so the path is `web/index.html` (one folder deep — FI detects `web/` and `play/`).

**Wrong (will fail or go live unplayable):**

- Zipping the **entire build pack** (START-HERE, FI-PLAYBOOK, empty root index, …)
- Creating an **empty** `index.html` at the pack root just to satisfy a check
- Uploading a different project than the title you typed on Submit

Quick check after zipping: open the zip — you should see a real `index.html` with `<script` tags,
not a 0-byte file.

## What to zip (Godot)

1. In Godot: **Project → Export → Web** (not Windows/Linux desktop).
2. Export into a clean folder (Godot writes `index.html` + wasm/pck for you).
3. Zip **that export folder** (or its contents).
4. Do **not** zip the whole `godot/` project source as a "browser" build.

## Desktop-only / huge builds

If the game only runs as a downloadable binary, use FutureIndustries **download-link** submission
(link to itch / GitHub Releases / etc.). The Arcade tab will not run a 500 MB project tree.

## Where to upload on the site

1. Sign in → **Account → My games → Ship a build for review**
2. Use the **same title** as this pack (`Twisted Speed`)
3. Attach the zip from the checklist above
4. Review is usually within **48 hours**

## For your local AI (when the director says "ship this")

- Re-read this file. Do not invent packaging hacks.
- Rename any leftover starter titles in `web/index.html` `<title>` and UI to **Twisted Speed**.
- Produce a zip of the **runnable** folder only; list the exact path you zipped.
- Refuse to create a blank `index.html` to "pass validation."

## This pack's runnable path

- Primary: `web/`
- Local preview: open `web/index.html` (or serve the `web/` folder).
