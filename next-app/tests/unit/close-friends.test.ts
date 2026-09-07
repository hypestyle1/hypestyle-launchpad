import { describe, it, expect } from 'vitest';
import {
  normalizeHandle, classifyNote, entryFromOrder, mergeEntries, entryKey,
  entriesFromSheetCsv, parseCsv, parseDmy, summarize, type CloseFriendEntry,
} from '@/lib/close-friends/types';
import { syncWindow } from '@/lib/close-friends/sync';

const NOW = '2026-09-07T12:00:00.000Z';

function order(over: Partial<Parameters<typeof entryFromOrder>[0]> & { ig?: unknown } = {}) {
  const { ig, ...rest } = over;
  return {
    id: 3120, number: '3120', status: 'processing', date_created_gmt: '2026-09-06T14:00:00',
    billing: { first_name: 'Paola', last_name: 'Vazquez', email: 'paola@example.com' },
    meta_data: ig === undefined ? [{ key: '_instagram', value: '@05.4gim' }] : [{ key: '_instagram', value: ig }],
    ...rest,
  };
}

describe('normalizeHandle', () => {
  it('saca el @, baja a minúsculas y limpia espacios y puntos finales', () => {
    expect(normalizeHandle('  @Bruno.Peccia.  ')).toBe('bruno.peccia');
    expect(normalizeHandle('@@Foo')).toBe('foo');
    expect(normalizeHandle('')).toBe('');
  });
});

describe('classifyNote', () => {
  it('usuario válido → listo', () => {
    expect(classifyNote('@santinobaigorria_')).toEqual({ handle: 'santinobaigorria_', status: 'listo' });
  });
  it('mail → revisar (no se descarta)', () => {
    expect(classifyNote('fulano@gmail.com')?.status).toBe('revisar');
    expect(classifyNote('@aramis.99@')?.status).toBe('revisar');
  });
  it('mensaje de varias palabras → revisar', () => {
    expect(classifyNote('mi ig es @fulano gracias')?.status).toBe('revisar');
    expect(classifyNote('no m acuerdo si estoy, @22__milton')?.status).toBe('revisar');
  });
  it('vacío → null', () => {
    expect(classifyNote('')).toBeNull();
    expect(classifyNote('   ')).toBeNull();
    expect(classifyNote('@')).toBeNull();
  });
  it('caracteres raros (acentos) → revisar', () => {
    expect(classifyNote('inés')?.status).toBe('revisar');
  });
});

describe('entryFromOrder', () => {
  it('arma la entrada desde un pedido pagado con _instagram', () => {
    const e = entryFromOrder(order(), { now: NOW });
    expect(e).toMatchObject({
      handle: '05.4gim', name: 'Paola Vazquez', email: 'paola@example.com',
      orderNumber: '3120', date: '2026-09-06', source: 'woo', status: 'listo', added: false, note: '@05.4gim', createdAt: NOW,
    });
  });
  it('ignora pedidos sin pago cuando onlyPaid (default)', () => {
    expect(entryFromOrder(order({ status: 'pending' }))).toBeNull();
    expect(entryFromOrder(order({ status: 'failed' }))).toBeNull();
    expect(entryFromOrder(order({ status: 'pending' }), { onlyPaid: false })).not.toBeNull();
  });
  it('acepta completed y enviado', () => {
    expect(entryFromOrder(order({ status: 'completed' }))).not.toBeNull();
    expect(entryFromOrder(order({ status: 'enviado' }))).not.toBeNull();
  });
  it('sin _instagram → null', () => {
    expect(entryFromOrder(order({ meta_data: [] }))).toBeNull();
    expect(entryFromOrder(order({ ig: '' }))).toBeNull();
  });
  it('excluye las pruebas internas', () => {
    expect(entryFromOrder(order({ billing: { first_name: 'Valen', last_name: 'P', email: 'HypestyleARG@gmail.com' } }))).toBeNull();
    expect(entryFromOrder(order({ billing: { first_name: 'x', last_name: 'y', email: 'valentinpozzi03@gmail.com' } }))).toBeNull();
    expect(entryFromOrder(order({ billing: { first_name: 'Manu', last_name: 'Hypestyle', email: 'otro@x.com' } }))).toBeNull();
  });
  it('mail en el campo → entrada en revisar con la nota original', () => {
    const e = entryFromOrder(order({ ig: 'aramis.99@gmail.com' }));
    expect(e?.status).toBe('revisar');
    expect(e?.note).toBe('aramis.99@gmail.com');
  });
  it('colapsa espacios dobles en el nombre', () => {
    const e = entryFromOrder(order({ billing: { first_name: 'Juan Cruz ', last_name: ' Sandoval', email: 'j@x.com' } }));
    expect(e?.name).toBe('Juan Cruz Sandoval');
  });
});

