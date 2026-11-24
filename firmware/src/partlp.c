/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Melones contributors
 * Melones: a resonant low pass on a part's whole output (after its engine and effects, before the level): the
 * drums through one filter, to tame a kit or close it right down.
 *  - A Chamberlin state-variable filter, 12 dB/octave. LOWPASS 0..127 takes the cutoff from 60 Hz to 15 kHz
 *    (exponential); RESO 0..127 the damping from 2 (none) to 0.12 (singing).
 *  - LOWPASS 127 (the default): the part's samples are left alone, bit for bit. */
static struct {
    uint8_t cut[NPART], res[NPART];
    float lo[NPART][2], bp[NPART][2];         /* the filter state, a pair for the SPREAD side */
} plp = {.cut = {127, 127, 127, 127}};

static inline __attribute__((always_inline)) void partlp_apply(uint32_t k, int32_t *b, uint32_t n, uint32_t side)
{
    if (k >= NPART || plp.cut[k] >= 127u)
        return;
    /* fc = 60 Hz x 2^(cut / 127 x 8), f = 2 sin(pi fc / FS) (a short series: fc stays under FS / 3) */
    float oct = (float)plp.cut[k] * (8.f / 127.f), fc = 60.f;
    while (oct >= 1.f) { fc *= 2.f; oct -= 1.f; }
    fc *= 1.f + oct * (0.6565f + 0.3435f * oct);
    float x = 3.14159265f * fc / (float)FS, f = 2.f * (x - x * x * x * (1.f / 6.f) + x * x * x * x * x * (1.f / 120.f));
    if (f > 1.2f) f = 1.2f;
    float q = 2.f - 1.88f * (float)plp.res[k] * (1.f / 127.f), lo = plp.lo[k][side], bp = plp.bp[k][side];
    for (uint32_t i = 0; i < n; i++) {
        float in = (float)b[i];
        lo += f * bp;
        float hp = in - lo - q * bp;
        bp += f * hp;
        if (bp > 4e6f) bp = 4e6f; else if (bp < -4e6f) bp = -4e6f;   /* (a singing filter never runs away) */
        b[i] = (int32_t)(lo > 884000.f ? 884000.f : lo < -884000.f ? -884000.f : lo);
    }
    plp.lo[k][side] = lo; plp.bp[k][side] = bp;
}
