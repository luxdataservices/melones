/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Melones contributors
 * Melones: kick ducking (the "sidechain pump"). A kick (GM 35 / 36) on a DRUM track pulls every part down by its
 * DUCK amount at once, then lets it back over DUCK REL (the TIME scale, as ATK..REL). The drum part itself is
 * never ducked by its own kick unless its amount says so.
 *  - The envelope runs once per block (events_block has already started this block's notes): a kick in the block
 *    ramps it to full across the block (one block, 0.7 ms), then it falls linearly over REL. The gain follows
 *    1 - DUCK x env^2: the steep start and long tail of a compressor's release.
 *  - The gain ramps across each block from its value at the start to its value at the end: no steps.
 *  - ON (Melones): which kicks duck. ALL: every kick. BEATS: only sequenced kicks on a beat (steps 1, 5, 9, 13 of
 *    the 16ths), not the syncopated ones in between, and no live hits. EVERY 1, 2, 4: only every Nth of those,
 *    counted from the start of play (EVERY 4 with BEATS: the first beat of each bar).
 *  - MODE COMP (Melones, the default for a set ON): a sidechain compressor keyed by the kick's own audio. The DRUM
 *    part's signal, low passed twice at ~150 Hz (the kick's thump, not the hats) and lifted 24 dB, only while an accepted kick
 *    (ON, EVERY) is sounding, drives a peak follower (attack ~1 ms, release DUCK REL); above THRESH it computes a
 *    gain reduction at ratio 8:1, and each part takes DUCK / 127 of it, in dB. A harder kick pumps harder. The
 *    reduction a block computes is applied the next block (0.7 ms later): any part order. With no kick audio (the
 *    drums muted: a ghost kick), the trigger envelope stands in.
 *  - KEY GHOST (Melones): a hidden kick keys the duck instead of the drums: four on the floor, on the sequencer's
 *    beats (the first DRUM part's steps 1, 5, 9, 13; EVERY still applies). It is a sine thump (150 Hz diving to
 *    50 Hz, ~250 ms) that only the COMP detector hears, never the mix: the pump goes on with the drums muted, out
 *    of the scene, or playing a broken beat.
 *  - Every amount 0 (the default), or the envelope at rest: the part's samples are left alone, bit for bit. */
#ifndef DUCK_KICK_LO
#define DUCK_KICK_LO 35u
#define DUCK_KICK_HI 36u
#endif
/* fast log2 / exp2 (no libm on the target): ~0.01 accuracy, plenty for a gain computer */
static inline float duck_log2(float x)
{
    union { float f; uint32_t u; } v = {x};
    float e = (float)(int32_t)((v.u >> 23) & 255u) - 127.f;
    v.u = (v.u & 0x7FFFFFu) | 0x3F800000u;               /* mantissa in [1, 2) */
    float m = v.f - 1.f;
    return e + m * (1.3465557f - 0.3465557f * m);
}
static inline float duck_exp2(float x)                   /* x <= 0 */
{
    if (x < -30.f) return 0.f;
    int32_t i = (int32_t)x - (x < (float)(int32_t)x);    /* floor */
    float f = x - (float)i, m = 1.f + f * (0.6565f + 0.3435f * f);
    union { float f; uint32_t u; } v = {m};
    v.u += (uint32_t)i << 23;
    return v.f;
}
static struct {
    uint8_t amt[NPART];         /* DUCK per part, 0..127 */
    uint8_t rel;                /* DUCK REL, 0..127 on the TIME scale */
    uint8_t trig;               /* a kick started in this block */
    uint8_t beats, every;       /* ON: 0 ALL, 1 BEATS; EVERY 1, 2, 4 */
    uint8_t playing;            /* the transport, last block: a start counts the kicks from 0 */
    uint32_t count;             /* ducking kicks since play started */
    uint8_t comp, thresh;       /* MODE: 0 TRIGGER, 1 COMP; THRESH 0..127 = -48..0 dB */
    uint8_t key_seen, key_live; /* drum audio captured this block; last block */
    uint32_t gate;              /* samples an accepted kick keeps the key open */
    float lp1, lp2, fol;        /* the key's low passes; the peak follower */
    float gr[CTL], gr_next[CTL];/* gain reduction (dB) for this block, and the one being measured for the next */
    int32_t env, e0, e1;        /* Q15: now, at the block's start and end */
    uint8_t ghost;              /* KEY: 0 DRUMS, 1 GHOST (a hidden four-on-the-floor kick) */
    uint8_t gidx;               /* GHOST: the step last seen */
    float gph, gfr, gamp;       /* GHOST: the thump's phase (cycles), its frequency drop and its level */
} duck = {.rel = 72, .every = 1, .thresh = 64};   /* THRESH 64: -24 dB */

