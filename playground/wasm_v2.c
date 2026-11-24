/* Melones browser playground: the Melodee DSP (engines, voices, FX) compiled to WebAssembly. GPL-3.0-only. */
#include <stdint.h>
#include <stddef.h>
#define __attribute__(x)
#include <string.h>
#include "melodee_tables.h"
#include "../firmware/src/libc.c"
#undef __attribute__
static struct { volatile uint32_t notes, buttons; } fm1_in;
#define MELODEE_RAM_AUDIO 0
#include "../firmware/src/core.h"
#include "../firmware/src/engines.c"
#include "../firmware/src/params.c"
#include "../firmware/src/mod.c"
#include "../firmware/src/voice.c"
#include "../firmware/src/mix.c"
static void fm1_delay_ms(uint32_t ms) { (void)ms; }
#include "../firmware/src/usb.c"
#include "../firmware/src/midi_uart.c"
#include "../firmware/src/song_chain.c"
#include "../firmware/src/seq.c"

/* ------------------------------------------------------------------ browser API (4 parts) --- */
#define EXPORT(n) __attribute__((export_name(n)))
static float outbuf[2 * 4096];

EXPORT("w_init") void w_init(void)
{
    uint32_t i, k;
    dsp_tables_init();
    trk_voices_bind();
    midi_insert_init();
    cz_init();
    pattern_init();
    for (i = 0; i < G_COUNT; i++) song.g[i] = GP[i].def;
    for (k = 0; k < NTRK; k++) {
        for (i = 0; i < P_E0; i++) trk[k].p[i] = TP[i].def;
        for (i = 0; i < NSTEP; i++) trk[k].step[i].time = ST_REST;
    }
    song.master_q12 = 4096;
}
/* track t: engine e, its factory preset pi (as ui.c apply_preset_to: sound, voice mode; not the steps) */
EXPORT("w_load") void w_load(uint32_t t, uint32_t e, uint32_t pi)
{
    track_t *x = &trk[t % NPART];
    const preset_t *p;
    uint32_t i;
    if (e >= NENGINES || !ENGINES[e]->npresets) return;
    pi %= ENGINES[e]->npresets;
    p = eng_preset(ENGINES[e], pi);
    x->eng_req = (uint8_t)e; x->preset = (uint8_t)pi;
    for (i = 0; i < 8u; i++) x->p[P_E0 + i] = p->e[i];
    x->p[P_ATK] = p->env[0]; x->p[P_DEC] = p->env[1]; x->p[P_SUS] = p->env[2]; x->p[P_REL] = p->env[3];
    x->p[P_ED_FLT] = p->fenv;
    x->p[P_VOICE] = p->mono ? V_LEGATO : V_POLY;
    cz_factory_loaded(x);
    fm6_track_loaded(x);
    if (x->engine != x->eng_req) eng_state_clear(t % NPART);
    x->engine = x->eng_req;
}
EXPORT("w_tset") void w_tset(uint32_t t, uint32_t id, int32_t v) { if (t < NPART && id < P_COUNT) trk[t].p[id] = (int16_t)v; }
EXPORT("w_tget") int32_t w_tget(uint32_t t, uint32_t id) { return t < NPART && id < P_COUNT ? trk[t].p[id] : 0; }
EXPORT("w_gset") void w_gset(uint32_t id, int32_t v) { if (id < G_COUNT) song.g[id] = (int16_t)v; }
EXPORT("w_gget") int32_t w_gget(uint32_t id) { return id < G_COUNT ? song.g[id] : 0; }
/* step i of track t: up to 4 notes (packed a | b<<8 | c<<16 | d<<24), n of them, time ST_NOTE/TIE/REST, flags, velocity */
EXPORT("w_step") void w_step(uint32_t t, uint32_t i, uint32_t n, uint32_t notes, uint32_t time, uint32_t flags, uint32_t vel)
{
    step_t *s;
    uint32_t k;
    if (t >= NPART || i >= NSTEP) return;
    s = &trk[t].step[i];
    s->n = (uint8_t)(n > 4 ? 4 : n);
    for (k = 0; k < 4u; k++) s->note[k] = k < s->n ? (uint8_t)(notes >> (8 * k)) : 0;
    s->time = (uint8_t)time; s->flags = (uint8_t)flags; s->vel = (uint8_t)(s->n ? vel : 0);
}
EXPORT("w_transport") void w_transport(uint32_t r) { transport_req = (uint8_t)r; }  /* 1 start, 2 stop, 3 restart */
EXPORT("w_playing") uint32_t w_playing(void) { return song.playing; }
EXPORT("w_seqidx") uint32_t w_seqidx(uint32_t t) { return t < NPART ? trk[t].seq_idx : 0; }
EXPORT("w_sel") void w_sel(uint32_t t) { song.sel = (uint8_t)(t % NPART); }
EXPORT("w_keys") void w_keys(uint32_t mask) { fm1_in.notes = mask; }
EXPORT("w_octave") void w_octave(int32_t o) { song.octave = (int8_t)o; }
EXPORT("w_fs") uint32_t w_fs(void) { return FS; }
EXPORT("w_ctl") uint32_t w_ctl(void) { return CTL; }
EXPORT("w_npresets") uint32_t w_npresets(uint32_t e) { return e < NENGINES ? ENGINES[e]->npresets : 0; }
EXPORT("w_preset_name") const char *w_preset_name(uint32_t e, uint32_t i) { return ENGINES[e]->presets[i].name; }
/* voices sounding now, all parts (the FM-1 renders a shared budget) */
EXPORT("w_voices") uint32_t w_voices(void)
{
    uint32_t t, k, a = 0;
    for (t = 0; t < NPART; t++) for (k = 0; k < NVOICE; k++) a += trk[t].v[k].active != 0;
    return a;
}
EXPORT("w_kills") uint32_t w_kills(void) { return voice_kills; }
EXPORT("w_render") float *w_render(uint32_t n)
{
    int32_t o[2 * CTL];
    uint32_t f, i;
    if (n > 4096) n = 4096;
    for (f = 0; f + CTL <= n; f += CTL) {
        mix_block(o, CTL);
        for (i = 0; i < 2 * CTL; i++) outbuf[2 * f + i] = (float)o[i] * (1.0f / 32768.0f);
    }
    return outbuf;
}
EXPORT("w_duck") void w_duck(uint32_t t, uint32_t amt) { if (t < NPART) duck.amt[t] = (uint8_t)(amt > 127 ? 127 : amt); }
EXPORT("w_duckget") uint32_t w_duckget(uint32_t t) { return t < NPART ? duck.amt[t] : 0; }
EXPORT("w_duckrel") void w_duckrel(uint32_t v) { duck.rel = (uint8_t)(v & 127u); }
EXPORT("w_duckenv") int32_t w_duckenv(void) { return duck.env; }
EXPORT("w_clap") void w_clap(uint32_t wet, uint32_t feed, uint32_t swell, uint32_t every)
{ cfx.wet = (uint8_t)(wet & 127u); cfx.feed = (uint8_t)(feed & 127u); cfx.swell = (uint8_t)(swell & 127u);
  cfx.every = (uint8_t)(every == 2 || every == 4 || every == 8 ? every : 1); }
