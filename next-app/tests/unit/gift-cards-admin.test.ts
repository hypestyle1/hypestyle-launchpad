import { describe, it, expect } from 'vitest';
import { armarGiftCards, estadoDe, usoEnPedido, usuariosDe } from '@/lib/gift-cards-admin';

const meta = (obj: Record<string, unknown>) => Object.entries(obj).map(([key, value]) => ({ key, value }));
const AHORA = new Date('2026-09-28T12:00:00');

const cupon = (over: Record<string, unknown> = {}, m: Record<string, unknown> = {}) => ({
  id: 3277, code: 'hype-3h2t-e4hm', date_created: '2026-09-23T21:16:16', date_expires: '2027-09-23T21:16:16',
  description: 'Gift card · pedido #3276 · compradora@mail.com', used_by: [],
  meta_data: meta({ _hs_gift_card: '1', _hs_gift_initial: '50000', _hs_gift_balance: '50000', _hs_gift_order: '3276', _hs_gift_para: '', ...m }),
  ...over,
});
const pedido = (over: Record<string, unknown> = {}, m: Record<string, unknown> = {}) => ({
  id: 3303, number: '3303', status: 'processing', date_created: '2026-09-26T21:31:33',
  billing: { first_name: 'Sol', last_name: 'Hernández', email: 'sol@mail.com' },
  coupon_lines: [{ code: 'hype-3h2t-e4hm', discount: '50000.00', discount_tax: '0' }],
  meta_data: meta({ _hs_gift_code: 'HYPE-3H2T-E4HM', _hs_gift_debit: '50000', _hs_gift_debited: '2026-09-26T21:33:19+00:00', ...m }),
  ...over,
});

describe('estadoDe', () => {
  it('clasifica por saldo y vencimiento', () => {
    expect(estadoDe(50000, 50000, '2027-01-01T00:00:00', AHORA)).toBe('sin_usar');
    expect(estadoDe(221000, 58000, '2027-01-01T00:00:00', AHORA)).toBe('parcial');
    expect(estadoDe(50000, 50000, '2026-01-01T00:00:00', AHORA)).toBe('vencida');
    expect(estadoDe(50000, 50000, '', AHORA)).toBe('sin_usar');
  });
  it('agotada es usada aunque el PHP la haya vencido al agotarla', () => {
    expect(estadoDe(50000, 0, '2026-09-26T21:32:19', AHORA)).toBe('usada');
  });
});

describe('usoEnPedido', () => {
  it('cupón nativo de Woo, sin importar mayúsculas', () => {
    expect(usoEnPedido(pedido(), 'HYPE-3H2T-E4HM')).toMatchObject({ id: 3303, monto: 50000, debitado: true, cliente: 'Sol Hernández' });
  });
  it('pedido sin pagar: usa el código pero todavía no debitó', () => {
    const u = usoEnPedido(pedido({ status: 'pending', meta_data: [] }), 'HYPE-3H2T-E4HM');
    expect(u).toMatchObject({ status: 'pending', debitado: false });
  });
  it('ruta PHP: sin coupon_lines, el uso sale de la meta', () => {
    expect(usoEnPedido(pedido({ coupon_lines: [] }, { _hs_gift_debit: '30000' }), 'HYPE-3H2T-E4HM')).toMatchObject({ monto: 30000, debitado: true });
  });
  it('ignora pedidos cancelados y pedidos con otro cupón', () => {
    expect(usoEnPedido(pedido({ status: 'cancelled' }), 'HYPE-3H2T-E4HM')).toBeNull();
    expect(usoEnPedido(pedido({ coupon_lines: [{ code: 'hype10', discount: '1000' }], meta_data: [] }), 'HYPE-3H2T-E4HM')).toBeNull();
  });
});

describe('armarGiftCards', () => {
  it('tarjeta usada: queda atada al pedido donde se canjeó', () => {
    const c = cupon({ used_by: ['sol@mail.com'], date_expires: '2026-09-26T21:32:19' }, { _hs_gift_balance: '0' });
    const origen = { id: 3276, number: '3276', status: 'processing', billing: { first_name: 'Renata', last_name: 'Bacchi', email: 'compradora@mail.com' } };
    const [row] = armarGiftCards([c], [origen], [pedido(), pedido()], AHORA);
    expect(row).toMatchObject({ code: 'HYPE-3H2T-E4HM', tipo: 'gift_card', estado: 'usada', saldo: 0, vence: '', usoSinIdentificar: 0 });
    expect(row.origen).toMatchObject({ number: '3276', cliente: 'Renata Bacchi' });
    expect(row.usos.map((u) => u.number)).toEqual(['3303']);
  });
  it('sin usar: sin pedidos, con vencimiento', () => {
    const [row] = armarGiftCards([cupon()], [], [], AHORA);
    expect(row).toMatchObject({ estado: 'sin_usar', usos: [], origen: null, vence: '2027-09-23T21:16:16' });
  });
  it('saldo a favor se distingue de la gift card comprada', () => {
    const [row] = armarGiftCards([cupon({ description: 'Saldo a favor · pedido #2650' })], [], [], AHORA);
    expect(row.tipo).toBe('saldo_a_favor');
  });
  it('marca el consumo que no encuentra pedido', () => {
    const [row] = armarGiftCards([cupon({}, { _hs_gift_balance: '20000' })], [], [], AHORA);
    expect(row).toMatchObject({ estado: 'parcial', usoSinIdentificar: 30000 });
  });
  it('deja afuera los cupones comunes', () => {
    expect(armarGiftCards([{ id: 1, code: 'hype10', meta_data: [] }], [], [], AHORA)).toEqual([]);
  });
});

describe('usuariosDe', () => {
  it('junta los mails sin repetir', () => {
    expect(usuariosDe([cupon({ used_by: ['A@mail.com', 'a@mail.com', '12'] }), { id: 1, code: 'x', used_by: ['otro@mail.com'], meta_data: [] }]))
      .toEqual(['a@mail.com', '12']);
  });
});
