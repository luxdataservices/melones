/* Melones Italo pack: sounds, the demo song, and how to load them into the engine (melones2.wasm).
 * Shared by the browser playground and the offline renderer. GPL-3.0-only (as Melodee). */
const ID = %%IDS%%;
const SID = 3, DRUM = 10;

/* A sound: engine, a factory preset to start from, then overrides.
 * E: the SID's EDIT 1-8 [MODEL, WAVE, STACK, PW, CUT, RES, MODE, DRIVE]
 *   MODEL 0 6581, 1 8580 | WAVE 0 TRI 1 SAW 2 PULSE 3 NOISE 4 T+S 5 T+P 6 S+P 7 TSP
 *   STACK 0 ONE 1 DETUNE 2 OCT 3 FIFTH 4 MAJOR 5 SYNC 6 RING 7 SUB | MODE 0 LP 1 BP 2 HP 3 NOTCH ... 7 OFF
 * VOICE 0 POLY 1 MONO 2 LEGATO. Times 0-127 (60 = 78 ms, 70 = 160 ms, 80 = 330 ms, 90 = 680 ms).
 * LFO rate 0-127 (55 = 0.9 Hz, 88 = 5 Hz). ED_PIT / LD_PIT: 3/16 semitone a step (1 = 19 cents, 63 = 12 semitones).
 * ECHO: the note echo [level, rate (0 1/4, 1 1/8, 2 1/16, 4 8T, 5 16T), decay].
 * SEND: to the master [chorus, reverb, room]. */
const SOUNDS = {
  bass: [
    {name: "808 ROLL", note: "Long sub with a pitch punch; slides glide between notes", eng: SID, pre: 4,
     E: [1, 0, 0, 64, 127, 0, 7, 56], ATK: 0, DEC: 98, SUS: 96, REL: 82, ED_PIT: 10, VOICE: 2, GLIDE: 34, LEVEL: 118},
    {name: "1986 BASS", note: "Held saw bass, slow filter", eng: SID, pre: 6,
     E: [0, 1, 1, 64, 30, 8, 0, 30], ATK: 4, DEC: 90, SUS: 100, REL: 50, ED_FLT: 16, VOICE: 2, LEVEL: 108},
    {name: "BODY HEAT", note: "Pulse octave bass, plucky filter", eng: SID, pre: 3,
     E: [0, 2, 0, 36, 30, 11, 0, 34], ATK: 0, DEC: 58, SUS: 34, REL: 22, ED_FLT: 34, VOICE: 1, LEVEL: 112},
    {name: "MONEY BASS", note: "Detuned saw octave bass", eng: SID, pre: 7,
     E: [0, 1, 1, 64, 34, 9, 0, 46], ATK: 0, DEC: 60, SUS: 46, REL: 22, ED_FLT: 30, VOICE: 1, LEVEL: 108},
    {name: "CASCO SUB", note: "Round pulse with a sub", eng: SID, pre: 4,
     E: [1, 2, 7, 52, 22, 5, 0, 10], ATK: 0, DEC: 64, SUS: 70, REL: 24, ED_FLT: 18, VOICE: 1, LEVEL: 112},
    {name: "RUBBER BASS", note: "Melodee factory", eng: SID, pre: 2, LEVEL: 104},
    {name: "ARP BASS", note: "Melodee factory", eng: SID, pre: 3, LEVEL: 104}
  ],
  arp: [
    {name: "TWINKLE", note: "Falling bell sparkles, a little overlap", eng: SID, pre: 14,
     E: [1, 5, 2, 36, 127, 0, 7, 0], ATK: 0, DEC: 72, SUS: 0, REL: 50, VOICE: 0, LEVEL: 118,
     SEND: [40, 70, 0], PAN: 10},
    {name: "LASER ARP", note: "Thin pulse pluck", eng: SID, pre: 11,
     E: [0, 2, 1, 26, 92, 6, 0, 20], ATK: 0, DEC: 68, SUS: 16, REL: 44, ED_FLT: 20, VOICE: 1, LEVEL: 110,
     SEND: [44, 40, 0], PAN: -12},
    {name: "CRYSTAL ARP", note: "Triangle + pulse bell", eng: SID, pre: 14,
     E: [1, 5, 2, 40, 127, 0, 7, 0], ATK: 0, DEC: 70, SUS: 0, REL: 50, VOICE: 1, LEVEL: 110,
     SEND: [34, 50, 0], PAN: 12},
    {name: "SYNC ARP", note: "Hard-sync zap on every note", eng: SID, pre: 10,
     E: [1, 1, 5, 64, 100, 4, 0, 10], ATK: 0, DEC: 66, SUS: 20, REL: 36, ED_SHP: 40, VOICE: 1, LEVEL: 106,
     SEND: [30, 34, 0]}
  ],
  lead: [
    {name: "GHOSTCAR", note: "Bright detuned saw riff, short 8ths", eng: SID, pre: 8,
     E: [0, 1, 1, 64, 104, 4, 0, 30], ATK: 0, DEC: 66, SUS: 70, REL: 40, ED_FLT: 14, VOICE: 1, LEVEL: 104, SEND: [50, 50, 0]},
    {name: "CYBER LEAD", note: "Saw lead, delayed vibrato, glide", eng: SID, pre: 8,
     E: [0, 1, 1, 64, 70, 5, 0, 18], ATK: 6, DEC: 70, SUS: 104, REL: 58, ED_FLT: 8, VOICE: 2, GLIDE: 8,
     LRATE: 88, LWAVE: 0, LFADE: 84, LD_PIT: 1, LEVEL: 112, SEND: [50, 64, 0]},
    {name: "XALAN SYNC", note: "Sync sweep lead", eng: SID, pre: 10,
     E: [1, 1, 5, 64, 104, 5, 0, 12], ATK: 2, DEC: 74, SUS: 100, REL: 52, ED_SHP: 46, VOICE: 2, GLIDE: 6,
     LRATE: 86, LFADE: 84, LD_PIT: 1, LEVEL: 110, SEND: [40, 60, 0]},
    {name: "STOP PULSE", note: "Hollow PWM lead", eng: SID, pre: 11,
     E: [0, 2, 1, 30, 80, 6, 0, 30], ATK: 2, DEC: 70, SUS: 100, REL: 50, ED_FLT: 6, VOICE: 2, GLIDE: 6,
     LRATE: 60, LD_SHP: 18, LEVEL: 112, SEND: [44, 60, 0]},
    {name: "VELVET STRINGS", note: "Slow PWM pad (poly)", eng: SID, pre: 16,
     E: [0, 2, 1, 44, 64, 6, 0, 12], ATK: 74, DEC: 86, SUS: 110, REL: 82, VOICE: 0,
     LRATE: 52, LWAVE: 1, LD_SHP: 12, LEVEL: 94, SEND: [70, 60, 0]},
    {name: "HI-NRG BRASS", note: "Detuned saw stab (poly)", eng: SID, pre: 27,
     E: [0, 1, 1, 64, 50, 8, 0, 40], ATK: 18, DEC: 70, SUS: 70, REL: 46, ED_FLT: 26, VOICE: 0, LEVEL: 92,
     SEND: [40, 40, 0]},
    {name: "SYNDRUM PEW", note: "Triangle drum that falls an octave", eng: SID, pre: 20,
     E: [1, 0, 0, 64, 127, 0, 7, 0], ATK: 0, DEC: 70, SUS: 0, REL: 66, ED_PIT: 63, VOICE: 1, LEVEL: 100,
     ECHO: [56, 1, 70], SEND: [0, 60, 0]},
    {name: "LASER ZAP", note: "Noise-sync laser down-sweep", eng: SID, pre: 29,
     E: [1, 2, 5, 82, 100, 6, 0, 0], ATK: 0, DEC: 72, SUS: 0, REL: 60, ED_PIT: 63, ED_SHP: 63, VOICE: 1,
     LEVEL: 80, ECHO: [60, 4, 64], SEND: [0, 60, 0]}
  ],
  drums: [
    {name: "SID DIGI KIT", note: "Kick and snare as C64 digis", eng: DRUM, pre: 3, LEVEL: 108, SEND: [0, 0, 24]},
    {name: "SID CRUNCH", note: "Everything up, chip kick: tuned down, longest decay, full snap, screaming filter", eng: DRUM, pre: 2,
     E: [6, 44, 127, 127, 127, 127, 0, 127], LEVEL: 108, SEND: [0, 0, 30]},
    {name: "SIMMONS KIT", note: "SDS-V on the SID: diving toms, tone-and-noise snare", eng: DRUM, pre: 6, LEVEL: 110, SEND: [0, 24, 30]},
    {name: "SIMMONS BIG", note: "Simmons, tuned down, longer and roomier", eng: DRUM, pre: 6,
     E: [9, 56, 112, 104, 100, 124, 0, 40], LEVEL: 108, SEND: [0, 44, 34]},
    {name: "808 BOOM", note: "Round kick with a long boom, driven; tuned to the key", eng: DRUM, pre: 0, KEYTUNE: 29.30,
     E: [4, 54, 76, 114, 96, 122, 1, 84], LEVEL: 104, SEND: [0, 0, 24]},
    {name: "SID KIT", note: "Every drum on the chip", eng: DRUM, pre: 2, LEVEL: 112, SEND: [0, 0, 24]},
    {name: "808 KIT", note: "Melodee's 808, kick tuned to the key", eng: DRUM, pre: 0, KEYTUNE: 31.16, LEVEL: 104, SEND: [0, 0, 20]}
  ]
};

