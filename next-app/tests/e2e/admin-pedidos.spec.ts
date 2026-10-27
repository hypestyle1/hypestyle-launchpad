import { test, expect, type Page } from '@playwright/test';

/**
 * /admin/pedidos: lo que el panel tiene que mostrar cuando los datos NO están
 * bien. Son los candados del plan de pruebas de la auditoría del 22/10:
 *
 *   - WC devuelve 502 → banner de error, nunca "No hay pedidos".
 *   - lista recortada → banner de lista incompleta.
 *   - contador que no se pudo consultar → "—", no cero.
 *   - escritura de estado rechazada → la fila vuelve atrás y se avisa.
 *   - badge del tab === filas visibles.
 *
 * Las respuestas de /api/admin/* van mockeadas: lo que se prueba es el panel,
 * no la salud de WordPress.
 */

const CLAVE = 'clave-de-prueba';

const COUNTS_OK = {
  porEmpaquetar: 2, empaquetados: 1, enviadosSinMarcar: 3,
  pendientes: 5, enEspera: 0, fallidos: 7, completados: 40,
  anomalias: [], parcial: false, errores: [], ok: true,
};

function order(over: Record<string, any> = {}) {
  return {
    id: 4044, number: '4044', date: '2026-10-22T14:08:00', status: 'processing',
    customer: { first_name: 'Camila', last_name: 'Torres', email: 'camila@test.com', phone: '' },
    items: [{ name: 'Regular Tee', quantity: 1, size: 'M' }],
    total: 112757, shipping_total: 0, payment_method_title: 'MercadoPago',
    tracking: '', andreani: '', packaged: false, shipped: false, digital: false,
    stage: 'sin_rotulo', shippingMethod: 'Andreani (estándar)',
    notified: '', order_key: 'wc_x', customer_note: '', isMayorista: false,
    ...over,
  };
}

/** Entra al panel con la clave ya puesta en sessionStorage (sin pantalla de login). */
async function entrar(page: Page) {
  await page.addInitScript((k) => sessionStorage.setItem('hype_admin_key', k), CLAVE);
  await page.route('**/api/admin/pod-pendientes*', r => r.fulfill(json({ revisados: 0, porEmpaquetar: 0, lineas: [], blanks: [], total: 0, sinTalle: 0 })));
  await page.goto('/admin/pedidos');
}

const json = (data: unknown, status = 200) => ({
  status, contentType: 'application/json', body: JSON.stringify(data),
});

/**
 * Los avisos del panel. Next siempre deja un `role="alert"` propio
 * (`__next-route-announcer__`), así que se filtra por el texto de los nuestros.
 */
const AVISOS = /No se pudieron cargar|Lista incompleta|B\u00fasqueda recortada|Contadores no confiables|No se pudo cambiar|no pudimos confirmar|Sin confirmar|No se pudo cancelar/;
const avisos = (page: Page) => page.getByRole('alert').filter({ hasText: AVISOS });

test.describe('confiabilidad de la lista', () => {
  test('un 502 de WooCommerce se ve como error, nunca como "No hay pedidos"', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({ error: 'WC 502' }, 502)));
    await entrar(page);

    await expect(page.getByRole('alert').filter({ hasText: 'No se pudieron cargar los pedidos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(page.getByText('No hay pedidos', { exact: true })).toHaveCount(0);
  });

  test('"Reintentar" vuelve a pedir y, si anda, muestra la lista', async ({ page }) => {
    let falla = true;
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => falla
      ? r.fulfill(json({ error: 'WC 502' }, 502))
      : r.fulfill(json({ orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false })));
    await entrar(page);

    await expect(page.getByRole('alert').filter({ hasText: 'No se pudieron cargar' })).toBeVisible();
    falla = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('link', { name: '#4044' }).first()).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudieron cargar' })).toHaveCount(0);
  });

  test('bandeja vacía de verdad sí dice "No hay pedidos"', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json({ ...COUNTS_OK, porEmpaquetar: 0 })));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({ orders: [], total: 0, totalPages: 1, page: 1, parcial: false })));
    await entrar(page);

    await expect(page.getByText('No hay pedidos', { exact: true })).toBeVisible();
    await expect(avisos(page)).toHaveCount(0);
  });

  test('una lista incompleta lo dice', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({
      orders: [order()], total: 5000, totalPages: 1, page: 1, parcial: true,
    })));
    await entrar(page);

    await expect(page.getByRole('alert').filter({ hasText: 'Lista incompleta' })).toBeVisible();
    await expect(page.getByRole('link', { name: '#4044' }).first()).toBeVisible();
  });
});

