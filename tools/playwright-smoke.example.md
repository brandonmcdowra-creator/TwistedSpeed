# Playwright smoke recipe (optional)

Use during **BUILD-CHECK** so the AI (or you) actually *sees* the game.

## Without MCP
1. Serve the game folder (prefer a no-cache dev server; avoid stale `http.server` alone if you hit cache hell).
2. Open `web/index.html` (or the served URL).
3. Checklist:
   - Zero console errors
   - Player + at least one entity **visible**
   - Input changes the screen
   - Loop can reach a win/lose or session end
   - Title matches THIS game (not starter shell name)

## With Playwright MCP
1. Install/configure Playwright MCP (see MCP-RECOMMENDED.md).
2. Start the game on localhost.
3. Prompt your agent:

```
Navigate to http://localhost:PORT/ (or file URL).
Take a screenshot.
Confirm: boots, visible entities, no obvious error overlay.
Click/tap the primary control once and screenshot again.
Report BUILD-CHECK failures only.
```

4. Paste results into `BUILD-CHECK.md`.

## Skill
If available, load `.claude/skills/fi-playtest/SKILL.md` and follow it.
