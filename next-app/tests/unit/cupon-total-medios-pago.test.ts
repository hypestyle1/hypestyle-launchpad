import { describe, it, expect } from 'vitest';
import { descuentos, subtotal as subtotalDe, lineasFisicas } from '@/lib/precio-servidor';
import { descuentoCupon } from '@/lib/cupon-lineas';

/**
 * HYPE10 + medio de pago: que el total del resumen sea el del pedido.
 *
 * Son dos cuentas distintas que tienen que dar lo mismo:
 *   - Woo: suma de las lineas + envio - fee_lines (promos y 10% de
 *     transferencia, que create-order-gocuotas manda como fee negativa)
 *     - descuento del cupon (lo calcula Woo sobre las lineas elegibles);
 *   - el checkout: la composicion de app/checkout/page.tsx (totalFinal para
 *     tarjeta, transferTotal para transferencia).
 *
 * El orden importa: el 10% de transferencia va sobre el subtotal fisico MENOS
 * el pack, y NO sobre el subtotal ya descontado por el cupon (asi lo arma el
 * server y asi lo cobra Woo). Si alguien invierte ese orden, el pedido sale con
 * otro numero del que el cliente vio y este test se pone rojo.
 */

const EXCL = [436, 425, 2653];
const elegib = (ids: Record<string, number>) =>
  Object.entries(ids).map(([slug, pid]) => ({ id: slug, product_id: pid, eligible: !EXCL.includes(pid) }));

function totalWoo(args: {
  lineas: { id: string; price: number; quantity: number }[];
  metodo: string;
  cupon: number;
  envio: number;
  precioPack?: number | null;
}) {
  const fee = descuentos(args.lineas, {
    metodo: args.metodo,
    internacional: false,
    campeonActivo: false,
    tresPorDosActivo: false,
    precioPackRegular: args.precioPack ?? null,
  }).monto;
  return subtotalDe(args.lineas) + args.envio - fee - args.cupon;
}

describe('HYPE10 con transferencia y con tarjeta', () => {
  const lineas = [
    { id: 'regular-tee-black', price: 28900, quantity: 1 },   // excluido (436)
    { id: 'hoodie-ss27', price: 110000, quantity: 1 },        // elegible
  ];
  const mapa = elegib({ 'regular-tee-black': 436, 'hoodie-ss27': 5000 });
  const cupon = descuentoCupon(lineas, { type: 'percent', amount: 10, items: mapa });
  const envio = 6408;

  it('el cupon descuenta solo el hoodie', () => {
    expect(cupon).toBe(11000);
  });

  it('tarjeta: el total del resumen es el del pedido', () => {
    const S = subtotalDe(lineas);
    // app/checkout/page.tsx: totalFinal = subtotal - descuento + envioCosto
    const totalFinal = S - cupon + envio;
    expect(totalFinal).toBe(totalWoo({ lineas, metodo: 'tarjeta', cupon, envio }));
  });

  it('transferencia: el 10% va sobre el subtotal fisico, no sobre el ya descontado', () => {
    const S = subtotalDe(lineas);
    const G = 0;
    const P = 0;
    // app/checkout/page.tsx: transferTotal
    const transferTotal = Math.round((S - G - P) * 0.90) + G - (cupon - P) + envio;
    expect(transferTotal).toBe(totalWoo({ lineas, metodo: 'transferencia', cupon, envio }));
    // Y el 10% de transferencia NO se calcula sobre el subtotal menos el cupon:
    expect(transferTotal).not.toBe(Math.round((S - cupon) * 0.90) + envio);
  });

  it('pack de 3 Regular (todos excluidos) + transferencia: el cupon no descuenta nada', () => {
    const packLineas = [
      { id: 'regular-tee-black', price: 28900, quantity: 1 },
      { id: 'regular-tee-white', price: 28900, quantity: 1 },
      { id: 'regular-tee-melange', price: 28900, quantity: 1 },
    ];
    const packMapa = elegib({ 'regular-tee-black': 436, 'regular-tee-white': 425, 'regular-tee-melange': 2653 });
    const cuponPack = descuentoCupon(packLineas, { type: 'percent', amount: 10, items: packMapa });
    expect(cuponPack).toBe(0);
    const S = subtotalDe(packLineas);
    const fee = descuentos(packLineas, {
      metodo: 'transferencia', internacional: false, campeonActivo: false,
      tresPorDosActivo: false, precioPackRegular: 69900,
    });
    // 3 individuales a $28.900 = $86.700, pack a $69.900 -> descuento del pack $16.800
    const P = S - 69900;
    const transferTotal = Math.round((S - 0 - P) * 0.90) + 0 - (cuponPack - 0) + envio;
    expect(transferTotal).toBe(totalWoo({ lineas: packLineas, metodo: 'transferencia', cupon: cuponPack, envio, precioPack: 69900 }));
    expect(fee.etiqueta).toContain('Transferencia');
  });

  it('gift card: el cupon la descuenta (Woo tambien) y el 10% de transferencia no', () => {
    const conGift = [
      { id: 'gift-card', price: 50000, quantity: 1 },
      { id: 'hoodie-ss27', price: 110000, quantity: 1 },
    ];
    const mapaGift = elegib({ 'gift-card': 9100, 'hoodie-ss27': 5000 });
    const cuponGift = descuentoCupon(conGift, { type: 'percent', amount: 10, items: mapaGift });
    // 10% sobre las dos lineas: la gift card no esta en excluded_product_ids.
    expect(cuponGift).toBe(16000);
    // El 10% de transferencia, en cambio, solo mira lo fisico.
    const fisico = subtotalDe(lineasFisicas(conGift));
    const fee = descuentos(conGift, {
      metodo: 'transferencia', internacional: false, campeonActivo: false, tresPorDosActivo: false,
    });
    expect(fee.monto).toBe(Math.round(fisico * 0.10));
  });
});