test.describe('contadores', () => {
  test('un contador que no se pudo consultar muestra "—", no cero', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json({
      ...COUNTS_OK, porEmpaquetar: null, pendientes: null,
      errores: ['processing: WC 502 al leer pedidos processing'], ok: false,
    })));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({ orders: [], total: 0, totalPages: 1, page: 1, parcial: false })));
    await entrar(page);

    await expect(page.getByRole('alert').filter({ hasText: 'Contadores no confiables' })).toBeVisible();
    // La tarjeta de KPI, no el tab homónimo de la toolbar.
    const card = page.getByRole('button', { name: '— Por empaquetar' });
    await expect(card).toContainText('—');
    await expect(card).not.toContainText('0');
  });

  test('on-hold y failed tienen su propia tarjeta', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({ orders: [], total: 0, totalPages: 1, page: 1, parcial: false })));
    await entrar(page);

    await expect(page.getByRole('button', { name: /En espera/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Falló el pago/ })).toContainText('7');
  });

  test('el badge del tab coincide con las filas visibles', async ({ page }) => {
    const procesando = [
      order({ id: 1, number: '1' }),
      order({ id: 2, number: '2' }),
      order({ id: 3, number: '3', packaged: true, stage: 'con_rotulo' }),
      order({ id: 4, number: '4', packaged: true, shipped: true, stage: 'con_guia' }),
    ];
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json({
      ...COUNTS_OK, porEmpaquetar: 2, empaquetados: 1, enviadosSinMarcar: 1,
    })));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({
      orders: procesando, total: procesando.length, totalPages: 1, page: 1, parcial: false,
    })));
    await entrar(page);

    for (const [tab, esperado] of [['Por empaquetar', 2], ['Empaquetado', 1], ['Enviado s/ marcar', 1]] as const) {
      await page.getByRole('button', { name: new RegExp(tab) }).first().click();
      await expect(page.locator('a[href^="/admin/pedidos/"]').filter({ hasText: /^#\d+$/ })).toHaveCount(esperado);
    }
  });
});

test.describe('escrituras de estado', () => {
  test('si WooCommerce rechaza el cambio, la fila vuelve atrás y se avisa', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({
      orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false,
    })));
    await page.route('**/api/admin/set-status', r => r.fulfill(json({
      error: 'El estado "x" no existe en WooCommerce', }, 400)));
    await entrar(page);

    const select = page.getByRole('combobox', { name: 'Estado del pedido #4044' });
    await expect(select).toHaveValue('processing');
    await select.selectOption('completed');

    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo cambiar el estado' })).toBeVisible();
    await expect(select).toHaveValue('processing'); // nunca se queda mostrando algo que Woo no guardó
  });

  test('si lo acepta, el cambio queda', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({
      orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false,
    })));
    await page.route('**/api/admin/set-status', async r => {
      const body = JSON.parse(r.request().postData() || '{}');
      await r.fulfill(json({ ok: true, confirmado: true, status: body.status }));
    });
    await entrar(page);

    const select = page.getByRole('combobox', { name: 'Estado del pedido #4044' });
    await select.selectOption('completed');
    await expect(select).toHaveValue('completed');
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo cambiar' })).toHaveCount(0);
  });

  test('el select no ofrece estados que WooCommerce no acepta', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({
      orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false,
    })));
    await entrar(page);

    const select = page.getByRole('combobox', { name: 'Estado del pedido #4044' });
    await expect(select).toBeVisible();
    const valores = await select.evaluate(el => [...(el as HTMLSelectElement).options].map(o => o.value));
    expect(valores).not.toContain('enviado');
    expect(valores).toEqual(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']);
  });

  // La relectura posterior al PUT es la única prueba de que el cambio quedó. Si
  // WooCommerce guardó otra cosa, la fila tiene que mostrar ESA otra cosa: dejar
  // el valor previo también sería mentir, sólo que de otra forma.
  test('si WooCommerce guardó otro estado, la fila muestra el estado real', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({
      orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false,
    })));
    await page.route('**/api/admin/set-status', r => r.fulfill(json({
      error: 'WooCommerce no guardó "Completado": el pedido #4044 quedó en "Sin pagar".',
      status: 'pending', confirmado: false,
    }, 409)));
    await entrar(page);

    const select = page.getByRole('combobox', { name: 'Estado del pedido #4044' });
    await select.selectOption('completed');

    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo cambiar el estado' })).toBeVisible();
    await expect(select).toHaveValue('pending');
  });

  test('si el cambio entró pero no se pudo confirmar, se avisa y se relee la lista', async ({ page }) => {
    let pedidos = 0;
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => { pedidos++; return r.fulfill(json({
      orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false,
    })); });
    await page.route('**/api/admin/set-status', r => r.fulfill(json({
      ok: true, confirmado: false, status: 'completed',
      aviso: 'WooCommerce aceptó el cambio pero no pudimos confirmarlo. Volvé a cargar la lista antes de seguir.',
    })));
    await entrar(page);
    await expect(page.getByText('#4044')).toBeVisible();
    const antes = pedidos;

    await page.getByRole('combobox', { name: 'Estado del pedido #4044' }).selectOption('completed');

    await expect(page.getByRole('alert').filter({ hasText: 'no pudimos confirmar' })).toBeVisible();
    // Sin confirmación la pantalla no se queda con el resultado optimista.
    await expect.poll(() => pedidos).toBeGreaterThan(antes);
  });
});