/* THEMES: a progression (a bass root and a chord per bar, in A minor; KEY transposes), the main bass figure and
 * a lead melody written to it. The arps and the pad follow the chords, so every part agrees whatever the key. */
const THEMES = {
  "Night Drive": {note: "Am F G Em at 124: driving 16th octave bass, rising 16th arps, 16th hats, the hook on top", bass: "octave", arp: "arp", hats16: 1, bpm: 124,
    ch: [[45, [57, 60, 64]], [41, [53, 57, 60]], [43, [55, 59, 62]], [40, [52, 55, 59]]],
    mel: [[0, 76, 3], [3, 76, 2], [6, 74, 1], [7, 72, 2], [9, 69, 3], [12, 72, 2], [14, 74, 2],
      [16, 72, 3], [19, 72, 2], [22, 69, 1], [23, 72, 2], [25, 77, 4], [29, 76, 3],
      [32, 74, 3], [35, 74, 2], [38, 72, 1], [39, 74, 2], [41, 79, 4], [45, 77, 1], [46, 76, 2],
      [48, 76, 6], [54, 74, 2], [56, 71, 2], [58, 76, 6]]},
  "Spacer": {note: "Am Am G F: electro bass on the kick, a stuttering robot lead", bass: "electro",
    ch: [[45, [57, 60, 64]], [45, [57, 60, 64]], [43, [55, 59, 62]], [41, [53, 57, 60]]],
    mel: [[0, 76, 1], [2, 76, 1], [4, 74, 1], [5, 76, 2], [8, 69, 2], [11, 72, 1], [12, 72, 2], [14, 76, 2],
      [16, 76, 1], [18, 76, 1], [20, 74, 1], [21, 76, 2], [24, 81, 3], [28, 76, 2], [30, 74, 2],
      [32, 74, 1], [34, 74, 1], [36, 71, 1], [37, 74, 2], [40, 67, 2], [43, 71, 1], [44, 71, 2], [46, 74, 2],
      [48, 72, 1], [50, 72, 1], [52, 69, 1], [53, 72, 2], [56, 77, 3], [60, 77, 2], [62, 72, 2]]},
  "Hi-NRG": {note: "Am G F E: octave bass, a falling hook into the E major turn", bass: "octave",
    ch: [[45, [57, 60, 64]], [43, [55, 59, 62]], [41, [53, 57, 60]], [40, [52, 56, 59]]],
    mel: [[0, 81, 2], [2, 79, 2], [4, 76, 4], [8, 69, 2], [10, 72, 2], [12, 76, 4],
      [16, 74, 2], [18, 71, 2], [20, 67, 4], [24, 71, 2], [26, 74, 2], [28, 79, 4],
      [32, 72, 2], [34, 69, 2], [36, 65, 4], [40, 69, 2], [42, 72, 2], [44, 77, 4],
      [48, 80, 4], [52, 76, 2], [54, 71, 2], [56, 76, 6], [62, 71, 2]]},
  "1986": {note: "Transcribed: Bm | Bm (A) | G | A held bass under an 8th-note B-A-G-F# riff (written in A minor, opens in B minor)",
    bass: "held", key: 2, bpm: 125, sounds: {bass: "1986 BASS", lead: "GHOSTCAR"},
    ch: [[45, [57, 60, 64]], [45, [57, 60, 64]], [41, [53, 57, 60]], [43, [55, 59, 62]]],
    bassSteps: [[0, 33, 16], [16, 33, 12], [28, 31, 4], [32, 29, 16], [48, 31, 16]],
    mel: [[0, 69, 2], [2, 67, 2], [4, 65, 2], [6, 64, 2], [8, 69, 2], [10, 64, 2], [12, 65, 2], [14, 74, 1], [15, 71, 1],
      [16, 69, 2], [18, 64, 2], [20, 65, 2], [22, 69, 1], [23, 72, 1], [24, 69, 1], [25, 72, 1], [26, 69, 1], [27, 76, 1], [28, 65, 2], [30, 64, 2],
      [32, 69, 2], [34, 64, 2], [36, 65, 2], [38, 64, 2], [40, 69, 2], [42, 64, 2], [44, 65, 2], [46, 64, 2],
      [48, 69, 2], [50, 67, 2], [52, 65, 2], [54, 64, 2], [56, 69, 2], [58, 64, 2], [60, 65, 2], [62, 64, 2]]},
  "Trap": {note: "Am Am F G at 140: a rolling 808 that slides between notes, the Trap beat, a dark bell hook",
    bass: "held", bpm: 140, beat: "Trap", sounds: {bass: "808 ROLL", arp: "CRYSTAL ARP"},
    ch: [[45, [57, 60, 64]], [45, [57, 60, 64]], [41, [53, 57, 60]], [43, [55, 59, 62]]],
    bassSteps: [[0, 33, 6, 1], [6, 36, 4], [10, 31, 4, 1], [14, 33, 2],
      [16, 33, 6], [22, 40, 2, 1], [24, 38, 2], [26, 36, 4, 1], [30, 33, 2],
      [32, 29, 6, 1], [38, 33, 4], [42, 36, 4, 1], [46, 29, 2],
      [48, 31, 6], [54, 35, 2, 1], [56, 38, 4], [60, 28, 4, 1]],
    mel: [[0, 76, 3], [3, 74, 1], [4, 72, 4], [10, 69, 2], [12, 72, 4],
      [16, 76, 3], [19, 77, 1], [20, 76, 4], [26, 74, 2], [28, 72, 4],
      [32, 77, 3], [35, 76, 1], [36, 72, 4], [42, 69, 2], [44, 72, 4],
      [48, 74, 3], [51, 72, 1], [52, 71, 4], [58, 67, 2], [60, 71, 4]]},
  "Cosmic": {note: "Am Dm G C: long, soaring notes, gallop bass", bass: "gallop",
    ch: [[45, [57, 60, 64]], [50, [53, 57, 62]], [43, [55, 59, 62]], [48, [55, 60, 64]]],
    mel: [[0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 71, 2], [14, 72, 2],
      [16, 74, 6], [22, 72, 2], [24, 69, 8],
      [32, 71, 4], [36, 74, 4], [40, 79, 6], [46, 77, 2],
      [48, 76, 8], [56, 79, 4], [60, 76, 4]]}
};
let themeName = "Night Drive", CH = THEMES[themeName].ch;
function setTheme(name) { if (THEMES[name]) { themeName = name; CH = THEMES[name].ch; } }
const K = 36, SN = 38, CL = 39, HC = 42, HO = 46, TL = 45, TM = 47, TH = 50;
function bassPattern(style) {           /* 64 steps of 16ths */
  const s = [];
  for (const [r] of CH) for (let i = 0; i < 16; i++) {
    const lo = r - 12, b = i % 4;
    if (style === "gallop") s.push(b === 1 ? null : b === 3 ? lo + 12 : lo);       /* da - da DUM: the Italo gallop */
    else if (style === "electro") s.push([lo, null, null, lo, null, null, lo + 12, lo, lo, null, lo + 7, lo + 12, null, null, lo + 12, null][i]);   /* on the Spacer kick */
    else if (style === "octave") s.push(i % 2 ? lo + 12 : lo);
    else if (style === "eighth") s.push(i % 2 ? null : (i % 4 ? lo + 12 : lo));
    else s.push(i % 2 ? lo + 12 : lo);                                              /* straight octaves */
  }
  return s;
}
function arpPattern(style) {
  const s = [];
  for (const [, c] of CH) {
    if (style === "twinkle") {         /* falling sparkles: from the top of the chord down two octaves, twice a bar */
      const t = [c[2] + 24, c[1] + 24, c[0] + 24, c[2] + 12, c[1] + 12, c[0] + 12, null, null];
      for (let k = 0; k < 16; k++) s.push(t[k % 8]);
    } else {
      const ORD = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1], t = [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24, c[1] + 24];
      for (const o of ORD) s.push(t[o]);
    }
  }
  return s;
}
/* [step, note, length]: the Night Drive hook (THEMES carries each theme's own) */
const MELODY_ND = [
  [0, 76, 3], [3, 76, 2], [6, 74, 1], [7, 72, 2], [9, 69, 3], [12, 72, 2], [14, 74, 2],
  [16, 72, 3], [19, 72, 2], [22, 69, 1], [23, 72, 2], [25, 77, 4], [29, 76, 3],
  [32, 74, 3], [35, 74, 2], [38, 72, 1], [39, 74, 2], [41, 79, 4], [45, 77, 1], [46, 76, 2],
  [48, 76, 6], [54, 74, 2], [56, 71, 2], [58, 76, 6]
];
/* where the claps fall in a bar (16ths); the last bar of each two can differ (a roll into the next phrase) */
const CLAPS = {
  "2 and 4": [[4, 12], [4, 12]],
  "triple 16ths": [[4, 12, 13, 14], [4, 12, 13, 14]],     /* 4 e &: ka-ka-ka on the last beat */
  "triple 8ths": [[4, 10, 12, 14], [4, 10, 12, 14]],      /* 3&, 4, 4&: a lazier clap-clap-clap */
  "roll": [[4, 12], [4, 12, 13, 14, 15]]                  /* a 16th roll into every other bar */
};
let clapStyle = "2 and 4", beatStyle = "Italo";
function setClaps(name) { if (CLAPS[name]) clapStyle = name; }
function setBeat(name) { if (name in BEATS) beatStyle = name; }
/* "Spacer": transcribed from a recreation of Charlie's Spacer Woman (1983) loop, 123.75 BPM, two bars:
 * electro kick on 1, 8, 9, 11; snare + clap on 2 and 4; 16th hats accented on steps 3 and 6;
 * bar 2 ends bap-bap-bap: three 8th-note claps on steps 11, 13 and 15, the hats thinning to 8ths under them */