static inline __attribute__((always_inline)) void duck_note(const track_t *t, uint32_t note)
{
    if (duck.ghost || t->engine != ENGI_DRUM || note < DUCK_KICK_LO || note > DUCK_KICK_HI)
        return;
    if (song.playing && !duck.playing) {       /* play started: count from this kick */
        duck.count = 0;
        duck.playing = 1;
    }
    if (duck.beats && (!song.playing || (t->seq_idx & 3u)))   /* BEATS: a sequenced kick on a beat */
        return;
    if (duck.count++ % (duck.every ? duck.every : 1u))
        return;
    duck.trig = 1;
    duck.gate = FS / 4u;                       /* COMP: this kick's audio keys the compressor for 250 ms */
}
/* COMP: the DRUM part's audio this block -> the gain reduction for the next */
static inline __attribute__((always_inline)) void duck_capture(const track_t *t, const int32_t *b, uint32_t n)
{
    if (!duck.comp || duck.ghost || t->engine != ENGI_DRUM)
        return;
    uint32_t rs = (uint32_t)TIME_MS_X10[duck.rel & 127u] * (FS / 100u) / 100u;
    float rel = 1.f - 1.f / (float)(rs ? rs : 1u), th = -48.f + 48.f * (float)duck.thresh / 127.f;
    for (uint32_t i = 0; i < n && i < CTL; i++) {
        float x = (float)b[i] * (16.f / 524288.f) * (duck.gate ? 1.f : 0.f);   /* +24 dB: kicks peak near -10 dB after the low passes */
        if (duck.gate) duck.gate--;
        duck.lp1 += (x - duck.lp1) * 0.0211f;          /* ~150 Hz, twice: the kick */
        duck.lp2 += (duck.lp1 - duck.lp2) * 0.0211f;
        float a = duck.lp2 < 0.f ? -duck.lp2 : duck.lp2;
        duck.fol = a > duck.fol ? duck.fol + (a - duck.fol) * 0.02f : duck.fol * rel;   /* attack ~1 ms */
        float db = duck.fol > 1e-6f ? 6.0206f * duck_log2(duck.fol) : -120.f;
        duck.gr_next[i] = db > th ? (db - th) * (1.f - 1.f / 8.f) : 0.f;   /* 8:1 above THRESH */
    }
    duck.key_seen = 1;
}
static inline __attribute__((always_inline)) void duck_block(uint32_t n)
{
    int32_t e = duck.env;
    if (!song.playing)
        duck.playing = 0;
    duck.key_live = duck.key_seen;             /* COMP: last block's measurement is this block's reduction */
    duck.key_seen = 0;
    memcpy(duck.gr, duck.gr_next, sizeof duck.gr);
    memset(duck.gr_next, 0, sizeof duck.gr_next);
    if (duck.ghost) {                          /* GHOST: a hidden kick on each beat of the sequencer */
        const track_t *d = &trk[0];
        for (uint32_t k = 0; k < NPART; k++) if (trk[k].engine == ENGI_DRUM) { d = &trk[k]; break; }
        uint32_t idx = d->seq_idx;
        if (song.playing && idx < NSTEP && idx != duck.gidx && !(idx & 3u)) {
            if (!duck.playing) { duck.count = 0; duck.playing = 1; }
            if (!(duck.count++ % (duck.every ? duck.every : 1u))) {
                duck.trig = 1; duck.gate = FS / 4u;
                duck.gph = 0.f; duck.gfr = 100.f; duck.gamp = 0.6f;
            }
        }
        duck.gidx = song.playing ? (uint8_t)idx : 0xFFu;
        if (duck.comp) {                       /* the thump into the detector only (as duck_capture) */
            uint32_t rs = (uint32_t)TIME_MS_X10[duck.rel & 127u] * (FS / 100u) / 100u;
            float rel = 1.f - 1.f / (float)(rs ? rs : 1u), th = -48.f + 48.f * (float)duck.thresh / 127.f;
            for (uint32_t i = 0; i < n && i < CTL; i++) {
                float x = 0.f;
                if (duck.gate) {
                    float p = duck.gph - (float)(int32_t)duck.gph;           /* 0..1 */
                    float q = p < 0.5f ? p * 4.f - 1.f : 3.f - p * 4.f;     /* triangle -> */
                    x = duck.gamp * q * (1.5f - 0.5f * q * q);             /* a near sine */
                    duck.gph += (50.f + duck.gfr) / (float)FS;
                    duck.gfr *= 0.99924f;                                   /* the dive: ~30 ms */
                    duck.gamp *= 0.99991f;                                  /* the body: ~250 ms */
                    duck.gate--;
                }
                duck.lp1 += (x - duck.lp1) * 0.0211f;
                duck.lp2 += (duck.lp1 - duck.lp2) * 0.0211f;
                float a = duck.lp2 < 0.f ? -duck.lp2 : duck.lp2;
                duck.fol = a > duck.fol ? duck.fol + (a - duck.fol) * 0.02f : duck.fol * rel;
                float db = duck.fol > 1e-6f ? 6.0206f * duck_log2(duck.fol) : -120.f;
                duck.gr_next[i] = db > th ? (db - th) * (1.f - 1.f / 8.f) : 0.f;
            }
            duck.key_seen = 1;   /* measured now for the next block (duck_capture ignores the drums) */
        }
    }
    duck.e0 = e;
    if (duck.trig) {
        e = 32767;
        duck.trig = 0;
    } else if (e > 0) {
        uint32_t rs = (uint32_t)TIME_MS_X10[duck.rel & 127u] * (FS / 100u) / 100u;   /* REL in samples */
        int32_t dec = (int32_t)(32767u * n / (rs ? rs : 1u));
        e -= dec ? dec : 1;
        if (e < 0)
            e = 0;
    }
    duck.e1 = duck.env = e;
}
static inline __attribute__((always_inline)) void duck_apply(uint32_t k, int32_t *b, uint32_t n)
{
    int32_t a = k < NPART ? duck.amt[k] : 0, e0 = duck.e0, de = duck.e1 - duck.e0;
    if (!a)
        return;
    if (duck.comp && duck.key_live) {          /* COMP: the kick's own level, in dB, scaled by DUCK */
        float s = (float)a * (-0.16610f / 127.f);    /* dB -> log2 (1 / 6.0206), x DUCK / 127, negative */
        for (uint32_t i = 0; i < n && i < CTL; i++)
            if (duck.gr[i] > 0.f)
                b[i] = (int32_t)((float)b[i] * duck_exp2(duck.gr[i] * s));
        return;
    }
    if (!duck.e0 && !duck.e1)
        return;
    a = a * 258;                                        /* 127 -> 32766 */
    for (uint32_t i = 0; i < n; i++) {
        int32_t e = e0 + de * (int32_t)i / (int32_t)n, c = (e * e) >> 15;
        int32_t g = 32768 - ((a * c) >> 15);
        b[i] = (int32_t)(((int64_t)b[i] * g) >> 15);
    }
}
