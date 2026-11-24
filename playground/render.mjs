import fs from 'fs'; import {createRequire} from 'module';
const I = createRequire(import.meta.url)('./italo.built.js');
const mod = new WebAssembly.Module(fs.readFileSync('melones.wasm'));
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
const solo = args.solo !== undefined ? +args.solo : -1, noduck = !!args.noduck, noclap = !!args.noclap;
const w = new WebAssembly.Instance(mod, {}).exports;
const chosen = {drums: "SID DIGI KIT", bass: "BODY HEAT", arp: "TWINKLE", lead: "CYBER LEAD", pad: "VELVET STRINGS", ...JSON.parse(args.chosen || "{}")};
I.setupSong(w, chosen); if (noduck) for (let t = 0; t < 4; t++) w.w_duck(t, 0); if (noclap) w.w_clap(0, 0, 0);
const kill = () => { if (args.nochorus) w.w_gset(I.ID.G_MFXTYPE, 0);
  for (let t = 0; t < 4; t++) { if (args.noglide) w.w_tset(t, I.ID.P_GLIDE, 0); if (args.novib) { w.w_tset(t, I.ID.P_LD_PIT, 0); w.w_tset(t, I.ID.P_LD_SHP, 0); } } };
kill();
const arr = args.arrange ? args.arrange.split(',').map(Number) : I.SONG.arrange;
let si = 0; I.loadSection(w, I.SONG.sections[arr[0]], chosen);
if (solo >= 0) for (let t = 0; t < 4; t++) if (t !== solo) w.w_tset(t, I.ID.P_MUTE, 1);
w.w_transport(1);
const FS = 44100, total = Math.round(arr.length * 16 * 60 / I.SONG.bpm * FS) + FS * 2;
const pcm = new Int16Array(total * 2); let last = 0, vmax = 0, peak = 0, clip = 0, ss = 0;
for (let f = 0; f + 128 <= total; f += 128) {
  const idx = w.w_seqidx(0);
  if (idx === 63 && last !== 63) { si++; if (si < arr.length) { I.loadSection(w, I.SONG.sections[arr[si]], chosen); kill(); } else w.w_transport(2);
    if (solo >= 0) for (let t = 0; t < 4; t++) w.w_tset(t, I.ID.P_MUTE, t !== solo ? 1 : 0); }
  last = idx;
  const p = w.w_render(128), a = new Float32Array(w.memory.buffer, p, 256);
  for (let i = 0; i < 256; i++) { const x = a[i]; peak = Math.max(peak, Math.abs(x)); if (Math.abs(x) >= 0.999) clip++; ss += x * x; pcm[2 * f + i] = Math.max(-32768, Math.min(32767, Math.round(x * 32768))); }
  vmax = Math.max(vmax, w.w_voices());
}
const out = args.out || 'song.wav', hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.byteLength, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(FS, 24); hdr.writeUInt32LE(FS * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.byteLength, 40);
fs.writeFileSync(out, Buffer.concat([hdr, Buffer.from(pcm.buffer)]));
console.log(out, 'secs', (total / FS).toFixed(1), 'peak', (20 * Math.log10(peak)).toFixed(1) + 'dB', 'rms', (10 * Math.log10(ss / total / 2)).toFixed(1) + 'dB', 'clipped', clip, 'max voices', vmax, 'steals', w.w_kills());
