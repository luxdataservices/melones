/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Melones contributors
 * Melones: a resonant low pass on a part's whole output (after its engine and effects, before the level): the
 * drums through one filter, to tame a kit or close it right down.
 *  - A Chamberlin state-variable filter, 12 dB/octave, run twice a sample (2x oversampled) with its coefficient held
 *    under the stability bound f^2 + 2fq < 4: no runaway at any cutoff or resonance. LOWPASS 0..127 takes the cutoff
 *    from 60 Hz to 15 kHz (exponential; the bound caps it near 11 kHz without resonance); RESO 0..127 the damping
 *    from 2 (none) to 0.12 (singing).
 *  - CUT RND (chaos): each note or hit on the part draws a new cutoff up to CUT RND below LOWPASS (with LOWPASS
 *    open, below fully open): a filter that moves note to note, for every lane, drums too.
 *  - LOWPASS 127 and CUT RND 0 (the defaults): the part's samples are left alone, bit for bit. */
static struct {
    uint8_t cut[NPART], res[NPART];
    uint8_t chaos[NPART], off[NPART];          /* CUT RND, and this note's draw */
    float lo[NPART][2], bp[NPART][2];         /* the filter state, a pair for the SPREAD side */
} plp = {.cut = {127, 127, 127, 127}};

static inline __attribute__((always_inline)) void partlp_apply(uint32_t k, int32_t *b, uint32_t n, uint32_t side)
{
    if (k >= NPART)
        return;
    int32_t cut = (int32_t)plp.cut[k] - (int32_t)plp.off[k];
    if (cut >= 127)
        return;
    if (cut < 0)
        cut = 0;
    /* fc = 60 Hz x 2^(cut / 127 x 8), f = 2 sin(pi fc / FS) (a short series: fc stays under FS / 3) */
    float oct = (float)cut * (8.f / 127.f), fc = 60.f;
    while (oct >= 1.f) { fc *= 2.f; oct -= 1.f; }
    fc *= 1.f + oct * (0.6565f + 0.3435f * oct);
    float x = 3.14159265f * fc / (float)(2u * FS), f = 2.f * (x - x * x * x * (1.f / 6.f) + x * x * x * x * x * (1.f / 120.f));
    float q = 2.f - 1.88f * (float)plp.res[k] * (1.f / 127.f), lo = plp.lo[k][side], bp = plp.bp[k][side];
    /* stable while f < sqrt(q^2 + 4) - q; sqrt by two Newton steps from a close start */
    float r2 = q * q + 4.f, r = 0.5f * (r2 * 0.25f + 2.f); r = 0.5f * (r + r2 / r); r = 0.5f * (r + r2 / r);
    float fmax = 0.95f * (r - q);
    if (f > fmax) f = fmax;
    for (uint32_t i = 0; i < n; i++) {
        float in = (float)b[i];
        for (uint32_t o = 0; o < 2u; o++) {           /* 2x oversampled: the same input twice */
            lo += f * bp;
            float hp = in - lo - q * bp;
            bp += f * hp;
        }
        if (bp > 4e6f) bp = 4e6f; else if (bp < -4e6f) bp = -4e6f;   /* (a singing filter never runs away) */
        b[i] = (int32_t)(lo > 884000.f ? 884000.f : lo < -884000.f ? -884000.f : lo);
    }
    plp.lo[k][side] = lo; plp.bp[k][side] = bp;
}

/* a note or hit on part t: CUT RND draws its cutoff */
static inline __attribute__((always_inline)) void partlp_note(const track_t *t)
{
    uint32_t k = (uint32_t)(t - trk);
    if (k < NPART && plp.chaos[k])
        plp.off[k] = (uint8_t)(rng() % ((uint32_t)plp.chaos[k] + 1u));
}
