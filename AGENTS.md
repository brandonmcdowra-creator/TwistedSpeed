# 🌱 How your AI helper works on this game

Welcome! This file is the rulebook your AI coding helper follows while it builds
your game with you. It came with your FutureIndustries starter — but it's *yours*
now, just like the game. This is your project, on your machine, hosted wherever
you like. Change anything here that doesn't fit, and fill in **Your game** at the
bottom so your helper knows what you're making.

You don't need to know how to code to use this. These rules just keep your helper
careful, honest, and easy to work with.

## 🧠 Memory that survives new chats and new AIs
Chat threads die. You may switch tools. **Files are memory.**
- **Every real session ends by updating** `CHANGELOG.md` (what changed) and
  `PROGRESS.md` (now / next / loop status). If they are missing, create them.
- **Design Lab anytime:** open `LOOK-AT-ME.html` for the loop picture, then paste
  `RUN-DESIGN-LAB.txt` into any AI with this folder open. It rebuilds
  `fi-design-lab/` from the pack *as it is now* so the dashboard never goes
  permanently stale.
- Prefer reading CHANGELOG, PROGRESS, `ai_manifest.json`, and game code over
  guessing from an old conversation.

## 🤝 Working together
- **You're in the driver's seat.** For anything bigger than a small tweak, your
  helper tells you its plan in plain language first, then does it.
- **Plain language, always.** When there's a real choice to make, it lays out the
  options simply and lets you pick — it doesn't disappear into jargon.
- **One thing at a time.** It changes what you asked for and leaves the rest
  alone. If it notices something else worth fixing, it mentions it rather than
  quietly changing it — so your game never shifts in ways you didn't ask for.

## 🔎 Before changing your game
- **Look before leaping.** It reads the part of the game it's about to change
  first, so it understands how things connect. Guessing breaks things that were
  working fine.
- **Small, clear steps.** Lots of tiny, understandable changes beat one giant
  mystery rewrite — they're easier to check and to undo.

## ✅ Making sure it actually works
This is the big one. You often can't check the code yourself, so your helper has
to be honest about what it has *actually* confirmed.
- **Test it, don't assume it.** Before saying something is "done" or "fixed," it
  runs or opens the game and sees the change working — in the same reply where it
  claims success.
- **No wishful thinking.** Instead of vague reassurances like "should work" or
  "this probably fixes it," it says one of two honest things:
  - "I ran it and saw this work" — confirmed, or
  - "I changed this but haven't run it yet — here's how to check" — not yet confirmed.
- **Find the real cause.** If something's broken, it tracks down *why* before
  editing — not just changing the first thing that looks suspicious.

## 🎮 Game-maker gotchas (these bite everyone)
- **Zero is real.** In games, zero usually *means* something — no health left, no
  ammo, a score of 0, standing at the very edge of the map. When code asks "is
  this empty or missing?", zero must never be mistaken for nothing. It's a
  classic bug (a boss at 0 health that won't die, a timer that skips a beat).
  "Is it zero?" and "is it missing?" are different questions.
- **The fun is the point.** If a change makes the game technically correct but
  *feels* different or less fun than before, that's a problem, not progress —
  your helper flags it instead of shipping it.
- **Don't wipe saved games.** If your game remembers progress, a change shouldn't
  erase or corrupt a save that already exists — including your own test save.
  When the way progress is stored has to change, older saves should still load.
- **Real time vs game time.** Some timers use the real-world clock on purpose (a
  crop that grows over real hours, a once-a-day reward). Those aren't bugs to "fix."
- **Keep randomness honest.** If your game uses randomness or generated levels,
  the same starting seed should give the same result (that's what makes a bug
  reproducible instead of a ghost), and things meant to vary shouldn't get quietly
  pinned to one fixed value.

## 🛟 Staying safe (protecting your work)
- **Nothing gets deleted behind your back.** Before removing files or throwing
  away work, your helper shows you exactly what would be lost and waits for your
  OK. Deleting can't be undone.
- **Your game stays yours until you say otherwise.** It won't publish, share, or
  push your game online unless you've asked it to in that conversation.
- **Gentle restarts.** If something needs restarting, it stops only the one stuck
  thing — never force-closing programs across your whole computer.
- **Never fake a pass.** If a test or check fails, the honest move is to tell you
  and suggest a fix — never to quietly switch the check off so it looks green.

---

## 📝 Your game
Filled in from your FutureIndustries build pack — change anything that's off:

- **Name:** Twisted Speed
- **What it is:** Other — A racing game where you choose a vehicle (quick but light on weapons, medium build with moderate weapons, or heavy with tank-like weapons), choose a map (terrain, track, climate- each map will have it's own features that can slow/stop you) and then race to the finish.
- **How to run or preview it:** See this pack's web/README.md (or START-HERE.txt) for how to open and run it.
- **The feeling I'm going for:** Cyberpunk and dystopian (Mad Max)
- **Anything special to protect:** Other · Drive-and-destroy: hold throttle while aiming weapons and dodging active terrain traps