EXPORT("w_duckmode") void w_duckmode(uint32_t beats, uint32_t every)
{ duck.beats = (uint8_t)(beats ? 1 : 0); duck.every = (uint8_t)(every == 2 || every == 4 ? every : 1); }
EXPORT("w_duckcount") uint32_t w_duckcount(void) { return duck.count; }
EXPORT("w_duckcomp") void w_duckcomp(uint32_t on, uint32_t thresh) { duck.comp = (uint8_t)(on ? 1 : 0); duck.thresh = (uint8_t)(thresh & 127u); }
EXPORT("w_duckfol") float w_duckfol(void) { return duck.fol; }
EXPORT("w_chaos") void w_chaos(uint32_t amt, uint32_t style) { dfx.chaos = (uint8_t)(amt & 127u); dfx.style = (uint8_t)(style & 3u); }
EXPORT("w_roll") void w_roll(uint32_t t, uint32_t i, uint32_t count, uint32_t span, uint32_t v0, uint32_t v1)
{ if (t < NPART && i < NSTEP) { dfx.roll[t][i].count = (uint8_t)count; dfx.roll[t][i].span = (uint8_t)span; dfx.roll[t][i].v0 = (uint8_t)v0; dfx.roll[t][i].v1 = (uint8_t)v1; } }
EXPORT("w_lp") void w_lp(uint32_t t, uint32_t cut, uint32_t res) { if (t < NPART) { plp.cut[t] = (uint8_t)(cut > 127 ? 127 : cut); plp.res[t] = (uint8_t)(res & 127u); } }