test.describe('anomalías', () => {
  test('un total negativo se señala arriba con link al pedido', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json({
      ...COUNTS_OK,
      anomalias: [{ id: 2491, number: '2491', tipo: 'total_negativo', detalle: 'total -3800' }],
    })));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({ orders: [], total: 0, totalPages: 1, page: 1, parcial: false })));
    await entrar(page);

    const aviso = page.locator('text=Revisar:').locator('..');
    await expect(aviso).toContainText('#2491');
    await expect(aviso).toContainText('total negativo');
  });
});

test.describe('búsqueda', () => {
  test('buscar un # encuentra el pedido desde cualquier tab', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => {
      const url = new URL(r.request().url());
      return r.fulfill(json(url.searchParams.get('search') === '1277'
        ? { orders: [order({ id: 1277, number: '1277', status: 'completed' })], total: 1, totalPages: 1, page: 1, parcial: false }
        : { orders: [], total: 0, totalPages: 1, page: 1, parcial: false }));
    });
    await entrar(page);

    await page.getByPlaceholder(/Buscar por nombre/).fill('1277');
    await expect(page.getByRole('link', { name: '#1277' }).first()).toBeVisible();
  });

  // Parado en "Por empaquetar", el tab esconde los pedidos que ya tienen rótulo.
  // Buscando por nombre eso no puede pasar: el pedido que se busca tiene que
  // aparecer sin importar en qué pantalla estaba el equipo.
  test('buscar por nombre muestra un pedido que el tab escondería', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => {
      const sp = new URL(r.request().url()).searchParams;
      if (!sp.get('search')) {
        return r.fulfill(json({ orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false }));
      }
      // Buscando, el panel consulta todos los estados, no el del tab.
      expect(sp.get('status')).toBe('any');
      return r.fulfill(json({
        orders: [order({ id: 3991, number: '3991', packaged: true, shipped: true, stage: 'con_guia' })],
        total: 1, totalPages: 1, page: 1, parcial: false, coincidenciasWc: 1, revisados: 1,
      }));
    });
    await entrar(page);

    await page.getByRole('button', { name: 'Por empaquetar', exact: true }).click();
    await page.getByPlaceholder(/Buscar por nombre/).fill('Anali Castro');
    await expect(page.getByRole('link', { name: '#3991' }).first()).toBeVisible();
  });

  test('una búsqueda con más coincidencias de las revisadas lo dice', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => {
      const sp = new URL(r.request().url()).searchParams;
      return r.fulfill(json(sp.get('search')
        ? { orders: [order()], total: 1, totalPages: 1, page: 1, parcial: true, coincidenciasWc: 971, revisados: 100 }
        : { orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false }));
    });
    await entrar(page);

    await page.getByPlaceholder(/Buscar por nombre/).fill('gmail.com');
    const aviso = page.getByRole('alert').filter({ hasText: 'Búsqueda recortada' });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('971');
    await expect(aviso).toContainText('100');
  });
});

