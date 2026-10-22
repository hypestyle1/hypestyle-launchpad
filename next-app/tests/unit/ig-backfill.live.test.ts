/**
 * Backfill DRY contra la Graph API real: pagina hacia atrás de verdad y
 * normaliza, sin escribir en WP ni en Meta. Evidencia del criterio de
 * aceptación del PR-3 (plan doc 06).
 *
 *   IG_LIVE=1 INSTAGRAM_ACCESS_TOKEN=... [IG_LIVE_PAGES=3] [IG_LIVE_OUT=...] \
 *     npx vitest run tests/unit/ig-backfill.live.test.ts
 */
import { appendFileSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { runBackfillPage } from '@/lib/ig-insights/sync';

const vivo = process.env.IG_LIVE === '1' && Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);

describe.runIf(vivo)('backfill dry en vivo (lectura pura)', () => {
  it('pagina N páginas reales con cursor y normaliza todo', { timeout: 300_000 }, async () => {
    const paginas = Math.min(Number(process.env.IG_LIVE_PAGES) || 2, 10);
    const out = process.env.IG_LIVE_OUT;
    if (out) writeFileSync(out, '');

    let after: string | undefined;
    let posts = 0;
    let snapshots = 0;
    const huecos: string[] = [];

    for (let i = 0; i < paginas; i++) {
      const batch = await runBackfillPage({ after, limit: 10 });
      posts += batch.posts.length;
      snapshots += batch.snapshots.length;
      huecos.push(...batch.skipped.map((s) => `${s.id}: ${s.reason}`));
      if (out) {
        for (const p of batch.posts) appendFileSync(out, JSON.stringify({ tipo: 'post', ...p }) + '\n');
        for (const s of batch.snapshots) appendFileSync(out, JSON.stringify({ tipo: 'snap', ...s }) + '\n');
      }
      if (!batch.nextAfter) break;
      after = batch.nextAfter;
    }

    // eslint-disable-next-line no-console
    console.log(`[backfill dry] posts=${posts} snapshots=${snapshots} huecos=${huecos.length}`, huecos);

    expect(posts).toBeGreaterThan(0);
    expect(snapshots).toBeGreaterThan(0);
  });
});

describe.runIf(!vivo)('backfill dry en vivo', () => {
  it.skip('salteado: exportar IG_LIVE=1 y el token para correrlo', () => {});
});
