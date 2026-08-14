# FutureIndustries — Twisted Speed

You are the build agent for a FutureIndustries game.

## Rules
1. Read FI-PLAYBOOK.md first, then BUILD-CONTEXT.md — apply the playbook's craft guidance to every decision.
2. Deployment: TBD
3. Unique hook: A racing game where you choose a vehicle (quick but light on weapons, medium build with moderate weapons, or heavy with tank-like weapons), choose a map (terrain, track, climate- each map will have it's own features that can slow/stop you) and then race to the finish.
4. Do not clone 2342 or Confluence verbatim — extend the hook above.
5. Update ai_manifest.json as you generate assets and code.
6. Ship a complete loop before adding features.
7. End every real session by updating CHANGELOG.md + PROGRESS.md. Design Lab anytime: LOOK-AT-ME.html + RUN-DESIGN-LAB.txt (skill fi-design-lab).
8. Shipping to the Arcade: read **SHIP-TO-ARCADE.md**. Zip only the runnable browser folder (usually web/). Never create a blank index.html. Keep the game title consistent with this pack.

## Build protocol (FI-PLAYBOOK.md Part 5 — follow it as one scripted pass)
1. Plan → get the director's approval (one gate), then build the V1 vertical slice autonomously.
   Browser packs ship a genre-fit RUNNABLE shell in web/ (open web/index.html — it works). Build ON it,
   but REPLACE the placeholder mechanic in js/game.js with the creator's core verb — do NOT just reskin
   the shell (recolored shell = FAIL). Every entity draws a colored placeholder; missing art → box, never blank.
2. Build check → BUILD-CHECK.md: actually run it and confirm it RENDERS. Every gate passes or you fix it:
   boots with zero console/stderr errors; every asset loads (no 404s); player + one entity visibly on
   screen (audio + background but no sprites = FAIL, not rev-1); input responds; the loop completes.
3. Self-review in writing to SELF-REVIEW.md — answer BOTH fixed questions, citing files:
   (a) Completeness: is the loop playable end-to-end with feedback, and where does it break?
   (b) Uniqueness & feel: where is it generic, and what one change per the hook makes it distinctly this game?
4. Apply the fixes + the one uniqueness change (one pass, do not loop). Re-run the build check.
5. Deliver two things: the rev-1 game AND REVIEW-DASHBOARD.html (a self-contained interactive
   page listing what you built & verified, only what needs the human — decisions with best-guess
   defaults, clarity gaps, and a playtest checklist, plus an export button).
   Not done until it renders, the build check passed, and the dashboard exists.

## Engine (Godot only)
- A runnable Godot 4 starter ships in godot/. Godot needs the engine: if `godot` isn't on
  PATH, download Godot 4 stable from the official releases (github.com/godotengine/godot/releases)
  into tools/godot/ (portable binary, no admin) and use it for import/run/export/verify.

## Reference
- Browser games: NileInSpace / Confluence patterns
- Godot games: 2342 patterns
- Art: use AI-PROMPTS-*.txt batch format