test.describe('caché compartido entre los tabs de flujo', () => {
  /** Monta la página contando cuántas veces se pide la lista. */
  async function conContador(page: Page, orders: any[]) {
    const pedidos: string[] = [];
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json({
      ...COUNTS_OK, porEmpaquetar: 2, empaquetados: 1, enviadosSinMarcar: 1,
    })));
    await page.route('**/api/admin/orders?*', r => {
      pedidos.push(new URL(r.request().url()).search);
      return r.fulfill(json({ orders, total: orders.length, totalPages: 1, page: 1, parcial: false }));
    });
    await entrar(page);
    return pedidos;
  }

  const procesando = [
    order({ id: 1, number: '1' }),
    order({ id: 2, number: '2' }),
    order({ id: 3, number: '3', packaged: true, stage: 'con_rotulo' }),
    order({ id: 4, number: '4', packaged: true, shipped: true, stage: 'con_guia' }),
  ];

  test('recorrer los 3 tabs de flujo no cuesta ni una consulta más', async ({ page }) => {
    const pedidos = await conContador(page, procesando);
    await expect(page.getByRole('link', { name: '#1' }).first()).toBeVisible();
    const tras1 = pedidos.length;

    // Los 3 tabs piden la misma consulta (status=processing) y filtran distinto
    // en el cliente: con el dato recién traído, cambiar de tab no pega a WP.
    await page.getByRole('button', { name: /Empaquetado/ }).first().click();
    await expect(page.getByRole('link', { name: '#3' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: '#1' })).toHaveCount(0);

    await page.getByRole('button', { name: /Enviado s\/ marcar/ }).first().click();
    await expect(page.getByRole('link', { name: '#4' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Por empaquetar/ }).first().click();
    await expect(page.getByRole('link', { name: '#1' }).first()).toBeVisible();

    expect(pedidos.length).toBe(tras1);
  });

  test('el indicador dice de cuándo son los datos y el botón fuerza la relectura', async ({ page }) => {
    const pedidos = await conContador(page, procesando);
    await expect(page.getByRole('link', { name: '#1' }).first()).toBeVisible();
    const refrescar = page.getByTitle('Volver a leer los pedidos desde WooCommerce');
    await expect(refrescar).toBeVisible();

    const antes = pedidos.length;
    await refrescar.click();
    await expect.poll(() => pedidos.length).toBeGreaterThan(antes);
  });

  test('una escritura tira el caché: el tab siguiente relee', async ({ page }) => {
    const pedidos = await conContador(page, procesando);
    await page.route('**/api/admin/set-status', async r => {
      const body = JSON.parse(r.request().postData() || '{}');
      await r.fulfill(json({ ok: true, confirmado: true, status: body.status }));
    });
    await expect(page.getByRole('link', { name: '#1' }).first()).toBeVisible();

    await page.getByRole('combobox', { name: 'Estado del pedido #1' }).selectOption('completed');
    await expect(page.getByRole('combobox', { name: 'Estado del pedido #1' })).toHaveValue('completed');

    const antes = pedidos.length;
    await page.getByRole('button', { name: /Enviado s\/ marcar/ }).first().click();
    await expect.poll(() => pedidos.length).toBeGreaterThan(antes);
  });
});

test.describe('mobile (390×844): la lista se ve sin scrollear', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('la cola de estampado arranca colapsada y resume en el encabezado', async ({ page }) => {
    await page.route('**/api/admin/orders/counts*', r => r.fulfill(json(COUNTS_OK)));
    await page.route('**/api/admin/orders?*', r => r.fulfill(json({
      orders: [order()], total: 1, totalPages: 1, page: 1, parcial: false,
    })));
    await page.addInitScript((k) => sessionStorage.setItem('hype_admin_key', k), CLAVE);
    await page.route('**/api/admin/pod-pendientes*', r => r.fulfill(json({
      revisados: 13, porEmpaquetar: 8, total: 7, sinTalle: 0,
      lineas: [{ design: 'Lettering', talle: 'M', cantidad: 3, blank: 'tee-black', pedidos: [{ number: 4044 }] }],
      blanks: [{ blank: 'tee-black', label: 'Tee negra', total: 7, porTalle: { M: 3, L: 4 } }],
    })));
    await page.goto('/admin/pedidos');

    const toggle = page.getByRole('button', { name: /Pendiente a estampar/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Cerrada, pero el encabezado dice lo que hay: no se pierde información.
    const cabecera = toggle.locator('..');
    await expect(cabecera).toContainText('7 prendas');
    await expect(cabecera).toContainText('1 blank');

    // Y la primera fila de pedidos entra en la primera pantalla.
    const fila = page.getByRole('link', { name: '#4044' }).first();
    await expect(fila).toBeVisible();
    const caja = await fila.boundingBox();
    expect(caja!.y).toBeLessThan(844);
  });
});
