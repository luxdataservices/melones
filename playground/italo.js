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
    {name: "SID KIT", note: "Every drum on the chip", eng: DRUM, pre: 2, LEVEL: 112, SEND: [0, 0, 24]},
    {name: "808 KIT", note: "Melodee's 808", eng: DRUM, pre: 0, LEVEL: 104, SEND: [0, 0, 20]}
  ]
};

/* the demo: A minor, i - VI - VII - v (Am F G Em), 118 BPM */
const CH = [[45, [57, 60, 64]], [41, [53, 57, 60]], [43, [55, 59, 62]], [40, [52, 55, 59]]];
const K = 36, SN = 38, CL = 39, HC = 42, HO = 46, TL = 45, TM = 47, TH = 50;
function bassPattern(style) {           /* 64 steps of 16ths */
  const s = [];
  for (const [r] of CH) for (let i = 0; i < 16; i++) {
    const lo = r - 12, b = i % 4;
    if (style === "gallop") s.push(b === 1 ? null : b === 3 ? lo + 12 : lo);       /* da - da DUM: the Italo gallop */
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
/* [step, note, length] */
const MELODY = [
  [0, 76, 3], [3, 76, 2], [6, 74, 1], [7, 72, 2], [9, 69, 3], [12, 72, 2], [14, 74, 2],
  [16, 72, 3], [19, 72, 2], [22, 69, 1], [23, 72, 2], [25, 77, 4], [29, 76, 3],
  [32, 74, 3], [35, 74, 2], [38, 72, 1], [39, 74, 2], [41, 79, 4], [45, 77, 1], [46, 76, 2],
  [48, 76, 6], [54, 74, 2], [56, 71, 2], [58, 76, 6]
];
function drumPattern(style) {          /* kick on every beat, clap + snare on 2 and 4, 16th hats, open hat off the beat */
  const s = [];
  for (let i = 0; i < 64; i++) {
    const b = i % 16, n = [];
    if (style !== "hats" && b % 4 === 0) n.push(K);
    if (b === 4 || b === 12) n.push(CL, SN);
    if (b % 4 === 2) n.push(HO); else if (style === "busy" || b % 4 === 0) n.push(HC);
    if (style === "fill" && i >= 56) { n.length = 0; if (i % 4 === 0) n.push(K); n.push([TH, TH, TM, TM, TL, TL, TL, TL][i - 56]); }
    s.push(n.slice(0, 4));
  }
  return s;
}
/* sections: which tracks play what (null = silent) */
const SONG = {
  bpm: 116,
  tracks: ["Drums", "Bass", "Arp", "Lead"],
  defaults: ["SID DIGI KIT", "BODY HEAT", "TWINKLE", "CYBER LEAD"],
  duck: [0, 52, 30, 38],        /* DUCK per track: the kick pumps bass, arp and lead/pad, gently */
  duckRel: 76,
  clap: [80, 100, 90, 4],       /* INFINITY CLAP: wet, feed (how long the wash hangs), swell (the reverse in), every Nth clap */                  /* DUCK REL: about 250 ms, the kick's beat at 118 BPM */
  arrange: [0, 1, 2, 3, 4, 2, 3],  /* sections in order, 4 bars each */
  sections: [
    {name: "Intro", drums: "hats", bass: "gallop", arp: null, lead: "strings"},
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
function writeSteps(w, t, notes, gate) {
  w.w_tset(t, ID.P_SLEN, 64);
  w.w_tset(t, ID.P_SGATE, gate || 64);
  for (let i = 0; i < 64; i++) {
    const v = notes[i];
    if (v === "tie") { w.w_step(t, i, 0, 0, ID.ST_TIE, 0, 0); continue; }
    const a = v == null ? [] : Array.isArray(v) ? v : [v];
    let p = 0; a.forEach((n, k) => { p |= n << (8 * k); });
    w.w_step(t, i, a.length, p >>> 0, a.length ? ID.ST_NOTE : ID.ST_REST, a.length && i % 16 === 0 ? ID.SF_ACCENT : 0, a.length ? 100 : 0);
  }
}
function partSteps(kind, part) {
  if (!part) return new Array(64).fill(null);
  if (kind === "drums") return drumPattern(part);
  if (kind === "bass") return bassPattern(part);
  if (kind === "arp") return arpPattern(part);
  if (part === "strings") {
    const s = [];
    for (const [, c] of CH) { s.push(c); for (let i = 1; i < 15; i++) s.push("tie"); s.push(null); }
    return s;
  }
  const s = new Array(64).fill(null);
  for (const [st, n, len] of MELODY) { s[st] = n; for (let i = 1; i < len; i++) s[st + i] = "tie"; }
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
  SONG.duck.forEach((a, t) => w.w_duck(t, a)); w.w_duckrel(SONG.duckRel);
  w.w_clap(SONG.clap[0], SONG.clap[1], SONG.clap[2], SONG.clap[3]);
}
const ITALO = {ID, SOUNDS, SONG, findSound, applySound, setupSong, loadSection, writeSteps, partSteps};
if (typeof module !== "undefined") module.exports = ITALO;
