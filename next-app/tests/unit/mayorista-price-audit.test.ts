import { describe, it, expect } from 'vitest';
import { auditWholesalePrices, auditMarkValue, parseAuditMark, auditEmailHtml, WS_AUDIT_META, type AuditInput } from '@/lib/mayorista-price-audit';

const p = (over: Partial<AuditInput> & { id: number }): AuditInput => ({
  name: `Producto ${over.id}`, regularPrice: 96000, regulars: [96000], meta: [], wholesale: true, ...over,
});
const mark = (regular: number, at = '2026-09-22') => [{ key: WS_AUDIT_META, value: auditMarkValue(regular, at) }];

describe('auditWholesalePrices', () => {
  it('sin marca previa: toma la foto de hoy y no alerta', () => {
    const r = auditWholesalePrices([p({ id: 2033 })], '2026-09-24');
    expect(r.changes).toEqual([]);
    expect(r.baseline).toEqual([{ id: 2033, name: 'Producto 2033', regular: 96000 }]);
    expect(r.updates).toEqual([{ id: 2033, meta_data: [{ key: WS_AUDIT_META, value: JSON.stringify({ regular: 96000, ws: 48000, at: '2026-09-24' }) }] }]);
  });

  it('caso 23/09: el SALE infló el regular ×1,2 → cambio detectado con el precio mayorista antes/después', () => {
    const r = auditWholesalePrices([p({ id: 2033, regularPrice: 115000, regulars: [115000], meta: mark(96000) })], '2026-09-24');
    expect(r.changes).toEqual([{ id: 2033, name: 'Producto 2033', before: 96000, after: 115000, wsBefore: 48000, wsAfter: 57500, since: '2026-09-22' }]);
    // La marca se actualiza: mañana no vuelve a avisar por el mismo cambio.
    expect(parseAuditMark(r.updates[0].meta_data)).toMatchObject({ regular: 115000, ws: 57500, at: '2026-09-24' });
  });

  it('sin cambios: cuenta y no escribe nada', () => {
    const r = auditWholesalePrices([p({ id: 1, meta: mark(96000) })]);
    expect(r.unchanged).toBe(1);
    expect(r.updates).toEqual([]);
  });

  it('ignora lo que no es del catálogo mayorista (packs, gift card)', () => {
    const r = auditWholesalePrices([p({ id: 415, wholesale: false, regularPrice: 102000, regulars: [102000], meta: mark(71000) })]);
    expect(r.changes).toEqual([]);
    expect(r.updates).toEqual([]);
    expect(r.unchanged).toBe(0);
  });

  it('variaciones con regular distinto se reportan aparte, y se audita el mayor', () => {
    const r = auditWholesalePrices([p({ id: 7, regularPrice: 31000, regulars: [26000, 31000], meta: mark(26000) })]);
    expect(r.divergent).toEqual([{ id: 7, name: 'Producto 7', regulars: [26000, 31000] }]);
    expect(r.changes[0]).toMatchObject({ before: 26000, after: 31000 });
  });

  it('sin regular_price: no se puede vender, se lista y no se marca', () => {
    const r = auditWholesalePrices([p({ id: 9, regularPrice: null, regulars: [] })]);
    expect(r.unpriced).toEqual([{ id: 9, name: 'Producto 9' }]);
    expect(r.updates).toEqual([]);
  });

  it('una marca corrupta se trata como inexistente', () => {
    const r = auditWholesalePrices([p({ id: 3, meta: [{ key: WS_AUDIT_META, value: '{no json' }] })]);
    expect(r.baseline).toHaveLength(1);
    expect(parseAuditMark([{ key: WS_AUDIT_META, value: '{"regular":"abc"}' }])).toBeNull();
    expect(parseAuditMark([{ key: WS_AUDIT_META, value: '' }])).toBeNull();
  });
});

describe('auditEmailHtml', () => {
  it('lista cada cambio con PVP y mayorista antes → después', () => {
    const r = auditWholesalePrices([p({ id: 2107, name: 'LAMB OF GOD PINK TEE', regularPrice: 54000, regulars: [54000], meta: mark(45000) })], '2026-09-24');
    const html = auditEmailHtml(r, '2026-09-24');
    expect(html).toContain('LAMB OF GOD PINK TEE');
    expect(html).toContain('$45.000 → <b>$54.000</b>');
    expect(html).toContain('$22.500 → <b>$27.000</b>');
    expect(html).toContain('20.0%');
  });
});

