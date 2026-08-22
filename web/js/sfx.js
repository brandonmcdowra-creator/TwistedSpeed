/**
 * sfx.js — synthesized WebAudio (FI-AUDIO doctrine).
 * Extended for Night Circuit: engine loop, drift, weapons, nitro, explode.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var S = (GAME.sfx = {});
  var actx = null, master = null;
  var engineOsc = null, engineOsc2 = null, engineGain = null, engineGain2 = null;
  var engineFilter = null, engineFilter2 = null;
  var engineRunning = false;
  var nitroLoop = null, nitroLoopGain = null, nitroLoopOn = false;
  // Last commanded engine mix (so resume can re-pump after suspend) — v357
  var _engSn = 0.12, _engNitro = false, _engMp = 1;

  function ac() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        // Slightly hotter bus so continuous layers read on laptop speakers (v357)
        master.gain.value = 0.58;
        master.connect(actx.destination);
      } catch (e) { actx = null; }
    }
    return actx;
  }
  /** After resume: re-apply engine gains so post-START isn't silent (v357) */
  function pumpEngineAfterResume() {
    try {
      if (!engineRunning || !engineGain) return;
      var a = ac();
      if (!a || a.state !== 'running') return;
      S.engineUpdateEx(_engSn, _engNitro, _engMp);
    } catch (e) {}
  }
  /** First key/click resumes AudioContext; never throws (v301) */
  function unlock() {
    try {
      var a = ac();
      if (!a) return false;
      if (a.state === 'suspended') {
        var p = a.resume();
        if (p && typeof p.then === 'function') {
          p.then(function () {
            S._unlocked = true;
            pumpEngineAfterResume();
          }).catch(function () {});
        } else {
          S._unlocked = true;
          pumpEngineAfterResume();
        }
      } else if (a.state === 'running') {
        S._unlocked = true;
      }
      return a.state === 'running' || a.state === 'suspended';
    } catch (e) {
      return false;
    }
  }
  S.unlock = unlock;
  S.isUnlocked = function () {
    try { return !!(actx && actx.state === 'running'); } catch (e) { return false; }
  };
  /** Structural probe — director/agent verify without ears (v357) */
  S.engineProbe = function () {
    try {
      var a = ac();
      var g1 = engineGain ? engineGain.gain.value : 0;
      var g2 = engineGain2 ? engineGain2.gain.value : 0;
      var gn = nitroLoopGain ? nitroLoopGain.gain.value : 0;
      return {
        ctx: a ? a.state : 'none',
        running: !!engineRunning,
        unlocked: !!(a && a.state === 'running'),
        g1: g1,
        g2: g2,
        nitroG: gn,
        f1: engineOsc ? engineOsc.frequency.value : 0,
        f2: engineOsc2 ? engineOsc2.frequency.value : 0,
        audible: !!(engineRunning && a && a.state === 'running' && (g1 + g2) > 0.04),
      };
    } catch (e) {
      return { ctx: 'err', running: false, audible: false };
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  window.addEventListener('keyup', unlock);

  var last = {};
  function gate(key, ms) {
    var now = performance.now();
    if (now - (last[key] || -1000) < (ms || 40)) return false;
    last[key] = now;
    return true;
  }
  function rand(v) { return v * (1 + (Math.random() * 0.16 - 0.08)); }
  function env(g, t0, dur, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, 0.02));
  }
  function osc(type, f0, f1, t0, dur, peak) {
    var a = ac(); if (!a || !master) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(f0, 1), t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    env(g, t0, dur, peak);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  var noiseBuf = null;
  function noisePlay(dur, vol, dark) {
    var a = ac(); if (!a || !master) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var src = a.createBufferSource(); src.buffer = noiseBuf;
    var f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = dark || 8000;
    var g = a.createGain(), t0 = a.currentTime;
    env(g, t0, dur || 0.08, vol || 0.15);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + (dur || 0.08) + 0.05);
  }

  S.beep = function (freq, dur, type, vol) {
    if (!gate('b' + (freq | 0))) return;
    try { var a = ac(); if (a) osc(type || 'square', rand(freq || 440), 0, a.currentTime, dur || 0.08, vol || 0.12); } catch (e) {}
  };
  S.sweep = function (f0, f1, dur, type, vol) {
    if (!gate('s' + (f0 | 0))) return;
    try { var a = ac(); if (a) osc(type || 'square', rand(f0), rand(f1), a.currentTime, dur || 0.12, vol || 0.12); } catch (e) {}
  };
  S.noise = function (dur, vol, dark) {
    if (!gate('n')) return;
    try { noisePlay(dur, vol, dark); } catch (e) {}
  };
  S.thump = function (f0, dur) {
    if (!gate('t')) return;
    try {
      var a = ac(); if (!a) return;
      osc('sine', rand(f0 || 160), 55, a.currentTime, dur || 0.12, 0.3);
      noisePlay((dur || 0.12) * 0.7, 0.08, 1200);
    } catch (e) {}
  };
  S.jingle = function (freqs, noteDur, vol) {
    if (!gate('j')) return;
    try {
      var a = ac(); if (!a) return;
      var nd = noteDur || 0.14, t = a.currentTime;
      for (var i = 0; i < freqs.length; i++) {
        var f = freqs[i], lastNote = i === freqs.length - 1;
        var d = lastNote ? nd * 3 : nd * 1.3;
        osc('sine', f, 0, t, d, vol || 0.16);
        osc('sine', f * 2, 0, t, d, (vol || 0.16) * 0.35);
        t += nd * 0.65;
      }
    } catch (e) {}
  };

  S.click = function () { S.beep(1200, 0.035, 'sine', 0.08); };
  S.confirm = function () { S.jingle([784, 1046], 0.07); };
  S.deny = function () { S.sweep(220, 110, 0.12, 'square', 0.1); };
  S.hit = function () { S.noise(0.06, 0.18); };
  // Powerup grab — louder than a quiet sweep (v303 first-minute)
  S.pickup = function () {
    if (!gate('pu', 70)) return;
    try {
      var a = ac(); if (!a) return;
      S.sweep(720, 1480, 0.1, 'sine', 0.12);
      osc('triangle', 880, 1320, a.currentTime, 0.08, 0.08);
      S.beep(1568, 0.04, 'sine', 0.07);
    } catch (e) {}
  };
  S.hurt = function () { S.thump(160, 0.12); };
  S.win = function () { S.jingle([523, 659, 784, 1046], 0.14); };
  S.lose = function () { S.jingle([392, 349, 294, 220], 0.2); };

  // --- Combat / race ---
  S.mg = function () {
    if (!gate('mg', 45)) return;
    try {
      S.noise(0.03, 0.1, 6000);
      var a = ac(); if (a) osc('square', rand(900), rand(400), a.currentTime, 0.04, 0.05);
    } catch (e) {}
  };
  S.rocket = function () {
    if (!gate('rk', 80)) return;
    try {
      S.thump(70, 0.12);
      S.sweep(320, 55, 0.28, 'sawtooth', 0.16);
      noisePlay(0.16, 0.14, 1600);
    } catch (e) {}
  };
  S.mine = function () {
    if (!gate('mn', 100)) return;
    try { S.beep(140, 0.06, 'square', 0.08); } catch (e) {}
  };
  S.explode = function () {
    if (!gate('ex', 60)) return;
    try {
      S.thump(90, 0.22);
      noisePlay(0.25, 0.2, 900);
      var a = ac(); if (a) osc('sawtooth', 180, 40, a.currentTime, 0.2, 0.1);
    } catch (e) {}
  };
  // Rival wreck — bigger than stock hit, night-readable (louder v359)
  S.rivalWreck = function () {
    if (!gate('rw', 80)) return;
    try {
      var a = ac(); if (!a) return;
      var t0 = a.currentTime;
      S.thump(55, 0.4);
      noisePlay(0.42, 0.32, 650);
      noisePlay(0.22, 0.16, 2200);
      osc('sawtooth', 240, 30, t0, 0.36, 0.18);
      osc('square', 100, 35, t0, 0.24, 0.12);
      osc('sawtooth', 80, 28, t0 + 0.05, 0.3, 0.1);
      // metal settle
      osc('triangle', 160, 50, t0 + 0.12, 0.2, 0.06);
    } catch (e) {}
  };
  // Kill credit sting — rising reward on top of boom (v359)
  S.elimSting = function (kills) {
    if (!gate('elim', 90)) return;
    try {
      var a = ac(); if (!a) return;
      var t0 = a.currentTime;
      var n = Math.max(1, kills | 0);
      // Rising scrap arpeggio — hotter on multi
      var peak = 0.12 + Math.min(0.06, (n - 1) * 0.02);
      osc('sine', 520, 0, t0, 0.07, peak);
      osc('sine', 784, 0, t0 + 0.05, 0.08, peak * 0.9);
      osc('sine', 1046, 0, t0 + 0.1, 0.12, peak * 0.85);
      if (n >= 2) osc('sine', 1318, 0, t0 + 0.14, 0.14, peak * 0.7);
      noisePlay(0.05, 0.05, 5000);
    } catch (e) {}
  };
  // Scrap crystal ping (pickup / kill drop)
  S.scrapPing = function () {
    if (!gate('scp', 50)) return;
    try {
      var a = ac(); if (!a) return;
      osc('sine', 880, 1320, a.currentTime, 0.1, 0.12);
      osc('sine', 1320, 1760, a.currentTime + 0.04, 0.14, 0.09);
      noisePlay(0.04, 0.05, 5000);
    } catch (e) {}
  };
  // Warden / gate warn stab
  S.wardenWarn = function () {
    if (!gate('ww', 200)) return;
    try {
      var a = ac(); if (!a) return;
      osc('square', 180, 420, a.currentTime, 0.18, 0.1);
      osc('sawtooth', 90, 200, a.currentTime, 0.22, 0.08);
      noisePlay(0.12, 0.1, 1800);
    } catch (e) {}
  };
  // Late hunter remount — was silent under toast (v288)
  S.lateHunter = function (wave) {
    if (!gate('lhunt', 280)) return;
    try {
      var a = ac(); if (!a) return;
      var t0 = a.currentTime;
      var hot = (wave | 0) >= 2;
      // Engine snarl rise + radar ping
      osc('sawtooth', hot ? 70 : 90, hot ? 280 : 220, t0, 0.28, hot ? 0.12 : 0.1);
      osc('square', hot ? 140 : 160, hot ? 380 : 320, t0 + 0.04, 0.2, 0.08);
      S.beep(hot ? 880 : 720, 0.06, 'square', 0.1);
      S.beep(hot ? 1100 : 960, 0.05, 'square', 0.08);
      noisePlay(0.16, 0.11, 2200);
      S.thump(hot ? 55 : 65, 0.18);
    } catch (e) {}
  };
  S.nitro = function () {
    if (!gate('nt', 200)) return;
    try {
      var a = ac(); if (!a) return;
      S.sweep(100, 520, 0.28, 'sawtooth', 0.1);
      osc('square', 80, 200, a.currentTime, 0.18, 0.06);
    } catch (e) {}
  };
  // Nitro event whoosh + engine scream layer (louder latch so Q burn is heard — v357)
  S.nitroWhoosh = function () {
    if (!gate('ntw', 260)) return;
    try {
      var a = ac(); if (!a) return;
      var t0 = a.currentTime;
      osc('sawtooth', 70, 620, t0, 0.4, 0.2);
      osc('sawtooth', 150, 900, t0, 0.34, 0.14);
      osc('square', 55, 180, t0, 0.24, 0.1);
      noisePlay(0.28, 0.2, 3800);
      // air rush band
      noisePlay(0.2, 0.14, 6000);
      S.thump(48, 0.14);
    } catch (e) {}
  };
  S.finishSting = function () {
    if (!gate('fin', 400)) return;
    try {
      // Cyan freedom arpeggio up
      S.jingle([523, 659, 784, 1046, 1318], 0.09, 0.14);
      var a = ac(); if (a) osc('sine', 1046, 1568, a.currentTime + 0.2, 0.25, 0.08);
    } catch (e) {}
  };
  S.deathSweep = function () {
    if (!gate('dth', 300)) return;
    try {
      var a = ac(); if (!a) return;
      osc('sawtooth', 400, 60, a.currentTime, 0.45, 0.12);
      noisePlay(0.35, 0.15, 1200);
    } catch (e) {}
  };
  S.drift = function () {
    if (!gate('dr', 120)) return;
    try { noisePlay(0.15, 0.07, 2200); } catch (e) {}
  };
  S.special = function () {
    if (!gate('sp', 150)) return;
    try { S.jingle([440, 660, 880], 0.06, 0.12); noisePlay(0.1, 0.08, 3000); } catch (e) {}
  };
  // Shared windup tick before signature specials
  S.specialWindup = function (id) {
    if (!gate('spw', 80)) return;
    try {
      var a = ac(); if (!a) return;
      var f0 = id === 'mausoleum' ? 90 : (id === 'choir' ? 180 : 160);
      osc('sine', f0, f0 * 1.6, a.currentTime, 0.12, 0.08);
      noisePlay(0.06, 0.05, 2500);
    } catch (e) {}
  };
  // MARROW — wet crunch + low rocket whoosh
  S.specialMarrow = function (ramFed) {
    if (!gate('spm', 120)) return;
    try {
      var a = ac(); if (!a) return;
      // wet bone crunch
      noisePlay(0.09, ramFed ? 0.2 : 0.14, 900);
      osc('sawtooth', 90, 40, a.currentTime, 0.12, 0.12);
      // lower rocket whoosh than stock
      osc('sawtooth', 200, 55, a.currentTime + 0.04, 0.22, 0.1);
      noisePlay(0.16, 0.1, 1400);
      if (ramFed) osc('square', 70, 40, a.currentTime, 0.1, 0.08);
    } catch (e) {}
  };
  // NEEDLE — harpoon crack + cable tension (distinct from Choir chord)
  S.specialNeedle = function () {
    if (!gate('spn', 120)) return;
    try {
      var a = ac(); if (!a) return;
      var t0 = a.currentTime;
      // whip crack
      osc('square', 1100, 180, t0, 0.07, 0.13);
      noisePlay(0.06, 0.14, 4500);
      // cable thrum
      osc('sawtooth', 180, 85, t0 + 0.04, 0.22, 0.09);
      osc('triangle', 90, 70, t0 + 0.02, 0.2, 0.07);
      S.thump(70, 0.1);
    } catch (e) {}
  };
  S.specialNeedleMiss = function () {
    if (!gate('spnm', 100)) return;
    try { S.sweep(320, 70, 0.12, 'square', 0.09); } catch (e) {}
  };
  S.specialNeedleHum = function () {
    if (!gate('spnh', 160)) return;
    try {
      var a = ac(); if (!a) return;
      osc('sine', 105, 90, a.currentTime, 0.18, 0.055);
      osc('triangle', 210, 190, a.currentTime, 0.16, 0.04);
      osc('sawtooth', 55, 50, a.currentTime, 0.14, 0.03);
    } catch (e) {}
  };
  // MAUSOLEUM — heavy lob thump (not rocket whoosh)
  S.specialMausoleumLob = function () {
    if (!gate('spl', 100)) return;
    try {
      var a = ac(); if (!a) return;
      var t0 = a.currentTime;
      osc('sine', 55, 32, t0, 0.18, 0.2);
      osc('sawtooth', 90, 45, t0, 0.16, 0.1);
      noisePlay(0.1, 0.1, 700);
      osc('triangle', 200, 90, t0 + 0.04, 0.14, 0.07);
      S.thump(60, 0.12);
    } catch (e) {}
  };
  S.specialMausoleumBoom = function () {
    if (!gate('spb', 80)) return;
    try {
      var a = ac(); if (!a) return;
      S.thump(55, 0.32);
      noisePlay(0.36, 0.24, 650);
      osc('sawtooth', 160, 28, a.currentTime, 0.32, 0.14);
      osc('square', 80, 35, a.currentTime, 0.2, 0.09);
      noisePlay(0.15, 0.12, 1400);
    } catch (e) {}
  };
  // VESPER — glass-shatter EMP (not rocket / not sermon chord)
  S.specialVesper = function () {
    if (!gate('spv', 120)) return;
    try {
      var a = ac(); if (!a) return;
      var t0 = a.currentTime;
      osc('sawtooth', 1400, 70, t0, 0.38, 0.12);
      osc('square', 1000, 55, t0, 0.3, 0.09);
      noisePlay(0.24, 0.16, 5500);
      osc('sine', 480, 80, t0 + 0.05, 0.28, 0.09);
      // electric snap
      osc('square', 2000, 400, t0, 0.08, 0.06);
      S.thump(45, 0.1);
    } catch (e) {}
  };
  // CHOIR — vocal sermon blast (chord swell — not harpoon crack)
  S.specialChoir = function () {
    if (!gate('spc', 120)) return;
    try {
      var a = ac(); if (!a) return;
      var t = a.currentTime;
      // open fifth + third swell
      osc('sawtooth', 110, 165, t, 0.32, 0.11);
      osc('square', 220, 330, t, 0.28, 0.1);
      osc('square', 277, 415, t + 0.02, 0.26, 0.08);
      osc('triangle', 165, 247, t + 0.01, 0.3, 0.07);
      // room shout
      noisePlay(0.18, 0.14, 1800);
      noisePlay(0.1, 0.08, 3200);
      S.thump(48, 0.14);
    } catch (e) {}
  };
  // RAZORBACK — metal hail caltrop scatter (not rocket)
  S.specialRazorback = function () {
    if (!gate('spr', 120)) return;
    try {
      var a = ac(); if (!a) return;
      var t0 = a.currentTime;
      noisePlay(0.16, 0.18, 4800);
      osc('square', 900, 180, t0, 0.12, 0.08);
      osc('sawtooth', 160, 55, t0, 0.18, 0.09);
      S.thump(85, 0.1);
      // hail cascade — discrete tinks
      for (var i = 0; i < 5; i++) {
        osc('square', 700 - i * 90, 160, t0 + i * 0.028, 0.055, 0.045);
        noisePlay(0.04, 0.05, 5000 - i * 400);
      }
    } catch (e) {}
  };
  S.collide = function () {
    if (!gate('cl', 90)) return;
    try { S.thump(120, 0.1); noisePlay(0.08, 0.12, 1500); } catch (e) {}
  };
  // Hazard tells — oil/sand were silent action (v319)
  S.oil = function () {
    if (!gate('oil', 140)) return;
    try {
      var a = ac(); if (!a) return;
      noisePlay(0.14, 0.11, 700);
      osc('sine', 160, 70, a.currentTime, 0.12, 0.07);
      osc('triangle', 90, 50, a.currentTime, 0.1, 0.05);
    } catch (e) {}
  };
  S.sand = function () {
    if (!gate('sd', 160)) return;
    try {
      noisePlay(0.18, 0.1, 500);
      var a = ac(); if (!a) return;
      osc('sawtooth', 70, 40, a.currentTime, 0.12, 0.04);
    } catch (e) {}
  };
  S.spike = function () {
    if (!gate('sp', 110)) return;
    try {
      S.thump(210, 0.1);
      noisePlay(0.09, 0.14, 2800);
      var a = ac(); if (!a) return;
      osc('square', 320, 90, a.currentTime, 0.07, 0.06);
    } catch (e) {}
  };
  // Heavy ram — denser metal crunch than light collide
  S.ram = function () {
    if (!gate('rm', 100)) return;
    try {
      var a = ac(); if (!a) return;
      S.thump(95, 0.16);
      noisePlay(0.14, 0.16, 1100);
      osc('sawtooth', 140, 50, a.currentTime, 0.14, 0.09);
      osc('square', 60, 40, a.currentTime, 0.1, 0.06);
    } catch (e) {}
  };

  // Continuous engine layer — dual osc + optional nitro hiss (v294)
  // v357: mid-present idle + crank-up so first second is heard on laptop speakers
  S.engineStart = function () {
    try { unlock(); } catch (e0) {}
    var a = ac(); if (!a || !master || engineRunning) return;
    try {
      var t0 = a.currentTime;
      // Sub rumble
      engineOsc = a.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 52;
      engineFilter = a.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = a.createGain();
      engineGain.gain.setValueAtTime(0.0001, t0);
      // Crank to idle immediately — don't wait for first update tick
      engineGain.gain.linearRampToValueAtTime(0.11, t0 + 0.07);
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Mid growl — louder relative so small speakers carry the engine
      engineOsc2 = a.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 108;
      engineFilter2 = a.createBiquadFilter();
      engineFilter2.type = 'lowpass';
      engineFilter2.frequency.value = 1100;
      engineGain2 = a.createGain();
      engineGain2.gain.setValueAtTime(0.0001, t0);
      engineGain2.gain.linearRampToValueAtTime(0.065, t0 + 0.07);
      engineOsc2.connect(engineFilter2);
      engineFilter2.connect(engineGain2);
      engineGain2.connect(master);
      engineOsc2.start();
      engineRunning = true;
      _engSn = 0.12; _engNitro = false; _engMp = 1;
      // One-shot ignition bark so START is unmistakable (not only continuous gain)
      try {
        osc('sawtooth', 70, 140, t0, 0.12, 0.1);
        noisePlay(0.08, 0.08, 1600);
      } catch (eIgn) {}
    } catch (e) { engineRunning = false; }
  };
  S.engineStop = function () {
    if (!engineRunning) return;
    try {
      var a = ac();
      if (a) {
        if (engineGain) {
          engineGain.gain.cancelScheduledValues(a.currentTime);
          engineGain.gain.setTargetAtTime(0.0001, a.currentTime, 0.05);
        }
        if (engineGain2) {
          engineGain2.gain.cancelScheduledValues(a.currentTime);
          engineGain2.gain.setTargetAtTime(0.0001, a.currentTime, 0.05);
        }
        if (nitroLoopGain) {
          nitroLoopGain.gain.cancelScheduledValues(a.currentTime);
          nitroLoopGain.gain.setTargetAtTime(0.0001, a.currentTime, 0.04);
        }
      }
      if (engineOsc) { try { engineOsc.stop((a && a.currentTime || 0) + 0.1); } catch (e2) {} }
      if (engineOsc2) { try { engineOsc2.stop((a && a.currentTime || 0) + 0.1); } catch (e3) {} }
      if (nitroLoop) { try { nitroLoop.stop((a && a.currentTime || 0) + 0.08); } catch (e4) {} }
    } catch (e) {}
    engineOsc = null; engineOsc2 = null;
    engineGain = null; engineGain2 = null;
    engineFilter = null; engineFilter2 = null;
    nitroLoop = null; nitroLoopGain = null; nitroLoopOn = false;
    engineRunning = false;
  };
  function ensureNitroLoop(a) {
    if (nitroLoopOn || !a || !master) return;
    try {
      nitroLoop = a.createOscillator();
      nitroLoop.type = 'sawtooth';
      nitroLoop.frequency.value = 220;
      nitroLoopGain = a.createGain();
      nitroLoopGain.gain.value = 0.0001;
      var nf = a.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 1400;
      nf.Q.value = 0.7;
      nitroLoop.connect(nf);
      nf.connect(nitroLoopGain);
      nitroLoopGain.connect(master);
      nitroLoop.start();
      nitroLoopOn = true;
      nitroLoop._filter = nf;
    } catch (e) { nitroLoopOn = false; }
  }
  S.engineUpdate = function (speedNorm, nitro) {
    S.engineUpdateEx(speedNorm, nitro, 1);
  };
  // massPitch: >1 lighter (Needle), <1 heavier (Mausoleum)
  S.engineUpdateEx = function (speedNorm, nitro, massPitch) {
    // Auto-restart if race keeps pumping but layer died (suspend / stop race) — v357
    if (!engineRunning || !engineOsc || !engineGain || !engineFilter) {
      try { S.engineStart(); } catch (eRs) {}
      if (!engineRunning || !engineOsc || !engineGain || !engineFilter) return;
    }
    try {
      var a = ac(); if (!a) return;
      // Keep unlocking while racing — first frame after START may still be suspended
      if (a.state === 'suspended') {
        try { unlock(); } catch (eU) {}
      }
      var t = a.currentTime;
      var mp = massPitch != null ? massPitch : 1;
      var sn = Math.max(0, Math.min(1.2, speedNorm || 0));
      _engSn = sn; _engNitro = !!nitro; _engMp = mp;
      var f = (48 + sn * 175 + (nitro ? 80 : 0)) * mp;
      var f2 = f * 2.05;
      // Hotter idle + mid so engine is heard, not just present (v357)
      var g = 0.1 + sn * 0.14 + (nitro ? 0.08 : 0);
      var g2 = 0.055 + sn * 0.09 + (nitro ? 0.05 : 0);
      var cut = 380 + sn * 1500 + (nitro ? 800 : 0);
      var cut2 = 700 + sn * 2300 + (nitro ? 1000 : 0);
      engineOsc.frequency.setTargetAtTime(f, t, 0.04);
      engineFilter.frequency.setTargetAtTime(cut, t, 0.05);
      engineGain.gain.setTargetAtTime(g, t, 0.04);
      if (engineOsc2 && engineGain2 && engineFilter2) {
        engineOsc2.frequency.setTargetAtTime(f2, t, 0.04);
        engineFilter2.frequency.setTargetAtTime(cut2, t, 0.05);
        engineGain2.gain.setTargetAtTime(g2, t, 0.04);
      }
      // Continuous nitro scream while held (not only latch whoosh)
      if (nitro) {
        ensureNitroLoop(a);
        if (nitroLoop && nitroLoopGain) {
          nitroLoop.frequency.setTargetAtTime(200 + sn * 480, t, 0.05);
          nitroLoopGain.gain.setTargetAtTime(0.09 + sn * 0.06, t, 0.05);
          if (nitroLoop._filter) {
            nitroLoop._filter.frequency.setTargetAtTime(1000 + sn * 2200, t, 0.07);
          }
        }
      } else if (nitroLoopGain) {
        nitroLoopGain.gain.setTargetAtTime(0.0001, t, 0.08);
      }
    } catch (e) {}
  };
})();
