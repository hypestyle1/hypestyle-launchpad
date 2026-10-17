/**
 * Smoke de integración de SOLO LECTURA contra la Graph API real.
 *
 * No corre en `npm test` normal ni en CI: se activa con IG_LIVE=1 y el token
 * en el entorno. No escribe en ningún sistema externo; opcionalmente vuelca
 * lo leído como NDJSON local si IG_LIVE_OUT apunta a un archivo.
 *
 *   IG_LIVE=1 INSTAGRAM_ACCESS_TOKEN=... npx vitest run tests/unit/ig-insights.live.test.ts
 */
import { appendFileSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { fetchMediaInsights, fetchMediaPage } from '@/lib/ig-insights/client';
import { mediaToPostInput, toSnapshotInput } from '@/lib/ig-insights/normalize';

const vivo = process.env.IG_LIVE === '1' && Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);

describe.runIf(vivo)('Graph API en vivo (lectura pura)', () => {
  it('trae 5 posts reales con insights y los normaliza', { timeout: 60_000 }, async () => {
    const out = process.env.IG_LIVE_OUT;
    if (out) writeFileSync(out, '');

    const page = await fetchMediaPage({ limit: 5 });
    expect(page.items.length).toBeGreaterThan(0);

    for (const media of page.items) {
      const post = mediaToPostInput(media);
      expect(post, `media ${media.id} debería normalizar`).not.toBeNull();

      // Las stories duran 24 h y los AD no tienen insights orgánicos.
      if (media.media_product_type !== 'FEED' && media.media_product_type !== 'REELS') continue;

      const insights = await fetchMediaInsights(media.id, media.media_product_type);
      const snap = toSnapshotInput(media, insights, new Date());

      // Un post del feed con horas de vida tiene views y reach sí o sí.
      if ((snap.ageHours ?? 0) > 24) {
        expect(snap.metrics.views, `views de ${media.id}`).not.toBeNull();
        expect(snap.metrics.reach, `reach de ${media.id}`).not.toBeNull();
      }

      if (out) appendFileSync(out, JSON.stringify({ post, snap }) + '\n');
      await new Promise((r) => setTimeout(r, 400)); // gentileza con el rate limit
    }
  });
});

describe.runIf(!vivo)('Graph API en vivo', () => {
  it.skip('salteado: exportar IG_LIVE=1 y el token para correrlo', () => {});
});
