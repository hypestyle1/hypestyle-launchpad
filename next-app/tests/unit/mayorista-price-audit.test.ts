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