// 13/10/2026: 77 de 117 productos del catálogo mayorista estaban en oferta
// minorista y nadie lo veía: el riesgo se medía solo contra regular_price.
import { saleMarkupOf, saleMarkupHtml, CRITICAL_MARKUP } from '@/lib/mayorista-price-audit';

describe('saleMarkupOf — recargo real del revendedor con la oferta minorista', () => {
  it('sin oferta (o precio de hoy ≥ lista): null', () => {
    expect(saleMarkupOf({ id: 1, name: 'x', regularPrice: 67000, salePrice: null })).toBeNull();
    expect(saleMarkupOf({ id: 1, name: 'x', regularPrice: 67000, salePrice: 67000 })).toBeNull();
    expect(saleMarkupOf({ id: 1, name: 'x', regularPrice: null, salePrice: 45000 })).toBeNull();
  });
  it('Lettering Black longsleeve: lista 67.000, hoy 45.000, mayorista 33.500 → recargo 34%, crítico', () => {
    const s = saleMarkupOf({ id: 3254, name: 'LETTERING BLACK - LONGSLEEVE', regularPrice: 67000, salePrice: 45000 })!;
    expect(s).toMatchObject({ ws: 33500, level: 'critical' });
    expect(s.markup).toBeCloseTo(0.343, 2);
  });
  it('10% off (la mayoría): recargo 80%, reducido pero no crítico', () => {
    const s = saleMarkupOf({ id: 2, name: 'AERO', regularPrice: 45000, salePrice: 40500 })!;
    expect(s.markup).toBeCloseTo(0.8, 5);
    expect(s.level).toBe('reduced');
  });
  it('el umbral crítico es 50% de recargo', () => {
    // 75.000 / 50.000 − 1 = 50% exacto: no es crítico; por debajo, sí.
    expect(saleMarkupOf({ id: 3, name: 'x', regularPrice: 100000, salePrice: 75000 })!.level).toBe('reduced');
    expect(CRITICAL_MARKUP).toBe(0.5);
    expect(saleMarkupOf({ id: 3, name: 'x', regularPrice: 100000, salePrice: 74999 })!.level).toBe('critical');
  });
});

describe('auditWholesalePrices — ofertas', () => {
  it('lista las ofertas del recargo más bajo al más alto, solo del catálogo mayorista, y no afecta la auditoría de cambios', () => {
    const r = auditWholesalePrices([
      p({ id: 1, regularPrice: 45000, regulars: [45000], salePrice: 40500, meta: mark(45000) }),
      p({ id: 2, regularPrice: 67000, regulars: [67000], salePrice: 45000, meta: mark(67000) }),
      p({ id: 3, regularPrice: 102000, regulars: [102000], salePrice: 59160, wholesale: false }),
      p({ id: 4, regularPrice: 96000, regulars: [96000], salePrice: null, meta: mark(96000) }),
    ], '2026-10-13');
    expect(r.saleMarkup.map(s => s.id)).toEqual([2, 1]);
    expect(r.changes).toEqual([]);
    expect(r.unchanged).toBe(3);
  });
  it('el mail trae la sección con lista, hoy, mayorista y recargo, y marca los críticos', () => {
    const r = auditWholesalePrices([p({ id: 3254, name: 'LETTERING BLACK - LONGSLEEVE', regularPrice: 67000, regulars: [67000], salePrice: 45000, meta: mark(67000) })], '2026-10-13');
    const html = auditEmailHtml(r, '2026-10-13');
    expect(html).toContain('Ofertas minoristas que bajan el recargo del revendedor (1)');
    expect(html).toContain('LETTERING BLACK - LONGSLEEVE');
    expect(html).toContain('$45.000');
    expect(html).toContain('$33.500');
    expect(html).toContain('34%');
    expect(html).toContain('1 con recargo menor al 50%');
    expect(saleMarkupHtml([])).toBe('');
  });
});
