// Close Friends de Instagram: la lista de clientes que dejaron su usuario de IG
// al comprar, para sumarlos al círculo de mejores amigos de @hypestyle.
//
// Módulo puro (sin fetch, sin React) para que la normalización y el merge se
// testeen solos. La persistencia vive en la WP option `hs_close_friends`
// (ruta hypestyle/v1/close-friends del mu-plugin) y el sync contra Woo en
// lib/close-friends/sync.ts.

export type CloseFriendSource = 'woo' | 'tiendanube' | 'manual';

/** listo = usuario válido · revisar = dejó un mail o un mensaje, hay que mirarlo a mano · descartado = no sirve (prueba, "hola", "ok"). */
export type CloseFriendStatus = 'listo' | 'revisar' | 'descartado';

export interface CloseFriendEntry {
  /** Usuario normalizado (sin @, minúsculas). Es la clave de dedupe. */
  handle: string;
  name: string;
  email: string;
  /** Número visible del pedido (Woo `number` o el de Tienda Nube). */
  orderNumber: string;
  /** Fecha del pedido, ISO `YYYY-MM-DD`. */
  date: string;
  source: CloseFriendSource;
  status: CloseFriendStatus;
  /** Tildado en el checklist: ya está agregado a Close Friends. */
  added: boolean;
  addedAt?: string | null;
  /** Lo que escribió el cliente, tal cual (sirve para los REVISAR). */
  note: string;
  createdAt: string;
}

export interface CloseFriendsStore {
  entries: CloseFriendEntry[];
  /** ISO del último sync contra Woo, o null si nunca corrió. */
  lastSyncAt: string | null;
  updatedAt: string | null;
}

export const SOURCE_LABEL: Record<CloseFriendSource, string> = {
  woo: 'WooCommerce',
  tiendanube: 'Tienda Nube',
  manual: 'Manual',
};

export const STATUS_LABEL: Record<CloseFriendStatus, string> = {
  listo: 'Listo',
  revisar: 'Revisar',
  descartado: 'Descartado',
};

/** Pruebas internas que nunca van a la lista. */
export const EXCLUDED_EMAILS = new Set(['hypestylearg@gmail.com', 'valentinpozzi03@gmail.com']);

export function emptyStore(): CloseFriendsStore {
  return { entries: [], lastSyncAt: null, updatedAt: null };
}

/** Saca el `@` inicial, pasa a minúsculas, recorta espacios y puntos finales. */
export function normalizeHandle(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .trim()
    .replace(/\.+$/, '');
}

/** Un usuario de IG válido: letras, números, punto y guión bajo, hasta 30. */
const HANDLE_RE = /^[a-z0-9._]{1,30}$/;

/**
 * Clasifica lo que dejó el cliente en el campo de Instagram.
 * - Un mail o un mensaje de varias palabras → `revisar` (no se descarta: a veces
 *   el usuario está adentro del texto, como "mi ig es @fulano").
 * - Vacío → null (no hay nada que cargar).
 */
export function classifyNote(raw: string): { handle: string; status: CloseFriendStatus } | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const sinArroba = trimmed.replace(/^@+/, '');
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sinArroba) || sinArroba.includes('@');
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (looksLikeEmail || words.length > 1) {
    return { handle: normalizeHandle(trimmed), status: 'revisar' };
  }
  const handle = normalizeHandle(trimmed);
  if (!handle) return null;
  if (!HANDLE_RE.test(handle)) return { handle, status: 'revisar' };
  return { handle, status: 'listo' };
}

/** Pedido de Woo con los campos que pedimos (`id,number,status,date_created_gmt,billing,meta_data`). */
export interface WooOrderLike {
  id?: number;
  number?: string | number;
  status?: string;
  date_created_gmt?: string;
  date_created?: string;
  billing?: { first_name?: string; last_name?: string; email?: string } | null;
  meta_data?: { key: string; value: unknown }[];
}

/** Estados que cuentan como compra. Igual que PAID_STATUSES del dashboard. */
export const PAID_STATUSES = new Set(['processing', 'completed', 'enviado']);

/**
 * Convierte un pedido de Woo en una entrada, o null si no aplica: sin usuario
 * de IG, prueba interna, o (si `onlyPaid`) sin pago confirmado.
 */
export function entryFromOrder(order: WooOrderLike, opts: { onlyPaid?: boolean; now?: string } = {}): CloseFriendEntry | null {
  const onlyPaid = opts.onlyPaid ?? true;
  if (onlyPaid && !PAID_STATUSES.has(String(order.status || ''))) return null;
  const meta = (order.meta_data || []).find((m) => m.key === '_instagram');
  const raw = meta?.value == null ? '' : String(meta.value);
  const cls = classifyNote(raw);
  if (!cls) return null;

  const b = order.billing || {};
  const name = `${b.first_name || ''} ${b.last_name || ''}`.replace(/\s+/g, ' ').trim();
  const email = String(b.email || '').trim().toLowerCase();
  if (EXCLUDED_EMAILS.has(email) || /hypestyle/i.test(name)) return null;

  const dateIso = order.date_created_gmt || order.date_created || '';
  const date = dateIso ? String(dateIso).slice(0, 10) : '';

  return {
    handle: cls.handle,
    name,
    email,
    orderNumber: String(order.number ?? order.id ?? ''),
    date,
    source: 'woo',
    status: cls.status,
    added: false,
    addedAt: null,
    note: raw.trim(),
    createdAt: opts.now || new Date().toISOString(),
  };
}

