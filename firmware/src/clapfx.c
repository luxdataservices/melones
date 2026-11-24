/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Melones contributors
 * Melones: INFINITY CLAP. A clap (GM 39) on a DRUM track goes into a dense reverb whose tail can hang on forever
 * (FEED), and the start of that wash is played back reversed so it swells into the next clap (SWELL): the Italo
 * "reverse reverb into an endless room" clap.
 *  - Input: the DRUM parts, band passed (~500 Hz .. ~6 kHz: the clap's body, not the kick) and gated open for
 *    120 ms from each clap.
 *  - Reverb: four damped combs into two allpasses (the Schroeder / Freeverb shape), mono in; the right channel's
 *    allpasses are a little longer for width. FEED 0..127 takes the combs' feedback from 0.70 (a short room) to
 *    0.995 (it never really ends).
 *  - Reverse swell: from a clap, the next one is expected one clap interval later (the last interval; claps in a
 *    pattern repeat). The first SWELL of this clap's wash is recorded, then played backwards so that its end, the
 *    wash's onset, lands on the expected clap: a crescendo into the hit. A clap that does not come still had its
 *    swell, as a reverse reverb on tape would.
 *  - EVERY (1, 2, 4, 8): only every Nth clap from the start of play crashes: one swell into it and its wash,
 *    then quiet until the next. A clap within 0.3 beat of the one before is a roll hit: it does not count, and
 *    while the room is heard it goes into the wash too.
 *  - Timing: each crashing clap records the start of its own wash and plays it reversed to end on the next
 *    crashing clap, expected one cycle later (the time between the last two): any pattern, however irregular,
 *    repeats. The first crash after play starts takes the cycle as the time since the start, rounded up to whole
 *    bars. Before any crash, the clap just before the Nth feeds the room unheard and its wash, reversed, swells
 *    into the Nth (expected one clap interval later).
 *  - Wet 0 (the default): nothing runs; the mix is bit for bit as without it. */
static int32_t mix_l[CTL], mix_r[CTL];        /* (mix.c's bus, declared again: it comes later) */
#define CFX_SW 30870                           /* the longest swell: 700 ms */
#define CFX_C0 1116
#define CFX_C1 1188
#define CFX_C2 1277
#define CFX_C3 1356
#define CFX_A0 556
#define CFX_A1 441
#define CFX_W 23                               /* the right channel's allpasses are this much longer */
static struct {
    uint8_t wet, feed, swell, every;           /* WET, FEED, SWELL 0..127; EVERY 1, 2, 4, 8 */
    uint8_t playing;                           /* the transport, last block: a start counts the claps from 0 */
    uint32_t count;                            /* counted claps since play started */
    uint32_t last_hit, last_target, cycle;     /* the last clap (any); the last crash; the time between crashes */
    uint32_t started;                          /* when play started */
    float og, ot;                              /* the room's output gain, and where it is heading */
    uint8_t trig;                              /* a clap started in this block */
    uint32_t now, last, gate;                  /* samples since the start; the last clap's time; the gate's samples left */
    uint32_t rec, rec_len, play_at, play_len, play_pos;  /* swell recording, then its reversed playback */
    float hp, hx, lp, gl;                      /* the input filters, the gate level */
    float cf[4];                               /* the combs' damping states */
    uint32_t ci[4], ai[4];
    int32_t in[CTL];
    float comb0[CFX_C0], comb1[CFX_C1], comb2[CFX_C2], comb3[CFX_C3];
    float apl0[CFX_A0], apl1[CFX_A1], apr0[CFX_A0 + CFX_W], apr1[CFX_A1 + CFX_W];
    int16_t sw[CFX_SW];
} cfx = {.feed = 104, .swell = 90, .every = 1, .og = 1.f, .ot = 1.f};

static inline __attribute__((always_inline)) void clapfx_note(const track_t *t, uint32_t note)
{
    if (cfx.wet && t->engine == ENGI_DRUM && note == 39u)
        cfx.trig = 1;
}
static inline __attribute__((always_inline)) void clapfx_capture(const track_t *t, const int32_t *b, uint32_t n)
{
    if (!cfx.wet || t->engine != ENGI_DRUM)
        return;
    int32_t lvl = LEVEL_Q12[t->p[P_LEVEL] & 127];
    for (uint32_t i = 0; i < n && i < CTL; i++)
        cfx.in[i] += (int32_t)(((int64_t)b[i] * lvl) >> 12);
}
static inline float cfx_comb(float *buf, uint32_t len, uint32_t *i, float *damp, float x, float g)
{
    float y = buf[*i];
    *damp = y + (*damp - y) * 0.28f;           /* the damping low pass in the loop: the tail darkens */
    buf[*i] = x + *damp * g;
    if (++*i >= len) *i = 0;
    return y;
}
static inline float cfx_ap(float *buf, uint32_t len, uint32_t *i, float x)
{
    float b = buf[*i], y = b - x;
    buf[*i] = x + b * 0.5f;
    if (++*i >= len) *i = 0;
    return y;
}
static void clapfx_block(uint32_t n)
{
    if (!cfx.wet) {
        cfx.trig = 0;
        return;
    }
    const float wet = (float)cfx.wet * (1.f / 127.f), g = 0.70f + 0.295f * (float)cfx.feed * (1.f / 127.f);
    if (song.playing && !cfx.playing) {
        cfx.count = 0;
        cfx.last_target = cfx.cycle = 0;
        cfx.started = cfx.now;
    }
    cfx.playing = song.playing;
    if (cfx.trig) {
        uint32_t bpm = (uint32_t)clamp(song.g[G_BPM], 40, 240), beat = FS * 60u / bpm;
        uint32_t sw = (uint32_t)(FS / 20u) + (uint32_t)cfx.swell * (CFX_SW - FS / 20u) / 127u;
        int roll = cfx.last_hit && cfx.now - cfx.last_hit < beat * 3u / 10u;
        cfx.trig = 0;
        cfx.last_hit = cfx.now ? cfx.now : 1u;
        if (roll) {                            /* a roll hit: into the wash while it is heard */
            if (cfx.ot > 0.5f)
                cfx.gate = FS * 12u / 100u;
        } else {
            uint32_t ev = cfx.every ? cfx.every : 1u, ph = cfx.count++ % ev;
            uint32_t target = ph == ev - 1u, pre = ev > 1u && ph + 2u == ev;   /* the Nth clap; the one before it */
            uint32_t period = cfx.now - cfx.last;
            if (!cfx.last || period < FS / 10u || period > 4u * beat)
                period = 2u * beat;            /* no clap before (or a long gap): claps on 2 and 4 */
            cfx.last = cfx.now ? cfx.now : 1u;
            if (target) {
                uint32_t c = cfx.last_target ? cfx.now - cfx.last_target : 0u, bar = 4u * beat;
                if (!c && cfx.playing)         /* the first crash: phrases are whole bars from the start of play */
                    c = (cfx.now - cfx.started + bar - bar / 8u) / bar * bar;
                cfx.cycle = c >= FS / 10u && c <= 32u * beat ? c : (ev == 1u ? period : 0u);
                cfx.last_target = cfx.now ? cfx.now : 1u;
                cfx.gate = FS * 12u / 100u;
                cfx.ot = 1.f;                  /* the crashing clap: the room is heard */
                if (cfx.cycle) {               /* its wash, reversed, swells into the next crash */
                    uint32_t l = sw > cfx.cycle * 3u / 4u ? cfx.cycle * 3u / 4u : sw;
                    cfx.rec = 0; cfx.rec_len = l; cfx.play_len = 0;
                    cfx.play_at = cfx.now + cfx.cycle - l;
                }
            } else if (pre && !cfx.cycle) {    /* no cycle yet: this clap feeds the room unheard for the first swell */
                uint32_t l = sw > period * 3u / 4u ? period * 3u / 4u : sw;
                cfx.gate = FS * 12u / 100u;
                cfx.ot = 0.f;
                cfx.rec = 0; cfx.rec_len = l; cfx.play_len = 0;
                cfx.play_at = cfx.now + period - l;
            }
        }
    }
    for (uint32_t i = 0; i < n && i < CTL; i++, cfx.now++) {
        float x = (float)cfx.in[i] * (1.f / 4096.f);
        cfx.hp = 0.93f * (cfx.hp + x - cfx.hx);               /* ~500 Hz high pass */
        cfx.hx = x;
        cfx.lp += (cfx.hp - cfx.lp) * 0.58f;                  /* ~6 kHz low pass */
        cfx.gl += ((cfx.gate ? 1.f : 0.f) - cfx.gl) * 0.004f;
        if (cfx.gate) cfx.gate--;
        float sw_out = 0.f;
        if (cfx.play_len) {                                   /* the reversed swell, louder as it nears the clap */
            float k = (float)cfx.play_pos / (float)cfx.play_len;
            sw_out = (float)cfx.sw[cfx.play_len - 1u - cfx.play_pos] * (1.f / 1024.f) * k * (0.35f + 0.65f * k);
            if (++cfx.play_pos >= cfx.play_len) cfx.play_len = 0;
        } else if (cfx.rec_len && cfx.rec >= cfx.rec_len && cfx.now == cfx.play_at) {
            cfx.play_len = cfx.rec_len;
            cfx.play_pos = 0;
        }
        float in = cfx.lp * cfx.gl * 0.06f + sw_out * 0.02f;   /* a little swell into the room: it smears */
        float c = cfx_comb(cfx.comb0, CFX_C0, &cfx.ci[0], &cfx.cf[0], in, g) + cfx_comb(cfx.comb1, CFX_C1, &cfx.ci[1], &cfx.cf[1], in, g)
                + cfx_comb(cfx.comb2, CFX_C2, &cfx.ci[2], &cfx.cf[2], in, g) + cfx_comb(cfx.comb3, CFX_C3, &cfx.ci[3], &cfx.cf[3], in, g);
        float l = cfx_ap(cfx.apl1, CFX_A1, &cfx.ai[1], cfx_ap(cfx.apl0, CFX_A0, &cfx.ai[0], c));
        float r = cfx_ap(cfx.apr1, CFX_A1 + CFX_W, &cfx.ai[3], cfx_ap(cfx.apr0, CFX_A0 + CFX_W, &cfx.ai[2], c));
        if (cfx.rec < cfx.rec_len) {                          /* the wash's start, for the next swell */
            float v = (l + r) * 512.f;
            cfx.sw[cfx.rec++] = (int16_t)(v > 32767.f ? 32767.f : v < -32768.f ? -32768.f : v);
        }
        cfx.og += (cfx.ot - cfx.og) * (cfx.ot > cfx.og ? 0.02f : 0.004f);    /* in at once, out over ~6 ms */
        l = l * 14000.f * cfx.og + sw_out * 44000.f;                   /* WET 127: the wash ~7 dB under the clap (as on */
        r = r * 14000.f * cfx.og + sw_out * 44000.f;                   /* the records), the swell rising to just under it */
        mix_l[i] += (int32_t)(l * wet);
        mix_r[i] += (int32_t)(r * wet);
    }
    memset(cfx.in, 0, sizeof cfx.in);
}