function acc(a) { a.acc = 1; return a; }
function spacerBar(bar2) {
  const s = [];
  for (let b = 0; b < 16; b++) {
    const n = [];
    if ([0, 7, 8, 10].includes(b)) n.push(K);
    if (b === 4 || b === 12) n.push(SN, CL);
    else if (bar2 && (b === 10 || b === 14)) n.push(CL);
    n.push(HC);                                                   /* hats on every 16th */
    s.push(b === 4 || b === 12 || (bar2 && (b === 10 || b === 14)) ? acc(n) : n);   /* the backbeats, and bar 2's baps */
  }
  return s;
}
/* "1986": from a one-bar loop (125.4 BPM), evened out: kick 1, 7, 9, 11; snare + clap on 2 and 4; a clap a 16th
 * before beats 3, 4 and 1; open hats on the off-beat 8ths, closed hats on the beats */
function bar1986() {
  const P = {1: [K, HC], 3: [HO], 5: [SN, CL, HC], 7: [K, HO], 8: [CL], 9: [K, HC], 11: [K, HO], 12: [CL], 13: [SN, CL, HC], 15: [HO], 16: [CL]};
  const s = [];
  for (let b = 1; b <= 16; b++) { const n = (P[b] || []).slice(); s.push(b === 5 || b === 13 ? acc(n) : n); }
  return s;
}
/* "Trap": half-time (snare + clap on beat 3), kick 1, the & of 2, the & of 3; 8th hats with rolls:
 * roll = [hits, over steps, first velocity, last velocity] (drumfx.c plays the hits between the steps) */
