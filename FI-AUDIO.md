# FutureIndustries Audio Playbook

You are making sound for a FutureIndustries game. This is the studio's audio skill pack — the answer to the most-skipped layer in AI-built games. Audio is half of juice (FI-PLAYBOOK Part 1), yet AI builds ship silent more often than they ship ugly, because "find sounds" feels like a blocked task. It isn't. Read this before touching audio, and keep it in context through every audio pass. It extends [FI-PLAYBOOK.md](FI-PLAYBOOK.md) Part 4; the companion pack is [FI-GRAPHICS.md](FI-GRAPHICS.md) — same doctrine, different sense.

The one-sentence thesis: **synthesize sound in code — SFX are systematic assets, and a text model can *edit* a synth recipe but can only *re-roll* a generated or downloaded file. You cannot hear, so verify structurally and hand the director a sound board.**

These rules were paid for in 2342 (Godot survivor-roguelike): its entire soundscape — 15 SFX + a seamless ambient loop — is one ~130-line dependency-free Python script (`make-sfx.py`), and its `AudioManager` autoload is the playback half. **A generic starter version of that script ships in this pack at `tools/make-sfx.py` — run it and 9 usable sounds appear. Audio is never blocked.**

---

## Part 1 · The doctrine: synthesize first

Classify audio the same way FI-GRAPHICS classifies art:

- **SFX are systematic** — they must agree with the game's events, mix, and audio character, and they get tuned constantly ("shorter", "lower", "less harsh"). **Synthesize them in code.** A recipe tweak is a one-line diff; a regenerated or re-downloaded file is a dice roll plus a license question.
- **Music/songs are singular** — a theme track stands alone. It's the one place external or AI-generated audio earns its keep, and it's **polish-pass optional**: a quiet synthesized ambient bed covers v1 completely (2342 shipped on one).

Why synthesis wins for AI builds: deterministic (seeded — same script, same bytes), zero dependencies, zero licensing risk, tiny repo, regenerable forever, and the whole soundscape is text your AI can read and revise. The failure mode this kills: audio deferred until "later" — which in practice means never, and the playtest reads as dead.

---

## Part 2 · What to play when (the craft rules)

