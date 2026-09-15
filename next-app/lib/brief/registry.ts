// El único archivo que se edita al sumar un dominio al brief: se registra el
// provider y sus reglas. Compose, ruta y componente no cambian.

import type { BriefProvider, BriefRule } from './types';
import { processingProvider, pendingProvider } from './providers/ops';
import { salesProvider } from './providers/sales';
import { stockProvider } from './providers/stock';
import { metaAdsetsProvider } from './providers/meta';
import { paidWithoutLabel } from './rules/ops/paid-without-label';
import { pendingHighValue } from './rules/ops/pending-high-value';
import { topProductSizeOut } from './rules/stock/top-product-size-out';
import { adsetBelowBreakeven } from './rules/ads/adset-below-breakeven';

export const PROVIDERS: BriefProvider[] = [
  processingProvider,
  pendingProvider,
  salesProvider,
  stockProvider,
  metaAdsetsProvider,
];

export const RULES: BriefRule[] = [
  paidWithoutLabel,
  pendingHighValue,
  topProductSizeOut,
  adsetBelowBreakeven,
  // finance: se registra acá cuando Finance OS esté validado.
];
