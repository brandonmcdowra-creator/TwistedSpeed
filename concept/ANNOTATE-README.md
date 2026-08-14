# Twisted Speed — Annotate dev kit

Your concept dashboard HTML includes FutureIndustries **Annotate** — baked in for all FI creators.

## How to use
1. Open `twisted-speed-concept-dashboard.html` in a browser
2. Click **◎ Annotate** (bottom-left) or press **Shift+F**
3. Drag a box around any section, button, or art slot
4. Type feedback in the pane → Save
5. Export via **Export annotate log (.md)** on the dashboard, or the 📋 Log panel

## During local build
- Re-open the dashboard while playtesting your Godot/browser build
- Annotate bugs, polish, UX issues on screenshots or notes
- Attach `*-annotate-feedback.md` to your AI alongside BUILD-CONTEXT.md

## Future: game runtime
When your game ships, the same Annotate overlay can be embedded in your HTML game build for playtester feedback.

SHIP TO THE ARCADE (browser games):
- The Arcade hosts ONLY a browser build — the folder that opens in a browser with index.html.
- In this pack that is usually web/ (open web/index.html). Zip the *contents* of web/ (or zip web/ itself —
  FI accepts web/index.html one folder deep and will play it), NOT the whole design pack with an empty index.html.
- Do NOT create a blank index.html just to pass checks — an empty file will be rejected.
- Godot games: Project → Export → Web, then zip that export folder.
- Desktop-only builds: use the download-link submission path instead of browser-zip.