- **A sound on every meaningful action** — sound is a mandatory member of the feedback bundle (flash + particle + shake + **sound**, FI-PLAYBOOK Part 1). If an action has no sound, it doesn't feel like it happened.
- **One audio character**, chosen up front — the palette rule with ears. Square/saw chirps = arcade; soft sines = cozy; lowpassed noise = gritty. Pick the voice that matches the game's tone and reject sounds that break it; a small consistent set beats a big mismatched one.
- **Pitch direction carries meaning.** Rewards sweep UP (2342's `xp`: 660→1350 Hz sine), damage sweeps DOWN (`hurt`: 130→70 Hz square + noise), UI is a short neutral blip. Players learn this vocabulary without being told.
- **Win/lose are tiny melodies, not stings.** A 4-note rising arpeggio (523·659·784·1046 Hz — C-E-G-C) reads as victory; the same idea descending reads as defeat. Two `concat` calls, no composer.
- **Randomize every repeat**: ±~6–10% pitch (and a touch of volume) per play so a fired-every-frame sound never machine-guns at one pitch.
- **Mix gameplay above ambience.** The ambient bed sits far down (2342: −16 dB); core-verb SFX sit on top; reserve the loudest, longest sounds for the rarest, biggest events (boss phase, big explosion) — loudness is an economy, spend it where the mechanic matters.
- **Keep per-sound gain low and normalize.** Feedback bundles stack — five sounds in one frame must not clip. Synthesize with headroom (the pack tool normalizes mixes to 0.95 peak; the starter shell's beep gain is 0.05) and debounce identical SFX (2342: the same sound won't retrigger within 40 ms — a wave of simultaneous deaths plays once, not thirty times).

---

## Part 3 · The synthesis toolkit — five primitives make every sound

The entire 2342 soundscape (and the pack's `tools/make-sfx.py`) is built from five functions plus one envelope. Any LLM can rebuild this from the spec below — it's ~130 lines of stdlib Python (`math`/`wave`/`struct`/`random`, 22050 Hz 16-bit mono WAV):

- **`env_decay(t, dur, power)`** — the shape of almost every game sound: `(1 - t/dur) ** power`. Higher power = snappier.
- **`sweep(dur, f0, f1, wave_fn, env_power, vol)`** — phase-accumulated frequency ramp f0→f1 with decay. The workhorse: lasers, rewards, hurt, sub-bass boom.
- **`noise_burst(dur, env_power, vol, lowpass)`** — `random.uniform(-1,1)` with optional one-pole lowpass (`s = prev + (s−prev)·k`). Hits, dashes, explosion body.
- **`note(freq, dur, wave_fn, vol, env_power)`** — one enveloped oscillator tone; `concat` notes into arpeggios.
- **`mix(*tracks)` / `concat(*tracks)`** — layer (then normalize peak to 0.95) / sequence.
- Wave functions: `sine`, `square` (sign of sine), `saw`. Seed the RNG (`random.seed(<game number>)`) so output is byte-deterministic.

*(FI, director-tuned 2026-07-16)* **Jingles are not chip-notes.** Raw square/saw notes read as harsh buzz the moment they carry a melody — the FI starter set's first win/lose/hurt drafts were rejected on listen for exactly this. Melodic sounds (win, lose, fanfares) use a **warm tone voice**: sine + soft octave/twelfth harmonics, a short attack ramp (~8 ms — a zero-attack envelope clicks at note onset), **legato overlap** between notes (~30–35% so the phrase sings instead of stuttering), and a touch of vibrato on the held final note. Impacts (hurt) want a **sine thump** (sweep into the 50–60 Hz floor) + a little lowpassed noise — square waves at low frequency buzz instead of thudding. The pack's `make-sfx.py` ships `tone()` and `melody()` helpers implementing this.

Proven recipes (2342's real parameters — steal, then re-voice to your game's character; per the note above, prefer `tone()`/`melody()` over raw square/saw for the melodic rows):

| Sound | Recipe |
|---|---|
| shoot | square sweep 880→260 Hz, 0.09 s, snappy env |
| heavy shoot | saw sweep 320→90 Hz, 0.16 s |
| hit | plain noise burst, 0.06 s |
| explosion | lowpassed noise 0.45 s + sine sweep 95→38 Hz layered |
| pickup/XP | sine sweep UP 660→1350 Hz, 0.08 s, quiet |
| level-up / victory | rising note arpeggio (C-E-G-C), last note longer |
| hurt | low square sweep 130→70 Hz + noise, layered |
| UI click | 1200 Hz sine, 0.035 s |
| ambient bed | detuned sine drone — see Part 5 |

**Browser runtime alternative — WebAudio synthesis, zero files.** The FI starter shell's `engine.js` already ships `E.beep(freq, dur, type)` (lazy AudioContext, oscillator + gain, try/catch). Grow it with the same vocabulary: a gain-node envelope (`gain.exponentialRampToValueAtTime`) for decay, a noise `AudioBuffer` for hits, `frequency.linearRampToValueAtTime` for sweeps. Either lane is fine for browser games — WebAudio for instant zero-asset sound, baked WAVs (`py tools/make-sfx.py --out web/assets/sfx`) when you want the exact same soundscape file-based. Godot: bake WAVs (`--out godot/assets/sfx`) — see Part 6.

---

## Part 4 · Browser gotchas *(the ones that ship silent builds)*

- **Autoplay policy: the AudioContext is born suspended.** No browser plays sound before a user gesture. Create the context lazily AND call `actx.resume()` inside your first input handler. *(FI)* The build protocol gives you a free unlock: the game starts at a **menu** — the "Start" click is your gesture. A game that boots straight into ambient sound will be silent and you won't know why.
- **Wrap all audio in try/catch.** Audio must never crash the game loop (the starter shell already does this — keep the pattern). No context, no file, no sound: fine. Exception: never.
- **Make ambient idempotent.** `playAmbient()` must no-op if already playing — the one-input-restart rule (FI-PLAYBOOK) means restarts happen constantly, and stacked ambient loops double in volume each run.
- **Missing audio files are placeholders, not errors** — the audio analog of "never render nothing": if a WAV 404s, skip it silently (or fall back to a WebAudio beep); zero audio files must still boot clean (2342's AudioManager checks existence before loading).
- Safari/iOS: use `window.AudioContext || window.webkitAudioContext`; remember the hardware mute switch silences WebAudio — "no sound on my phone" is often the switch, not your code.

---

## Part 5 · The seamless ambient loop (the integer-cycles trick)

A looping drone clicks at the seam unless every component finishes exactly where it started. Skip crossfade math entirely: **choose component frequencies so each completes a whole number of cycles over the loop duration**, and give any amplitude wobble exactly one full cycle per loop. 2342's 6-second bed: 55.0 Hz (330 cycles), 55.5 Hz (333), 110 Hz (660), all detuned sines layered, wobble `0.8 + 0.2·sin(2πt/6)` — mathematically seamless, no post-processing. Keep it QUIET (−16 dB under everything) — ambience you consciously notice is ambience that's too loud.

---

## Part 6 · Godot lane: the AudioManager pattern

2342's `AudioManager` autoload is the reference playback layer (FI-PLAYBOOK Part 3's third autoload). Reproduce its behaviors, not just its API:

- **Voice pool** (12 `AudioStreamPlayer`s, round-robin) — never one-player-per-sound-per-frame.
- **`play(name, volume_db, pitch_variance)`** randomizes `pitch_scale` ±6% per call and **debounces**: the same SFX within 40 ms is dropped.
- **Ambient**: −16 dB, `AudioStreamWAV.LOOP_FORWARD` over the whole file; stop = 0.5 s tween fade then reset — never a hard cut.
- **Graceful absence**: check `ResourceLoader.exists()` per WAV; missing = skipped, game plays silent-but-alive.
- `process_mode = PROCESS_MODE_ALWAYS` so UI sounds work while paused.

---

## Part 7 · Verify without ears *(FI, non-negotiable)*

You cannot hear the game. That is not an excuse to skip verification — it means audio gets the same split as everything else you can't judge (FI-PLAYBOOK Phase 5): **verify what's structural, surface what's subjective.**

Structural gates (run them yourself, every audio pass):
1. **Every core event has a sound.** Grep the event/action list (EventBus signals, input handlers) against the SFX map; list the unmapped ones and fix or justify each.
2. **Files exist and are sane** — every mapped WAV exists, has nonzero duration, peak ≤ 0.95 (the tool normalizes; verify anyway when you hand-mix).
3. **Loop seam is clean by construction** — integer-cycles rule applied (Part 5), or start/end samples both ~0.
4. **Silence never breaks the game** — boot with `assets/sfx/` emptied: zero errors, game fully playable.
5. **The unlock works** — in a browser, confirm no sound before first input and sound after it (read the console for suspended-context warnings).

Director listen pass (the subjective half): deliver a **sound board** — one self-contained page with a button per SFX (+ the ambient loop), each with Keep/Tweak/Reject and a notes field, exporting answers like the game's REVIEW-DASHBOARD. The two playtest questions that matter: *mute the game — does it feel dead?* and *play two minutes — does anything grate on repetition?*

---

## Anti-patterns — refuse these on sight

- **Deferring audio to "later."** The pack ships `tools/make-sfx.py`; running it costs one command. Silent rev-1 is a process failure.
- **Music before SFX.** SFX carry the core verb's feel; music is polish. Build the feedback bundle first.
- **The re-roll loop on SFX** — regenerating/downloading files to fix "a bit too long" when a recipe edit is a one-line diff.
- **Unrandomized repeats** — the same pitch fifty times a minute reads as a broken sound.
- **Loud ambience** — if the bed competes with the core verb, the whole mix reads as noise.
- **Unlicensed sample packs** — synthesis has no rights questions; a random freesound zip does.
- **Audio that can crash or block** — an exception in a sound call, a missing file that 404-crashes, a boot that hangs on audio decode. Sound is always optional at runtime, always present in the build.
- **One sound for everything** — if pickup, hit, and click share a beep, the vocabulary teaches nothing.
