/**
 * sfx.js — synthesized WebAudio (FI-AUDIO doctrine).
 * Extended for Night Circuit: engine loop, drift, weapons, nitro, explode.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var S = (GAME.sfx = {});
  var actx = null, master = null;
  var engineOsc = null, engineGain = null, engineFilter = null;
  var engineRunning = false;

  function ac() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        master.gain.value = 0.48;
        master.connect(actx.destination);
      } catch (e) { actx = null; }
    }
    return actx;
  }
  function unlock() {
    var a = ac();
    if (a && a.state === 'suspended') { try { a.resume(); } catch (e) {} }
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

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
  S.pickup = function () { S.sweep(660, 1350, 0.08, 'sine', 0.1); };
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
    try { S.sweep(280, 70, 0.18, 'sawtooth', 0.12); noisePlay(0.12, 0.1, 1800); } catch (e) {}
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
  S.nitro = function () {
    if (!gate('nt', 200)) return;
    try { S.sweep(120, 480, 0.25, 'sawtooth', 0.08); } catch (e) {}
  };
  S.drift = function () {
    if (!gate('dr', 120)) return;
    try { noisePlay(0.15, 0.07, 2200); } catch (e) {}
  };
  S.special = function () {
    if (!gate('sp', 150)) return;
    try { S.jingle([440, 660, 880], 0.06, 0.12); noisePlay(0.1, 0.08, 3000); } catch (e) {}
  };
  S.collide = function () {
    if (!gate('cl', 90)) return;
    try { S.thump(120, 0.1); noisePlay(0.08, 0.12, 1500); } catch (e) {}
  };

  // Continuous engine layer (call engineUpdate each frame)
  S.engineStart = function () {
    var a = ac(); if (!a || !master || engineRunning) return;
    try {
      engineOsc = a.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = a.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 400;
      engineGain = a.createGain();
      engineGain.gain.value = 0.0001;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineRunning = true;
    } catch (e) { engineRunning = false; }
  };
  S.engineStop = function () {
    if (!engineRunning) return;
    try {
      var a = ac();
      if (engineGain && a) {
        engineGain.gain.cancelScheduledValues(a.currentTime);
        engineGain.gain.setTargetAtTime(0.0001, a.currentTime, 0.05);
      }
      if (engineOsc) { try { engineOsc.stop(a.currentTime + 0.1); } catch (e2) {} }
    } catch (e) {}
    engineOsc = null;
    engineGain = null;
    engineFilter = null;
    engineRunning = false;
  };
  S.engineUpdate = function (speedNorm, nitro) {
    if (!engineRunning || !engineOsc || !engineGain || !engineFilter) return;
    try {
      var a = ac(); if (!a) return;
      var t = a.currentTime;
      var f = 48 + speedNorm * 140 + (nitro ? 40 : 0);
      var g = 0.02 + speedNorm * 0.07 + (nitro ? 0.03 : 0);
      var cut = 280 + speedNorm * 1200 + (nitro ? 400 : 0);
      engineOsc.frequency.setTargetAtTime(f, t, 0.05);
      engineFilter.frequency.setTargetAtTime(cut, t, 0.05);
      engineGain.gain.setTargetAtTime(g, t, 0.05);
    } catch (e) {}
  };
})();
