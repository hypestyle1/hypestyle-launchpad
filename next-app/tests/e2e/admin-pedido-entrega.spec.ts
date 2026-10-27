import { test, expect, type Page } from '@playwright/test';

/**
 * Cómo se ve a dónde va un pedido. Caso que lo motivó: #4054 (23/10/2026). El
 * cliente preguntó si su pedido iba a la sucursal de San Martín 2002; el panel
 * mostraba "arenales 2141, Florida" —su dirección de facturación copiada— y se
 * le contestó mal. La sucursal estaba guardada en WooCommerce desde el checkout:
 * la pantalla no la mostraba.
 *
 * Lo que fijan estos tests:
 *   - un pedido a sucursal se identifica de una, con nombre, dirección y código;
 *   - la dirección del cliente no se presenta como el destino cuando no lo es;
 *   - si falta el dato, dice "falta verificar" en vez de inventar un destino;
 *   - la lista distingue sucursal y sin envío de un pedido a domicilio.
 */

const CLAVE = 'clave-de-prueba';
const json = (data: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(data) });

const SUCURSAL_4054 = {
  tipo: 'sucursal', etiqueta: 'Sucursal Andreani',
  metodo: 'Andreani (sucursal)', tarifa: 'andreani_pyme_sucursal',
  sucursal: {
    nombre: 'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002',
    direccion: 'Gral José de San Martín 2002, Florida',
    codigo: 'HOP8754',
  },
  destino: '', incompleto: false, faltante: '',
};

function detalle(over: Record<string, any> = {}) {
  return {
    id: 4054, number: '4054', date: '2026-10-23T12:21:57', status: 'pending',
    customer: { first_name: 'Santiago', last_name: 'Fortunato', email: 'soysanti@test.com', phone: '+5491138898802' },
    shipping: { address_1: 'arenales 2141', address_2: '', city: 'Florida', state: 'Buenos Aires', postcode: '1602', country: 'AR', first_name: 'Santiago', last_name: 'Fortunato' },
    billing:  { address_1: 'arenales 2141', address_2: '', city: 'Florida', state: 'Buenos Aires', postcode: '1602', country: 'AR' },
    items: [{ id: 1, name: 'CAMO CAP — GREY', quantity: 1, price: 38700, total: 38700, size: '', image: '' }],
    total: 45108, shipping_total: 6408, subtotal: 38700, discount_total: 0,
    payment_method: 'talo', payment_method_title: 'Talo Pay (transferencia)',
    customer_note: '', order_key: 'wc_x', adminNote: '', viaCargoSucursal: '',
    tracking: '', notified: '', andreani: '', pedido_id: '',
    hsDispatchedAt: '', hsDispatchedSource: '', notes: [],
    isGift: false, isMayorista: false, feeLines: [],
    shipping_lines: [{ id: 4302, method_title: 'Andreani (sucursal)', method_id: 'andreani_flexipaas', total: '6408.00' }],
    customerHistory: { orderCount: 0, totalSpent: 0, firstOrderDate: '' },
    entrega: SUCURSAL_4054,
    shippingBranch: 'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002 — Gral José de San Martín 2002, Florida',
    shippingBranchCode: 'HOP8754',
    ...over,
  };
}

async function abrirDetalle(page: Page, data: Record<string, any>) {
  await page.addInitScript((k) => sessionStorage.setItem('hype_admin_key', k), CLAVE);
  await page.route('**/api/admin/reviews/by-order/**', r => r.fulfill(json({ reviews: [] })));
  await page.route('**/api/admin/product-costs', r => r.fulfill(json({ costs: {} })));
  await page.route('**/api/admin/orders/4054', r => r.fulfill(json(data)));
  await page.goto('/admin/pedidos/4054');
}

