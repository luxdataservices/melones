/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Melones contributors
 * Melones: kick ducking (the "sidechain pump"). A kick (GM 35 / 36) on a DRUM track pulls every part down by its
 * DUCK amount at once, then lets it back over DUCK REL (the TIME scale, as ATK..REL). The drum part itself is
 * never ducked by its own kick unless its amount says so.
 *  - The envelope runs once per block (events_block has already started this block's notes): a kick in the block
 *    ramps it to full across the block (one block, 0.7 ms), then it falls linearly over REL. The gain follows
 *    1 - DUCK x env^2: the steep start and long tail of a compressor's release.
 *  - The gain ramps across each block from its value at the start to its value at the end: no steps.
 *  - Every amount 0 (the default), or the envelope at rest: the part's samples are left alone, bit for bit. */
#ifndef DUCK_KICK_LO
#define DUCK_KICK_LO 35u
#define DUCK_KICK_HI 36u
#endif
static struct {
    uint8_t amt[NPART];         /* DUCK per part, 0..127 */
    uint8_t rel;                /* DUCK REL, 0..127 on the TIME scale */
    uint8_t trig;               /* a kick started in this block */
    int32_t env, e0, e1;        /* Q15: now, at the block's start and end */
} duck = {{0}, 72, 0, 0, 0, 0};

static inline __attribute__((always_inline)) void duck_note(const track_t *t, uint32_t note)
{
    if (t->engine == ENGI_DRUM && note >= DUCK_KICK_LO && note <= DUCK_KICK_HI)
        duck.trig = 1;
}
static inline __attribute__((always_inline)) void duck_block(uint32_t n)
{
    int32_t e = duck.env;
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
    if (!a || (!duck.e0 && !duck.e1))
        return;
    a = a * 258;                                        /* 127 -> 32766 */
    for (uint32_t i = 0; i < n; i++) {
        int32_t e = e0 + de * (int32_t)i / (int32_t)n, c = (e * e) >> 15;
        int32_t g = 32768 - ((a * c) >> 15);
        b[i] = (int32_t)(((int64_t)b[i] * g) >> 15);
    }
}
