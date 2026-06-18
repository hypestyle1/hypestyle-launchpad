import { getArgentinaFixture, hasKey } from '@/lib/argentina-fixture';

// Lógica central del descuento por gol de LA NUESTRA.
// Regla: 7% por cada gol de Argentina (tope 50%), válido 24h desde el primer gol
// O hasta vender las primeras 20 unidades PAGAS, lo que ocurra primero.

const WP = 'https://lightpink-rook-704850.hostingersite.com/wp-json/wc/v3';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

export const PRODUCT_ID = 1571;
const PER_GOAL = 0.07;
const MAX_DISCOUNT = 0.5;
const SALE_HOURS = 24;
export const UNIT_CAP = 20;

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
const wcGet = (p: string) => fetch(`${WP}${p}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' }).then(r => r.json());
const wcPut = (p: string, body: any) =>
  fetch(`${WP}${p}`, { method: 'PUT', headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

const fmt = (d: Date) => d.toISOString().slice(0, 19);          // YYYY-MM-DDTHH:MM:SS
const parse = (s: string) => new Date(/Z|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z');

type Target = { path: string; regular: number; sale: number; from: string | null; to: string | null };

async function priceTargets(product: any): Promise<Target[]> {
  if (product?.type === 'variable') {
    const vars = await wcGet(`/products/${PRODUCT_ID}/variations?per_page=100`);
    return (Array.isArray(vars) ? vars : [])
      .map((v: any) => ({ path: `/products/${PRODUCT_ID}/variations/${v.id}`, regular: Math.round(Number(v.regular_price || v.price || 0)), sale: Math.round(Number(v.sale_price || 0)), from: v.date_on_sale_from || null, to: v.date_on_sale_to || null }))
      .filter((t: any) => t.regular > 0);
  }
  return [{ path: `/products/${PRODUCT_ID}`, regular: Math.round(Number(product?.regular_price || product?.price || 0)), sale: Math.round(Number(product?.sale_price || 0)), from: product?.date_on_sale_from || null, to: product?.date_on_sale_to || null }]
    .filter(t => t.regular > 0);
}

// Unidades PAGAS del jersey desde que arrancó el descuento.
async function unitsSoldSince(fromISO: string): Promise<number> {
  const orders = await wcGet(`/orders?product=${PRODUCT_ID}&after=${encodeURIComponent(fromISO)}&status=processing,completed&per_page=100`);
  if (!Array.isArray(orders)) return 0;
  let n = 0;
  for (const o of orders) for (const li of (o.line_items || [])) if (li.product_id === PRODUCT_ID) n += (li.quantity || 0);
  return n;
}

export type DiscountStatus = {
  active: boolean;
  goals: number;
  percent: number;        // 0..1
  sold: number;
  cap: number;
  remaining: number;
  expiresAt: string | null;
  capped: boolean;
  unitsLeft?: number;     // chamuyo de escasez: decae en la ventana del descuento
  changed?: number;
};

// Limpia el descuento en todas las variaciones / el simple.
export async function clearDiscount() {
  const product = await wcGet(`/products/${PRODUCT_ID}`);
  const targets = await priceTargets(product);
  let changed = 0;
  for (const t of targets) if (t.sale) { await wcPut(t.path, { sale_price: '', date_on_sale_from: null, date_on_sale_to: null }); changed++; }
  return { cleared: true, targets: targets.length, changed };
}

// Calcula el estado del descuento y, si write=true, lo aplica/limpia en Woo.
// goalsOverride (opcional) fuerza la cantidad de goles (para test).
export async function syncDiscount(write: boolean, goalsOverride?: number): Promise<DiscountStatus> {
  const base: DiscountStatus = { active: false, goals: 0, percent: 0, sold: 0, cap: UNIT_CAP, remaining: UNIT_CAP, expiresAt: null, capped: false };

  let goals: number;
  if (goalsOverride != null) {
    goals = Math.max(0, goalsOverride);
  } else {
    const fx = hasKey() ? await getArgentinaFixture().catch(() => null) : null;
    const inWindow = !!fx && (fx.live || fx.finished);
    goals = inWindow ? Math.max(0, fx!.argGoals || 0) : 0;
  }

  const product = await wcGet(`/products/${PRODUCT_ID}`);
  const targets = await priceTargets(product);
  if (!targets.length) return base;

  if (goals <= 0) return base; // sin goles → sin descuento

  // Inicio del descuento: estable desde el primer gol (reusa el date_on_sale_from existente).
  const existingFrom = targets.map(t => t.from).filter(Boolean).sort()[0] as string | undefined;
  const fromDate = existingFrom ? parse(existingFrom) : new Date();
  const fromStr = existingFrom || fmt(fromDate);
  const toStr = fmt(new Date(fromDate.getTime() + SALE_HOURS * 3600 * 1000));

  const percent = Math.min(MAX_DISCOUNT, goals * PER_GOAL);
  const sold = await unitsSoldSince(fromStr);

  // Tope de unidades alcanzado → limpiar.
  if (sold >= UNIT_CAP) {
    let changed = 0;
    if (write) for (const t of targets) { if (t.sale) { await wcPut(t.path, { sale_price: '', date_on_sale_from: null, date_on_sale_to: null }); changed++; } }
    return { ...base, goals, percent, sold, remaining: 0, capped: true, changed };
  }

  // Aplicar el descuento (solo escribe lo que cambió; no re-empuja el vencimiento).
  let changed = 0;
  if (write) {
    for (const t of targets) {
      const sale = Math.round(t.regular * (1 - percent));
      if (t.sale !== sale) { await wcPut(t.path, { sale_price: String(sale), date_on_sale_from: fromStr, date_on_sale_to: toStr }); changed++; }
    }
  }

  return { active: true, goals, percent, sold, cap: UNIT_CAP, remaining: Math.max(0, UNIT_CAP - sold), expiresAt: toStr, capped: false, changed };
}

// Estado del descuento leído del SALE REAL del producto en Woo (no del partido en vivo).
// Sirve tanto para el descuento por gol como para una extensión manual del sale.
// Los goles se deducen del %: 21% / 7% = 3 goles.
export async function getActiveDiscountStatus(): Promise<DiscountStatus> {
  const base: DiscountStatus = { active: false, goals: 0, percent: 0, sold: 0, cap: UNIT_CAP, remaining: UNIT_CAP, expiresAt: null, capped: false, unitsLeft: 0 };
  const product = await wcGet(`/products/${PRODUCT_ID}`);
  const targets = await priceTargets(product);
  const onSale = targets.filter(t => t.sale > 0 && t.regular > t.sale);
  if (!onSale.length) return base;

  const t = onSale[0];
  const percent = Math.max(0, Math.min(MAX_DISCOUNT, 1 - t.sale / t.regular));
  const goals = Math.max(1, Math.round(percent / PER_GOAL));
  const fromStr = t.from || fmt(new Date(Date.now() - SALE_HOURS * 3600 * 1000));
  const sold = await unitsSoldSince(fromStr);
  const remaining = Math.max(0, UNIT_CAP - sold);

  let expiresAt: string | null = null;
  let unitsLeft = remaining;
  if (t.to) {
    const end = parse(t.to).getTime();
    expiresAt = new Date(end).toISOString();
    const start = t.from ? parse(t.from).getTime() : end - SALE_HOURS * 3600 * 1000;
    const fracLeft = Math.max(0, Math.min(1, (end - Date.now()) / Math.max(1, end - start)));
    unitsLeft = Math.max(0, Math.min(remaining, Math.ceil(UNIT_CAP * fracLeft)));
  }

  return { active: true, goals, percent, sold, cap: UNIT_CAP, remaining, expiresAt, capped: false, unitsLeft };
}
