/* render a song from lane presets: node renderPresets.mjs drums=3 bass=4 arp=1 lead=0 bpm=126 key=0 out=x.wav */
import fs from 'fs'; import {createRequire} from 'module';
const I = createRequire(import.meta.url)('./italo.built.js'); const ID = I.ID;
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
const K = ["drums", "bass", "arp", "lead"], pr = K.map((k, t) => I.LANE[k][+(args[k] || 0)]);
const w = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync('melones.wasm')), {}).exports;
I.setLen(16); if (args.key) I.setKey(+args.key);
I.setupSong(w, {drums: pr[0].sound, bass: pr[1].sound, arp: pr[2].sound, lead: pr[3].sound});
w.w_gset(ID.G_BPM, +(args.bpm || pr[0].bpm || 124));
const plan = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2];           /* Intro 4, Build 4, Full 8 bars */
const scene = s => pr.forEach((p, t) => I.writeSteps(w, t, I.SCENES[s].on[t] ? p.steps() : new Array(16).fill(null), p.gate || (t === 1 ? 70 : 64)));
scene(plan[0]); w.w_transport(1);
const FS = 44100, bars = plan.length, total = Math.round(bars * 4 * 60 / +(args.bpm || pr[0].bpm || 124) * FS) + FS * 2;
const pcm = new Int16Array(total * 2); let bar = 0, last = 0, vmax = 0;
for (let f = 0; f + 128 <= total; f += 128) {
  const idx = w.w_seqidx(0); if (idx === 15 && last !== 15) { bar++; if (bar < bars) { if (plan[bar] !== plan[bar - 1]) scene(plan[bar]); } else w.w_transport(2); } last = idx;
  const a = new Float32Array(w.memory.buffer, w.w_render(128), 256);
  for (let i = 0; i < 256; i++) pcm[2 * f + i] = Math.max(-32768, Math.min(32767, Math.round(a[i] * 32768)));
  vmax = Math.max(vmax, w.w_voices());
}
const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.byteLength, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(FS, 24); h.writeUInt32LE(FS * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.byteLength, 40);
fs.writeFileSync(args.out || 'presets.wav', Buffer.concat([h, Buffer.from(pcm.buffer)]));
let pk = 0; for (const v of pcm) pk = Math.max(pk, Math.abs(v)); console.log('peak', (20 * Math.log10(pk / 32768)).toFixed(1), 'dB, max voices', vmax, 'steals', w.w_kills(), '|', pr.map(p => p.name).join(' + '));
