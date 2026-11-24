/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Melones contributors
 * Melones: extra drum hits between the steps, sample accurate (a block, 0.7 ms).
 *  - ROLLS: a DRUM part's step can carry a roll: COUNT hits (the step's own first) spread over SPAN steps, the
 *    velocity going from V0 to V1 (a fade in, a fade out, or flat): trap hat and snare rolls.
 *  - CHAOS: a clap (GM 39) gets, with probability CHAOS / 127, a FLAM (a second hit 1/64 .. 1/16 of a beat later),
 *    a TRIPLET retrigger (two more on the 16th-triplet grid, softer each), a RATCHET (three more 32nds, fading),
 *    or, STYLE ALL, any of them at random.
 *  - The extra hits go in as the step's own do (mute, echo), and never start rolls or chaos of their own.
 *  - Nothing set (no roll, CHAOS 0, the default): nothing is queued; the sequence plays bit for bit. */
static void trk_note_on_raw(track_t *t, uint32_t note, uint32_t vel);
#define FXQ_N 48
static struct {
    struct { uint32_t due; uint8_t tr, note, vel, used; } q[FXQ_N];
    uint32_t clock;                            /* samples since boot (block starts) */
    uint8_t inner;                             /* an extra hit is being played */
    uint8_t chaos, style;                      /* CHAOS 0..127; STYLE 0 ALL, 1 FLAM, 2 TRIPLET, 3 RATCHET, 4 BEATREP */
    struct { uint8_t count, span, v0, v1, only; } roll[NPART][NSTEP];   /* only: the one note that rolls (0: all) */
} dfx;

static void dfx_push(uint32_t tr, uint32_t note, uint32_t vel, uint32_t delay)
{
    for (uint32_t k = 0; k < FXQ_N; k++)
        if (!dfx.q[k].used) {
            dfx.q[k].due = dfx.clock + delay; dfx.q[k].tr = (uint8_t)tr; dfx.q[k].note = (uint8_t)note;
            dfx.q[k].vel = (uint8_t)(vel < 1u ? 1u : vel > 127u ? 127u : vel); dfx.q[k].used = 1;
            return;
        }
}
static inline __attribute__((always_inline)) void drumfx_note(const track_t *t, uint32_t note, uint32_t vel)
{
    uint32_t tr = (uint32_t)(t - trk);
    if (dfx.inner || t->engine != ENGI_DRUM || tr >= NPART)
        return;
    uint32_t bpm = (uint32_t)clamp(song.g[G_BPM], 40, 240), beat = FS * 60u / bpm;
    if (song.playing && t->seq_idx < NSTEP) {                /* the step's roll */
        const uint8_t *r = &dfx.roll[tr][t->seq_idx].count;
        uint32_t n = r[0], span = r[1] ? r[1] : 1u, step = beat / 4u;
        for (uint32_t k = 1; k < n && n <= 16u && (!r[4] || r[4] == note); k++)
            dfx_push(tr, note, (uint32_t)((int32_t)r[2] + ((int32_t)r[3] - (int32_t)r[2]) * (int32_t)k / (int32_t)(n - 1u)),
                     span * step * k / n);
    }
    if (note == 39u && dfx.chaos && dfx.style != 4u && rng() % 127u < dfx.chaos) {    /* clap chaos (BEATREP: beatrep_apply) */
        uint32_t s = dfx.style ? dfx.style : 1u + rng() % 3u;
        if (s == 1u)
            dfx_push(tr, note, vel * 6u / 10u, beat / 64u + rng() % (beat / 16u - beat / 64u));
        else if (s == 2u)
            for (uint32_t k = 1; k <= 2u; k++) dfx_push(tr, note, vel * (10u - 3u * k) / 10u, beat * k / 6u);
        else
            for (uint32_t k = 1; k <= 3u; k++) dfx_push(tr, note, vel * (10u - 2u * k) / 10u, beat * k / 8u);
    }
}
/* at a block's start (after the steps' own notes): the extra hits due in it */
static void drumfx_block(uint32_t n)
{
    for (uint32_t k = 0; k < FXQ_N; k++)
        if (dfx.q[k].used && (int32_t)(dfx.q[k].due - dfx.clock) < (int32_t)n) {
            dfx.q[k].used = 0;
            if (!song.playing) continue;
            dfx.inner = 1;
            trk_note_on_raw(&trk[dfx.q[k].tr], dfx.q[k].note, dfx.q[k].vel);
            dfx.inner = 0;
        }
    dfx.clock += n;
}

/* CHAOS STYLE BEATREP (Melones): a rhythmizer on the DRUM part's audio. On an even step, with CHAOS's chance, the
 * part's output is caught for a slice (a 32nd, a 16th or a 16th triplet) and that slice loops, in place of the
 * drums, for one or two steps; 32 samples of fade at the slice's ends keep it from clicking. Off (another style,
 * CHAOS 0): the part's samples are left alone. The slices are kept in 16 bits (the part's level >> 5). */
#define BR_MAX 11025u                          /* a 16th at 60 BPM */
#define BR_FADE 32u
static struct {
    int16_t buf[2][BR_MAX];
    uint32_t len, rec, pos, left, rec0, pos0, left0;
    uint8_t last, part;
} br = {.last = 0xFFu};
static inline __attribute__((always_inline)) void beatrep_apply(uint32_t k, int32_t *b, uint32_t n, uint32_t side)
{
    if (dfx.style != 4u || !dfx.chaos || k >= NPART || trk[k].engine != ENGI_DRUM)
        return;
    if (!side) {
        uint32_t idx = trk[k].seq_idx;
        if (!song.playing) { br.left = 0; br.last = 0xFFu; return; }
        if (idx < NSTEP && idx != br.last) {
            br.last = (uint8_t)idx;
            if (!br.left && !(idx & 1u) && rng() % 127u < dfx.chaos) {
                uint32_t bpm = (uint32_t)clamp(song.g[G_BPM], 40, 240), beat = FS * 60u / bpm, r = rng() % 3u;
                br.len = r == 0u ? beat / 8u : r == 1u ? beat / 4u : beat / 6u;
                if (br.len > BR_MAX) br.len = BR_MAX;
                br.rec = br.pos = 0;
                br.left = (rng() & 1u) ? beat / 2u : beat / 4u;
                br.part = (uint8_t)k;
            }
        }
        br.rec0 = br.rec; br.pos0 = br.pos; br.left0 = br.left;
    } else {                                   /* the SPREAD side: the same slice, from the same place */
        br.rec = br.rec0; br.pos = br.pos0; br.left = br.left0;
    }
    if (!br.left || br.part != k)
        return;
    int16_t *q = br.buf[side ? 1 : 0];
    for (uint32_t i = 0; i < n && br.left; i++, br.left--) {
        if (br.rec < br.len) {                 /* catching the slice: the drums pass */
            int32_t v = b[i] >> 5;
            q[br.rec++] = (int16_t)(v > 32767 ? 32767 : v < -32768 ? -32768 : v);
            continue;
        }
        uint32_t p = br.pos, g = p < BR_FADE ? p : br.len - p < BR_FADE ? br.len - p : BR_FADE;
        b[i] = ((int32_t)q[p] << 5) * (int32_t)g / (int32_t)BR_FADE;
        br.pos = p + 1u < br.len ? p + 1u : 0u;
    }
}