describe('entryKey + mergeEntries', () => {
  const base = (over: Partial<CloseFriendEntry>): CloseFriendEntry => ({
    handle: 'a', name: '', email: '', orderNumber: '1', date: '2026-01-01', source: 'woo', status: 'listo',
    added: false, addedAt: null, note: '', createdAt: NOW, ...over,
  });
  it('los listos se deduplican por usuario, los revisar por pedido', () => {
    expect(entryKey(base({ handle: 'a' }))).toBe('a');
    expect(entryKey(base({ handle: 'hola que tal', status: 'revisar', orderNumber: '9' }))).toBe('revisar:woo:9');
  });
  it('suma los nuevos y conserva el tilde de los que ya estaban', () => {
    const existing = [base({ handle: 'a', added: true, addedAt: '2026-05-01T00:00:00Z' })];
    const incoming = [base({ handle: 'a', added: false, orderNumber: '99' }), base({ handle: 'b' })];
    const r = mergeEntries(existing, incoming);
    expect(r.added).toBe(1);
    expect(r.entries.find((e) => e.handle === 'a')).toMatchObject({ added: true, orderNumber: '1' });
    expect(r.entries.map((e) => e.handle).sort()).toEqual(['a', 'b']);
  });
  it('un import tildado sube added, nunca lo baja', () => {
    const existing = [base({ handle: 'a', added: false }), base({ handle: 'b', added: true })];
    const r = mergeEntries(existing, [base({ handle: 'a', added: true }), base({ handle: 'b', added: false })]);
    expect(r.updated).toBe(1);
    expect(r.entries.every((e) => e.added)).toBe(true);
  });
});

describe('CSV del sheet maestro', () => {
  const csv = [
    'Agregado a CF,Usuario IG,Estado,Fuente,Orden,Fecha,Nombre,Email,Nota original',
    'TRUE,_.ezzequiel_,Listo,Tienda Nube,4750,5/4/2026,Ezequiel Aponte,echu0806@gmail.com,_.ezzequiel_',
    'FALSE,bastianarana_,Listo,Woo,1621,1/6/2026,Bastian Gael Arana,bastiangaelarana@gmail.com,bastianarana_',
    'TRUE,22__milton,Listo,Tienda Nube,4761,7/4/2026,Milton Agostinelli,miltonjoa@outlook.com,"no m acuerdo si estoy, @22__milton"',
    'FALSE,danngoodridge,Listo,Woo,1622,1/6/2026,Dan Goodridge,dan@gmail.com,"@danngoodridge\nes un regalo para mi hermano @willem_gdr"',
  ].join('\r\n');

  it('parseCsv respeta comillas, comas y saltos adentro de comillas', () => {
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(5);
    expect(rows[3][8]).toBe('no m acuerdo si estoy, @22__milton');
    expect(rows[4][8]).toContain('\n');
  });
  it('parseDmy', () => {
    expect(parseDmy('5/4/2026')).toBe('2026-04-05');
    expect(parseDmy('18/4/26')).toBe('2026-04-18');
    expect(parseDmy('2026-06-01')).toBe('2026-06-01');
    expect(parseDmy('')).toBe('');
  });
  it('entriesFromSheetCsv mapea columnas, fuente y tilde', () => {
    const es = entriesFromSheetCsv(csv, NOW);
    expect(es).toHaveLength(4);
    expect(es[0]).toMatchObject({ handle: '_.ezzequiel_', added: true, addedAt: NOW, source: 'tiendanube', orderNumber: '4750', date: '2026-04-05', name: 'Ezequiel Aponte', status: 'listo' });
    expect(es[1]).toMatchObject({ handle: 'bastianarana_', added: false, addedAt: null, source: 'woo', date: '2026-06-01' });
    expect(es[2].note).toBe('no m acuerdo si estoy, @22__milton');
  });
  it('sin columna Usuario IG → vacío', () => {
    expect(entriesFromSheetCsv('a,b\n1,2')).toEqual([]);
  });
});

describe('summarize', () => {
  it('cuenta pendientes/agregados/revisar y saca los descartados del total', () => {
    const mk = (over: Partial<CloseFriendEntry>): CloseFriendEntry => ({ handle: 'x', name: '', email: '', orderNumber: '', date: '', source: 'woo', status: 'listo', added: false, addedAt: null, note: '', createdAt: NOW, ...over });
    const s = summarize([
      mk({ handle: 'a', added: true }), mk({ handle: 'b' }), mk({ handle: 'c', status: 'revisar' }), mk({ handle: 'd', status: 'descartado' }),
    ]);
    expect(s).toEqual({ pendientes: 1, agregados: 1, revisar: 1, total: 3, pct: 33 });
  });
});

describe('syncWindow', () => {
  it('sin sync previo mira 120 días', () => {
    const w = syncWindow(null, new Date(NOW));
    expect(w.after).toBe('2026-05-10T12:00:00.000Z');
  });
  it('con sync previo arranca 7 días antes para atrapar pagos tardíos', () => {
    const w = syncWindow('2026-09-01T00:00:00.000Z', new Date(NOW));
    expect(w.after).toBe('2026-08-25T00:00:00.000Z');
  });
});
