import { describe, it, expect } from 'vitest';
import {
  WC_ORDER_STATUSES, esEstadoWcValido, esEstadoAccionable,
  ESTADOS_ACCIONABLES, ESTADOS_TERMINALES, WC_STATUS_LABELS,
} from '@/lib/wc-order-status';

/**
 * El panel ofrecía 'enviado' como estado durante meses. No existe: ni se puede
 * filtrar ni se puede escribir (verificado 24/10/2026 contra el esquema REST
 * del propio sitio). Cada vez que alguien marcaba un pedido como "Enviado" el
 * PUT devolvía 400, el panel pintaba el cambio igual y el pedido se quedaba en
 * processing — de ahí los 464 "enviado sin marcar". Este test es el candado.
 */
describe('estados de WooCommerce', () => {
  it("'enviado' NO es un estado válido", () => {
    expect(esEstadoWcValido('enviado')).toBe(false);
    expect(WC_ORDER_STATUSES).not.toContain('enviado' as never);
  });

  it('acepta exactamente los 7 estados operativos del sitio', () => {
    expect([...WC_ORDER_STATUSES]).toEqual([
      'pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed',
    ]);
    for (const s of WC_ORDER_STATUSES) expect(esEstadoWcValido(s)).toBe(true);
  });

  it('rechaza basura sin romper', () => {
    for (const x of ['', 'ENVIADO', 'wc-processing', 'despachado', null, undefined, 7, {}]) {
      expect(esEstadoWcValido(x)).toBe(false);
    }
  });

  it('todo estado válido tiene label', () => {
    for (const s of WC_ORDER_STATUSES) expect(WC_STATUS_LABELS[s]).toBeTruthy();
  });
});

describe('accionables vs terminales', () => {
  it('accionable = todavía puede necesitar algo de nuestra parte', () => {
    expect([...ESTADOS_ACCIONABLES]).toEqual(['processing', 'pending', 'on-hold', 'failed']);
    for (const s of ESTADOS_ACCIONABLES) expect(esEstadoAccionable(s)).toBe(true);
  });

  it('los terminales no son accionables (y ahí el corte de fecha es legítimo)', () => {
    for (const s of ESTADOS_TERMINALES) expect(esEstadoAccionable(s)).toBe(false);
  });

  it('ningún estado queda sin clasificar: accionable o terminal, nunca los dos', () => {
    const a = new Set<string>(ESTADOS_ACCIONABLES);
    const t = new Set<string>(ESTADOS_TERMINALES);
    for (const s of WC_ORDER_STATUSES) {
      expect(a.has(s) || t.has(s)).toBe(true);
      expect(a.has(s) && t.has(s)).toBe(false);
    }
  });
});