function roll(a, r) { a.roll = r; return a; }
function trapBar() {                    /* steady 8th hats; every roll ends before the next hat */
  const s = [];
  for (let i = 0; i < 16; i++) {
    const n = [];
    if (i === 0 || i === 6 || i === 10) n.push(K);
    if (i === 8) n.push(SN, CL);
    if (i === 14) n.push(HO); else if (i % 2 === 0 || i === 3) n.push(HC);
    let v = n;
    if (i === 3) v = roll(n, [2, 1, 90, 112, HC]);          /* a 32nd double into beat 2 */
    if (i === 5) v = roll([HC], [3, 1, 70, 104, HC]);       /* a 16th triplet */
    if (i === 10) v = roll(n, [2, 1, 96, 112, HC]);         /* 32nds on the & of 3 */
    if (i === 12) v = roll(n, [6, 2, 118, 40, HC]);         /* 32nd triplets fading out over two steps */
    if (i === 15) v = roll([HC, SN], [4, 1, 40, 100, SN]);  /* a snare roll swelling into the bar */
    s.push(i === 8 ? acc(v) : v);
  }
  return s;
}
const BEATS = {Italo: null, Spacer: [spacerBar(0), spacerBar(1)], "1986": [bar1986()], Trap: [trapBar()]};
function drumPattern(style) {          /* kick on every beat, claps (CLAPS), 8th hats, open hat off the beat */
  const s = [];
  if (BEATS[beatStyle]) {               /* a transcribed beat: its bars over and over (the Intro drops its kick) */
    const B = BEATS[beatStyle];
    for (let i = 0; i < 64; i++) {           /* (one bar: a two-bar beat plays its second, the one with the fill) */
      const v = B[LEN === 16 ? B.length - 1 : Math.floor(i / 16) % B.length][i % 16];
      const n = style === "hats" ? v.filter(x => x !== K) : v.slice();
      if (v.acc) n.acc = 1;
      if (v.roll) n.roll = v.roll;
      s.push(n);
    }
    return s;
  }
  for (let i = 0; i < 64; i++) {
    const b = i % 16, n = [];
    if (style !== "hats" && b % 4 === 0) n.push(K);
    const cl = CLAPS[clapStyle][Math.floor(i / 16) % 2];
    if (cl.includes(b)) n.push(CL); if (b === 4 || b === 12) n.push(SN);
    if (b % 4 === 2) n.push(HO); else if (style === "busy" || THEMES[themeName].hats16 || b % 4 === 0) n.push(HC);
    if (style === "fill" && i >= 56) { n.length = 0; if (i % 4 === 0) n.push(K); n.push([TH, TH, TM, TM, TL, TL, TL, TL][i - 56]); }
    s.push(n.slice(0, 4));
  }
  return s;
}
/* sections: which tracks play what (null = silent) */
const SONG = {
  bpm: 124,
  tracks: ["Drums", "Bass", "Arp", "Lead"],
  defaults: ["SID DIGI KIT", "BODY HEAT", "TWINKLE", "CYBER LEAD"],
  duck: [0, 18, 0, 88],         /* DUCK per track: the kick pumps the pad and lead hard, the bass barely, never the arp */
  duckRel: 76,
  duckMode: [1, 1],             /* DUCK ON: 1 = kicks on the beat only; EVERY: 1, 2 or 4 */
  duckComp: [1, 64],            /* DUCK MODE 1 = sidechain compressor keyed by the kick's audio; THRESH 64 = -24 dB */
  chaos: [0, 0],                /* CLAP CHAOS: amount 0-127, style 0 ALL 1 FLAM 2 TRIPLET 3 RATCHET */
  clap: [45, 80, 64, 4],       /* INFINITY CLAP: wet, feed (how long the wash hangs), swell (the reverse in), every Nth clap */                  /* DUCK REL: about 250 ms, the kick's beat at 118 BPM */
  arrange: [0, 1, 2, 3, 4, 2, 3],  /* sections in order, 4 bars each */
  sections: [
    {name: "Intro", drums: "beat", bass: "gallop", arp: null, lead: "strings"},
    {name: "Twinkle", drums: "beat", bass: "gallop", arp: "twinkle", lead: "strings"},
    {name: "Hook", drums: "beat", bass: "gallop", arp: "twinkle", lead: "melody"},
    {name: "Hook fill", drums: "fill", bass: "gallop", arp: "twinkle", lead: "melody"},
    {name: "Breakdown", drums: null, bass: "eighth", arp: "twinkle", lead: "strings"}
  ]
};