test.describe('el detalle dice a dónde va el pedido', () => {
  test('a sucursal: nombre, dirección y código, y la dirección del cliente aclarada', async ({ page }) => {
    await abrirDetalle(page, detalle());

    await expect(page.getByText('Sucursal Andreani')).toBeVisible();
    await expect(page.getByText('PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002')).toBeVisible();
    await expect(page.getByText('Gral José de San Martín 2002, Florida')).toBeVisible();
    await expect(page.getByText('HOP8754')).toBeVisible();
    // La dirección del cliente sigue estando, pero rotulada para que nadie la
    // lea como el destino del paquete.
    await expect(page.getByText('Dirección del cliente (no es el destino)')).toBeVisible();
    await expect(page.getByText('arenales 2141')).toBeVisible();
  });

  test('a sucursal sin código: lo declara en vez de mostrar media verdad', async ({ page }) => {
    await abrirDetalle(page, detalle({
      entrega: {
        ...SUCURSAL_4054,
        sucursal: { nombre: 'PUNTO ANDREANI HOP RIVERA 1023', direccion: 'Rivera 1023, Villa Celina', codigo: '' },
        incompleto: true, faltante: 'falta el código de sucursal, que es con el que despacha Andreani',
      },
      shippingBranchCode: '',
    }));

    const aviso = page.getByRole('alert').filter({ hasText: 'Falta verificar' });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('código de sucursal');
  });

  test('a sucursal sin sucursal guardada: no se inventa ningún destino', async ({ page }) => {
    await abrirDetalle(page, detalle({
      entrega: {
        ...SUCURSAL_4054, sucursal: null,
        incompleto: true, faltante: 'el pedido va a sucursal pero no quedó guardada cuál: verificar con el cliente antes de despachar',
      },
      shippingBranch: '', shippingBranchCode: '',
    }));

    await expect(page.getByRole('alert').filter({ hasText: 'Falta verificar' })).toBeVisible();
    await expect(page.getByText('Código Andreani')).toHaveCount(0);
  });

  test('sin método de envío: pide confirmar si es retiro, canje o entrega en mano', async ({ page }) => {
    await abrirDetalle(page, detalle({
      entrega: {
        tipo: 'sin_envio', etiqueta: 'Sin envío', metodo: '', tarifa: '',
        sucursal: null, destino: '', incompleto: true,
        faltante: 'el pedido no tiene método de envío: confirmar si es retiro, canje o entrega en mano',
      },
    }));

    await expect(page.getByText('Sin envío').first()).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'retiro, canje o entrega en mano' })).toBeVisible();
  });

  test('a domicilio: la dirección es el destino y no aparece bloque de sucursal', async ({ page }) => {
    await abrirDetalle(page, detalle({
      entrega: {
        tipo: 'domicilio', etiqueta: 'A domicilio', metodo: 'Andreani (estándar)',
        tarifa: 'andreani_pyme_estándar', sucursal: null, destino: '', incompleto: false, faltante: '',
      },
    }));

    await expect(page.getByText('A domicilio')).toBeVisible();
    await expect(page.getByText('arenales 2141')).toBeVisible();
    await expect(page.getByText('Dirección del cliente (no es el destino)')).toHaveCount(0);
    await expect(page.getByText('Código Andreani')).toHaveCount(0);
  });
});

test.describe('la lista distingue el tipo de entrega', () => {
  const COUNTS = {
    porEmpaquetar: 1, empaquetados: 0, enviadosSinMarcar: 0,
    pendientes: 0, enEspera: 0, fallidos: 0, completados: 0,
    anomalias: [], parcial: false, errores: [], ok: true,
  };

  function fila(over: Record<string, any> = {}) {
    return {
      id: 4054, number: '4054', date: '2026-10-23T12:21:57', status: 'processing',
      customer: { first_name: 'Santiago', last_name: 'Fortunato', email: 'soysanti@test.com', phone: '' },
      items: [{ name: 'CAMO CAP — GREY', quantity: 1, size: '' }],
      total: 45108, shipping_total: 6408, payment_method_title: 'Talo Pay',
      tracking: '', andreani: '', packaged: false, shipped: false, digital: false,
      stage: 'sin_rotulo', shippingMethod: 'Andreani (sucursal)',
      notified: '', order_key: 'wc_x', customer_note: '', isMayorista: false,
      tipoEntrega: 'sucursal', entregaIncompleta: false,
      sucursal: 'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002',
      ...over,
    };
  }

  async function lista(page: Page, orders: any[]) {
    await page.addInitScript((k) => sessionStorage.setItem('hype_admin_key', k), CLAVE);
    await page.route('**/api/admin/pod-pendientes*', r => r.fulfill(json({ revisados: 0, porEmpaquetar: 0, lineas: [], blanks: [], total: 0, sinTalle: 0 })));
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({ orders, total: orders.length, totalPages: 1, page: 1, parcial: false })));
    await page.goto('/admin/pedidos');
  }

  test('un pedido a sucursal lo dice en la fila, con el nombre de la sucursal', async ({ page }) => {
    await lista(page, [fila()]);
    await expect(page.getByText('Sucursal', { exact: true })).toBeVisible();
    await expect(page.getByText('PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002')).toBeVisible();
  });

  test('un pedido sin envío lo dice y pide verificar', async ({ page }) => {
    await lista(page, [fila({ shippingMethod: '', tipoEntrega: 'sin_envio', entregaIncompleta: true, sucursal: '' })]);
    await expect(page.getByText('Sin envío')).toBeVisible();
    await expect(page.getByText('falta verificar')).toBeVisible();
  });

  test('un pedido a domicilio no agrega ruido a la fila', async ({ page }) => {
    await lista(page, [fila({ shippingMethod: 'Andreani (estándar)', tipoEntrega: 'domicilio', sucursal: '' })]);
    await expect(page.getByText('Sucursal', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Sin envío')).toHaveCount(0);
  });
});