/** Clave de dedupe: los REVISAR se deduplican por pedido (el "handle" es el texto, no sirve). */
export function entryKey(e: Pick<CloseFriendEntry, 'handle' | 'status' | 'orderNumber' | 'source'>): string {
  if (e.status === 'revisar') return `revisar:${e.source}:${e.orderNumber}`;
  return e.handle;
}

/**
 * Suma entradas nuevas a la lista sin pisar lo que ya estaba. Si el usuario ya
 * existe se conserva la entrada original (y su tilde). `added` sólo puede subir
 * a true por un import que lo traiga tildado; nunca destilda.
 */
export function mergeEntries(existing: CloseFriendEntry[], incoming: CloseFriendEntry[]): { entries: CloseFriendEntry[]; added: number; updated: number } {
  const byKey = new Map<string, CloseFriendEntry>();
  for (const e of existing) byKey.set(entryKey(e), e);
  let added = 0;
  let updated = 0;
  for (const inc of incoming) {
    const k = entryKey(inc);
    const prev = byKey.get(k);
    if (!prev) { byKey.set(k, inc); added++; continue; }
    if (inc.added && !prev.added) {
      byKey.set(k, { ...prev, added: true, addedAt: inc.addedAt || prev.addedAt || inc.createdAt });
      updated++;
    }
  }
  return { entries: [...byKey.values()], added, updated };
}

/** Parser CSV chico (comillas, comas y saltos de línea adentro de comillas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/** `18/4/2026` o `18/04/26` → `2026-04-18`. Devuelve '' si no parsea. */
export function parseDmy(s: string): string {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
  const d = m[1].padStart(2, '0');
  const mo = m[2].padStart(2, '0');
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${mo}-${d}`;
}

/**
 * Importa el CSV del sheet maestro "Close Friends - Usuarios IG (Woo + Tienda
 * Nube)". Columnas: Agregado a CF | Usuario IG | Estado | Fuente | Orden |
 * Fecha | Nombre | Email | Nota original. Tolera columnas faltantes.
 */
export function entriesFromSheetCsv(csv: string, now = new Date().toISOString()): CloseFriendEntry[] {
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => {
    for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; }
    return -1;
  };
  const iAdded = col('agregado a cf', 'agregado', 'cf');
  const iUser = col('usuario ig', 'usuario', 'ig', 'instagram');
  const iStatus = col('estado');
  const iSource = col('fuente');
  const iOrder = col('orden', 'pedido', 'n° de orden');
  const iDate = col('fecha');
  const iName = col('nombre');
  const iEmail = col('email', 'mail');
  const iNote = col('nota original', 'nota');
  if (iUser < 0) return [];

  const out: CloseFriendEntry[] = [];
  for (const r of rows.slice(1)) {
    const get = (i: number) => (i >= 0 ? String(r[i] ?? '').trim() : '');
    const rawUser = get(iUser);
    const note = get(iNote) || rawUser;
    if (!rawUser) continue;
    const handle = normalizeHandle(rawUser);
    if (!handle) continue;
    const st = get(iStatus).toLowerCase();
    const status: CloseFriendStatus = st === 'revisar' ? 'revisar' : st === 'descartado' ? 'descartado' : 'listo';
    const src = get(iSource).toLowerCase();
    const source: CloseFriendSource = src.includes('nube') ? 'tiendanube' : src === 'manual' ? 'manual' : 'woo';
    const addedRaw = get(iAdded).toLowerCase();
    const added = addedRaw === 'true' || addedRaw === 'si' || addedRaw === 'sí' || addedRaw === '1' || addedRaw === 'x';
    out.push({
      handle,
      name: get(iName),
      email: get(iEmail).toLowerCase(),
      orderNumber: get(iOrder).replace(/^#/, ''),
      date: parseDmy(get(iDate)),
      source,
      status,
      added,
      addedAt: added ? now : null,
      note,
      createdAt: now,
    });
  }
  return out;
}

/** Contadores para las tarjetas de arriba. Los descartados no cuentan. */
export function summarize(entries: CloseFriendEntry[]) {
  const activos = entries.filter((e) => e.status !== 'descartado');
  const agregados = activos.filter((e) => e.added).length;
  const revisar = activos.filter((e) => e.status === 'revisar' && !e.added).length;
  const pendientes = activos.length - agregados - revisar;
  const total = activos.length;
  return { pendientes, agregados, revisar, total, pct: total ? Math.round((agregados / total) * 100) : 0 };
}