const CUR = [];                 /* the sound loaded on each track */
function findSound(name) {
  for (const k in SOUNDS) for (const s of SOUNDS[k]) if (s.name === name) return s;
  return null;
}
function applySound(w, t, s) {
  w.w_load(t, s.eng, s.pre);
  if (s.E) s.E.forEach((v, i) => w.w_tset(t, ID.P_E0 + i, v));
  for (const k of ["ATK", "DEC", "SUS", "REL", "ED_FLT", "ED_PIT", "ED_SHP", "VOICE", "GLIDE", "LRATE", "LWAVE", "LFADE", "LD_PIT", "LD_SHP", "LD_FLT", "LEVEL", "PAN"])
    if (s[k] !== undefined) w.w_tset(t, ID["P_" + k], s[k]);
  if (s.LD_PIT || s.LD_SHP || s.LD_FLT) { w.w_tset(t, ID.P_LSYNC, 0); }
  if (s.eng === DRUM) w.w_tset(t, ID.P_LN2, s.CLAPLVL || 92);   /* the clap lane a few dB down (127 = the kit's own) */
  if (s.KEYTUNE) tuneKick(w, t, s);
  const e = s.ECHO || [0, 1, 64];
  w.w_tset(t, ID.P_FXTYPE, s.ECHO ? ID.FX_MIDIDELAY : 0);
  w.w_tset(t, ID.P_FXMIX, e[0]); w.w_tset(t, ID.P_FXRATE, e[1]); w.w_tset(t, ID.P_FXCHAR, e[2]);
  const sd = s.SEND || [0, 0, 0];
  w.w_tset(t, ID.P_FXSEND, sd[0]); w.w_tset(t, ID.P_FXSEND2, sd[1]); w.w_tset(t, ID.P_FXSEND3, sd[2]);
}
function setupMaster(w) {
  w.w_gset(ID.G_FXMODE, 1);                                   /* SPLIT: one send per slot */
  w.w_gset(ID.G_MFXTYPE, ID.FX_CHORUS); w.w_gset(ID.G_MFXMIX, 127); w.w_gset(ID.G_MFXRATE, 48); w.w_gset(ID.G_MFXCHAR, 70);
  w.w_gset(ID.G_MFX2TYPE, ID.FX_REVERB); w.w_gset(ID.G_MFX2MIX, 127); w.w_gset(ID.G_MFX2RATE, 74); w.w_gset(ID.G_MFX2CHAR, 60);
  w.w_gset(ID.G_MFX3TYPE, ID.FX_ROOM); w.w_gset(ID.G_MFX3MIX, 127); w.w_gset(ID.G_MFX3RATE, 40); w.w_gset(ID.G_MFX3CHAR, 50);
}
/* one track's 64 steps: notes[i] is a note, an array of notes, or null; len[i] ties it over the next steps */
let KEY = 0;                          /* semitones from A minor: the sequenced notes of the melodic tracks move */
/* an 808 kit's kick on the key's root: its body (KEYTUNE, measured: MIDI 31.16 for the 808 at TUNE 64) moved by
 * TUNE (3/16 semitone a step) to the root between B0 and A1 (22..33) */
function tuneKick(w, t, s, extra) {
  const root = (9 + KEY + (extra | 0) + 120) % 12, target = (24 + root > 33 ? 12 + root : 24 + root);
  const base = s.KEYTUNE + ((s.E ? s.E[1] : 64) - 64) * 3 / 16;     /* the kit's own body with its own TUNE */
  const tune = Math.round((s.E ? s.E[1] : 64) + (target - base) * 16 / 3);
  w.w_tset(t, ID.P_E0 + 1, Math.max(0, Math.min(127, tune)));
}
let LEN = 64;                         /* pattern length in steps: 64 (four bars of 4/4) or 16 (one bar) */
function setLen(n) { LEN = n === 16 ? 16 : 64; }
const to64 = a => Array.from({length: 64}, (_, i) => a[i % a.length]);   /* a 1- or 2-bar pattern over 4 bars */
function setKey(k) { KEY = k | 0; }
/* PROGRESSIONS: the melodic lanes walk a chord progression over the 4 bars, one chord a bar (a 5-chord one splits
 * the last bar). Each chord moves the A minor patterns diatonically (steps along A natural minor, so Am's A-C-E
 * becomes F-A-C on VI), the shortest way round; a major V raises G to G# (harmonic minor). Drums never move. */
/* a chord: d scale steps from i, acc the accidentals on the scale degrees it lands on (0 = A .. 6 = G): */
const I_ = {d: 0, rn: "i"}, VI = {d: -2, rn: "VI"}, III = {d: 2, rn: "III"}, VII = {d: -1, rn: "VII"}, iv = {d: 3, rn: "iv"},
  V = {d: -3, acc: {6: 1}, rn: "V"},                      /* E G# B: the harmonic minor's major V */
  bII = {d: 1, acc: {1: -1}, rn: "♭II"},                  /* Bb D F: the Phrygian / Neapolitan */
  bvi = {d: -2, acc: {0: -1}, rn: "♭vi"},                 /* F Ab C: the minor six, the horror-film one */
  viio = {d: -1, acc: {6: 1}, rn: "vii°"},                /* G# B D: diminished, wants to fall onto i */
  ivo = {d: 3, acc: {3: 1, 5: 1}, rn: "♯iv°"},            /* D# F# A: the tritone away */
  IV = {d: 3, acc: {5: 1}, rn: "IV"},                     /* D F# A: the Dorian major four */
  IIIaug = {d: 2, acc: {6: 1}, rn: "III+"};               /* C E G#: the harmonic minor's creeping augmented */
const PROGS = {
  "Off": [I_, I_, I_, I_],
  "i–VI–III–VII": [I_, VI, III, VII],
  "i–VII–VI–V": [I_, VII, VI, V],
  "i–V–VI–III–iv": [I_, V, VI, [III, iv]],
  /* the evil ones */
  "i–♭II (Phrygian)": [I_, bII, I_, bII],
  "i–♭vi–i–♭II": [I_, bvi, I_, bII],
  "i–iv–♭II–V": [I_, iv, bII, V],
  "i–VI–iv–V": [I_, VI, iv, V],
  "i–vii°–♭vi–V": [I_, viio, bvi, V],
  "i–♯iv°–iv–V": [I_, ivo, iv, V],
  "i–III+–VI–V": [I_, IIIaug, VI, V],
  "i–IV–VI–V (Dorian)": [I_, IV, VI, V],
};
const MINOR = [0, 2, 3, 5, 7, 8, 10];        /* A natural minor, semitones above A */
let PROG = PROGS.Off;
function setProg(name) { PROG = PROGS[name] || PROGS.Off; }
function chordAt(i) { const c = PROG[(i >> 4) & 3]; return Array.isArray(c) ? c[(i & 15) < 8 ? 0 : 1] : c; }
function chordMove(n, c) {                   /* a note of the A minor pattern, moved to chord c */
  if (!c || (!c.d && !c.acc)) return n;
  const r = n - 9, oct = Math.floor(r / 12), pc = r - 12 * oct;
  let i = 6; while (MINOR[i] > pc) i--;      /* the scale note at or below (a chromatic note keeps its offset) */
  const j = i + c.d, o2 = oct + Math.floor(j / 7), jj = ((j % 7) + 7) % 7;
  let m = 9 + 12 * o2 + MINOR[jj] + (pc - MINOR[i]);
  if (c.acc && c.acc[jj] && pc === MINOR[i]) m += c.acc[jj];   /* the chord's accidentals */
  return m;
}
const noteAt = (n, i) => chordMove(n, chordAt(i));
function progBars(key) {                     /* per bar: its numeral(s) and chord name(s) in the key */
  return PROG.map(c => { const a = Array.isArray(c) ? c : [c]; return {rn: a.map(x => x.rn).join(" / "), name: a.map(x => chordName(x, key)).join(" / ")}; });
}
/* the pitch classes (0 = A, before KEY) a played note may take at step i: LOCK 1 CHORD (the chord of that step),
 * 2 SCALE (A natural minor, and G# under a major V), 0 OFF: all */
function allowedPcs(i, lock) {
  if (!lock) return null;
  const c = chordAt(i);
  if (lock === 1) return [0, 3, 7].map(x => (((chordMove(57 + x, c) - 9) % 12) + 12) % 12);
  return MINOR.map((x, j) => (x + (c && c.acc && c.acc[j] || 0) + 12) % 12);
}
const chordRoot = i => chordMove(57, chordAt(i)) - 57;   /* semitones the chord's root sits from A */
function progNames(key) { return PROG.map(c => Array.isArray(c) ? c.map(x => chordName(x, key)).join("/") : chordName(c, key)); }
function chordName(c, key) {                 /* "Am", "Bb", "G#dim", "A+" ... in the current key */
  const N = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"], S = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const deg = ((c.d % 7) + 7) % 7, up = c.acc && c.acc[deg] > 0;
  const r = chordMove(57, c), t3 = ((chordMove(60, c) - r) % 12 + 12) % 12, t5 = ((chordMove(64, c) - r) % 12 + 12) % 12;
  return (up ? S : N)[((r + key) % 12 + 12) % 12] + (t3 === 3 ? (t5 === 6 ? "dim" : "m") : t5 === 8 ? "+" : "");
}
let BELLKEYS = 0;                     /* the drum kit's cowbell plays in tune (808 kits; the firmware's BELL KEYS) */
function setBellKeys(on) { BELLKEYS = on ? 1 : 0; }
function bellNote(i) {                /* the BELL row's note at step i: the chord's root in the key, near C5 */
  const root = ((9 + KEY + chordRoot(i)) % 12 + 12) % 12;   /* 0 = C */
  return 96 + (root > 6 ? root - 12 : root);                  /* F#4..F#5 (note 96 = C5) */
}
function writeSteps(w, t, notes, gate) {
  const tr = t ? KEY : 0;               /* (the drums never move: their notes are the kit's drums) */
  w.w_tset(t, ID.P_SLEN, LEN);
  w.w_tset(t, ID.P_SGATE, gate || 64);
  for (let i = 0; i < 64; i++) {
    const v = notes[i];
    if (v === "tie" || v === "tieS") { w.w_step(t, i, 0, 0, ID.ST_TIE, v === "tieS" ? 2 : 0, 0); continue; }   /* tieS: slide into the next */
    const a = v == null ? [] : Array.isArray(v) ? v : [v];
    let p = 0; a.forEach((n, k) => { p |= Math.max(0, Math.min(127, (t ? noteAt(n, i) : BELLKEYS && n === 56 ? bellNote(i) : n) + tr)) << (8 * k); });
    const ac = v && v.acc !== undefined ? v.acc : i % 16 === 0;
    if (t === 0 && w.w_roll) { const r = v && v.roll; w.w_roll(0, i, r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0, r ? r[3] : 0, r && r[4] ? r[4] : 0); }
    w.w_step(t, i, a.length, p >>> 0, a.length ? ID.ST_NOTE : ID.ST_REST, (a.length && ac ? ID.SF_ACCENT : 0) | (v && v.slide ? 2 : 0), a.length ? (ac ? 112 : 96) : 0);
  }
}
function partSteps(kind, part) {
  if (!part) return new Array(64).fill(null);
  if (kind === "drums") return drumPattern(part);
  if (kind === "bass" && part === "gallop" && THEMES[themeName].bassSteps) {   /* a transcribed bassline: held notes */
    const s = new Array(64).fill(null);
    for (const [st, n, len, sl] of THEMES[themeName].bassSteps) {
      s[st] = sl && len === 1 ? Object.assign([n], {slide: 1}) : n;
      for (let i = 1; i < len; i++) s[st + i] = sl && i === len - 1 ? "tieS" : "tie";
    }
    return s;
  }
  if (kind === "bass") return bassPattern(part === "gallop" ? THEMES[themeName].bass : part);
  if (kind === "arp") return arpPattern(part === "twinkle" && THEMES[themeName].arp ? THEMES[themeName].arp : part);
  if (part === "strings") {
    const s = [];
    for (const [, c] of CH) { s.push(c); for (let i = 1; i < 15; i++) s.push("tie"); s.push(null); }
    return s;
  }
  const s = new Array(64).fill(null);
  for (const [st, n, len] of THEMES[themeName].mel) { s[st] = n; for (let i = 1; i < len; i++) s[st + i] = "tie"; }
  return s;
}
function loadSection(w, sec, chosen) {          /* chosen: the sound names per track (the user's picks) */
  const kinds = ["drums", "bass", "arp", "lead"];
  kinds.forEach((kind, t) => {
    const part = sec[kind];
    if (kind === "lead") {
      const want = part === "strings" ? (chosen.pad || "VELVET STRINGS") : chosen.lead;
      if (want !== CUR[t]) { applySound(w, t, findSound(want)); CUR[t] = want; }
    }
    writeSteps(w, t, partSteps(kind, part), kind === "lead" && part === "strings" ? 120 : kind === "bass" ? 70 : 64);
  });
}
function setupSong(w, chosen) {
  w.w_init(); setupMaster(w); w.w_gset(ID.G_BPM, SONG.bpm);
  CUR.length = 0;
  ["drums", "bass", "arp", "lead"].forEach((k, t) => { const n = chosen[k]; applySound(w, t, findSound(n)); CUR[t] = n; });
  SONG.duck.forEach((a, t) => w.w_duck(t, a)); w.w_duckrel(SONG.duckRel); w.w_duckmode(SONG.duckMode[0], SONG.duckMode[1]); w.w_duckcomp(SONG.duckComp[0], SONG.duckComp[1]);
  w.w_clap(SONG.clap[0], SONG.clap[1], SONG.clap[2], SONG.clap[3]); w.w_chaos(SONG.chaos[0], SONG.chaos[1]);
}
/* ---------------------------------------------------------------- LANE PRESETS (one bar, A minor) ---
 * A preset is a sound and a one-bar pattern for one lane. Everything is written over A minor, so any drums, bass,
 * arp and lead go together; KEY moves the melodic lanes. Steps: a note, an array (chord / drums), "tie", or null. */
const A = [57, 60, 64];                     /* the A minor triad around A3 */
/* a 4-bar arp: bars 1 and 3 play a, bar 2 plays c (or a), bar 4 the fill; each [step, note] a short stab */
function arp4(a, fill, c) {
  const s = new Array(64).fill(null), put = (bar, list) => { for (const [st, n] of list) s[bar * 16 + st] = n; };
  put(0, a); put(1, c || a); put(2, a); put(3, fill); return s;
}
const bar = (list, n = 16) => { const s = new Array(n).fill(null); for (const [st, v, len, sl] of list) { s[st] = sl && len === 1 ? Object.assign([v].flat(), {slide: 1}) : v; for (let i = 1; i < (len || 1); i++) s[st + i] = sl && i === len - 1 ? "tieS" : "tie"; } return s; };
function italoBar() {                       /* four on the floor, snare + clap on 2 and 4, 16th hats, open hats off the beat */
  const s = [];
  for (let b = 0; b < 16; b++) { const n = []; if (b % 4 === 0) n.push(K); if (b === 4 || b === 12) n.push(SN, CL); n.push(b % 4 === 2 ? HO : HC); s.push(b % 4 === 0 ? acc(n) : n); }
  return s;
}
function miamiBar() {                       /* Miami bass: the 808's boom on 1, the a of 2 and the & of 3; claps on 2 and 4; 16th hats; a cowbell */
  const s = [];
  for (let b = 0; b < 16; b++) {
    const n = []; if ([0, 7, 10].includes(b)) n.push(K); if (b === 4 || b === 12) n.push(CL, SN);
    if (b === 3 || b === 11) n.push(56); n.push(b === 14 ? HO : HC);
    s.push(b === 4 || b === 12 ? acc(n) : n);
  }
  return s;
}
const LANE = {
  drums: [
    {name: "Italo 4/4", sound: "SID DIGI KIT", steps: () => italoBar()},
    {name: "Spacer", sound: "SID DIGI KIT", steps: () => [...spacerBar(0), ...spacerBar(1)], bpm: 124},
    {name: "1986", sound: "SIMMONS KIT", steps: () => bar1986(), bpm: 125},
    {name: "Miami Boom", sound: "808 BOOM", steps: () => miamiBar(), bpm: 126},
    {name: "Trap", sound: "808 KIT", steps: () => trapBar(), bpm: 140}
  ],
  bass: [
    {name: "Octave drive", sound: "BODY HEAT", steps: () => Array.from({length: 16}, (_, i) => i % 2 ? 45 : 33)},
    {name: "Gallop", sound: "BODY HEAT", steps: () => Array.from({length: 16}, (_, i) => i % 4 === 1 ? null : i % 4 === 3 ? 45 : 33)},
    {name: "Electro", sound: "MONEY BASS", steps: () => [33, null, null, 33, null, null, 45, 33, 33, null, 40, 45, null, null, 45, null]},
    {name: "1986 hold", sound: "1986 BASS", steps: () => bar([[0, 33, 12], [12, 31, 4]])},
    {name: "Miami 808", sound: "808 ROLL", steps: () => bar([[0, 33, 6, 1], [6, 36, 4], [10, 31, 4, 1], [14, 33, 2]])}
  ],
  arp: [   /* stabs: quiet bars that answer at their ends, the fourth bar a fill (A minor; the progression moves them) */
    {name: "Bar-end stabs", sound: "CRYSTAL ARP", steps: () => arp4([[13, 76], [14, 81], [15, 84]], [[10, 76], [11, 81], [12, 84], [13, 88], [14, 84], [15, 93]])},
    {name: "Laser drop", sound: "LASER ARP", steps: () => arp4([[12, 93], [13, 88], [14, 84], [15, 81]], [[8, 93], [9, 88], [10, 84], [11, 81], [12, 76], [13, 72], [14, 69], [15, 57]])},
    {name: "Octave pings", sound: "TWINKLE", steps: () => arp4([[14, 69], [15, 81]], [[6, 69], [7, 81], [10, 69], [11, 81], [14, 69], [15, 93]], [[11, 81], [14, 69], [15, 81]])},
    {name: "Call & answer", sound: "SYNC ARP", steps: () => arp4([[6, 81], [7, 84], [14, 76], [15, 72]], [[6, 81], [7, 84], [12, 88], [13, 84], [14, 81], [15, 76]])},
    {name: "Ratchet riser", sound: "LASER ARP", steps: () => arp4([[15, 81]], [[8, 69], [9, 72], [10, 76], [11, 81], [12, 84], [13, 88], [14, 93], [15, 96]])},
    {name: "Stutter", sound: "CRYSTAL ARP", steps: () => arp4([[12, 81], [13, 81], [15, 81]], [[12, 88], [13, 88], [14, 84], [15, 81]], [[12, 84], [13, 84], [15, 76]])},
    {name: "Off", sound: "TWINKLE", steps: () => new Array(16).fill(null)}
  ],
  lead: [
    {name: "Goth strings", sound: "VELVET STRINGS", gate: 120, steps: () => bar([[0, A, 15]])},
    {name: "Night hook", sound: "CYBER LEAD", steps: () => bar([[0, 76, 3], [3, 76, 2], [6, 74, 1], [7, 72, 2], [9, 69, 3], [12, 72, 2], [14, 74, 2]])},
    {name: "Robot", sound: "XALAN SYNC", steps: () => bar([[0, 76, 1], [2, 76, 1], [4, 74, 1], [5, 76, 2], [8, 69, 2], [11, 72, 1], [12, 72, 2], [14, 76, 2]])},
    {name: "Ghostcar", sound: "GHOSTCAR", steps: () => bar([[0, 69, 2], [2, 67, 2], [4, 65, 2], [6, 64, 2], [8, 69, 2], [10, 64, 2], [12, 65, 2], [14, 74, 1], [15, 71, 1]])},
    {name: "Dark bells", sound: "STOP PULSE", steps: () => bar([[0, 76, 3], [3, 74, 1], [4, 72, 4], [10, 69, 2], [12, 72, 4]])},
    {name: "Brass stabs", sound: "HI-NRG BRASS", steps: () => bar([[2, A, 1], [6, A, 1], [10, A, 1], [14, A, 1]])}
  ]
};
/* scenes: which lanes play */
const SCENES = [
  {name: "Intro", on: [1, 1, 0, 0]}, {name: "Build", on: [1, 1, 1, 0]}, {name: "Full", on: [1, 1, 1, 1]}, {name: "Break", on: [0, 1, 1, 1]}
];
const SCENE_SONG = [0, 1, 2, 2, 3, 2];     /* Song: each scene 4 bars */
const ITALO = {LANE, SCENES, SCENE_SONG, ID, SOUNDS, SONG, CLAPS, BEATS, THEMES, setClaps, setBeat, setTheme, setKey, setLen, to64, PROGS, setProg, setBellKeys, progNames, progBars, allowedPcs, chordRoot, noteAt, tuneKick, findSound, applySound, setupSong, loadSection, writeSteps, partSteps};
if (typeof module !== "undefined") module.exports = ITALO;
