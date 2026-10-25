'use client';

import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import PendienteEstampar from '@/components/admin/PendienteEstampar';
import GiftCardsPanel from '@/components/admin/GiftCardsPanel';
import { HoldToConfirm } from '@/components/ui/hold-to-confirm';
import OrderQuickView, { type OrderDetail } from '@/components/admin/OrderQuickView';
import { WC_ORDER_STATUSES, WC_STATUS_LABELS } from '@/lib/wc-order-status';

const WP_SECRET_KEY = 'hype_admin_key';

type OrderItem = { name: string; quantity: number; size: string; dorsalName?: string; dorsalNumber?: string };
type Customer  = { first_name: string; last_name: string; email: string; phone: string };
type Order = {
  id: number; number: string; date: string; status: string;
  customer: Customer; items: OrderItem[];
  total: number; shipping_total: number; payment_method_title: string;
  tracking: string; andreani: string; packaged: boolean; shipped: boolean;
  /** Sólo gift cards: no se empaqueta ni se despacha. */
  digital: boolean;
  notified: string; order_key: string;
  customer_note: string;
  isMayorista: boolean;
};

/** Anomalía de datos que no reclama ninguna cola operativa (total negativo, pedido sin productos). */
type Anomalia = { id: number; number: string; tipo: string; detalle: string };
/** Un conteo en `null` es "no se pudo consultar", que no es lo mismo que cero. */
/** Respuesta de /api/admin/orders. */
type ApiPedidos = { orders: Order[]; total: number; totalPages: number; page: number; parcial?: boolean };
/**
 * Mientras la respuesta guardada tenga menos de FRESCO_MS se usa tal cual, sin
 * pegarle a WooCommerce: recorrer los tabs de flujo sale gratis. Entre FRESCO_MS
 * y CACHE_TTL_MS se muestra al instante y se revalida en segundo plano. Más
 * viejo que eso, se vuelve a pedir esperando la respuesta.
 *
 * Si revalidáramos en cada cambio de tab, tres clics seguirían siendo tres
 * consultas de ~6 s a WP: no bloquearían la pantalla, pero el server igual las
 * paga. El encabezado muestra siempre de cuándo es el dato.
 */
const FRESCO_MS = 15_000;
const CACHE_TTL_MS = 60_000;

type Counts = {
  porEmpaquetar: number | null; empaquetados: number | null; enviadosSinMarcar: number | null;
  pendientes: number | null; enEspera: number | null; fallidos: number | null; completados: number | null;
  anomalias: Anomalia[]; parcial: boolean; errores: string[]; ok: boolean;
};

const STATUS_LABELS: Record<string, string> = WC_STATUS_LABELS;

// Pills de estado: par claro + oscuro (el dark del panel es diseño propio, no inversión).
const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  'on-hold':  'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  completed:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  cancelled:  'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  refunded:   'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  failed:     'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

// La barra de filtros se agrupa por lo que significa cada uno, no en una tira plana:
// FLUJO = el circuito de despacho (lo operativo del día), TIPO = cortes transversales,
// y los estados de Woo viven en un select aparte para no ocupar lugar.
const FLUJO_FILTERS = [
  { f: 'por-empaquetar',     label: 'Por empaquetar' },
  { f: 'empaquetado',        label: 'Empaquetado' },
  { f: 'enviado-sin-marcar', label: 'Enviado s/ marcar' },
];
const TIPO_FILTERS = [
  { f: 'mayorista',  label: 'Mayoristas' },
  { f: 'canje',      label: 'Canje / Regalo' },
  { f: 'gift-cards', label: 'Gift cards' },
];
// Todos los estados que WC acepta de verdad tienen hogar acá. Antes faltaban
// on-hold (mayoristas esperando coordinar el pago), failed (88 pedidos: plata
// recuperable) y refunded, y sobraba 'enviado', que no existe.
const ESTADO_OPTIONS = [
  { f: 'any', label: 'Todos' },
  ...WC_ORDER_STATUSES.map(f => ({ f, label: WC_STATUS_LABELS[f] })),
];
const ESTADO_SET = new Set(ESTADO_OPTIONS.map(o => o.f));
const STATUS_OPTIONS = WC_ORDER_STATUSES;

// Los tabs 'por-empaquetar'/'empaquetado'/'enviado-sin-marcar' consultan 'processing' en
// la API y se afinan en el cliente según tengan rótulo de Andreani y/o guía real.
const PROCESSING_SPLIT_FILTERS = ['por-empaquetar', 'empaquetado', 'enviado-sin-marcar'];
// 'mayorista' se afina en el cliente por meta _es_mayorista (no por status: el pedido
// puede pasar de on-hold a processing/completed una vez coordinado el pago).
// 'canje' lo resuelve el server (pedidos $0 en cualquier estado), llega ya filtrado.
const CLIENT_REFINED_FILTERS = PROCESSING_SPLIT_FILTERS;
// 'gift-cards' no lista pedidos: muestra las tarjetas emitidas y dónde se usaron.
const GIFT_CARDS_FILTER = 'gift-cards';
// 'mayorista' lo resuelve el server sobre todas las páginas (antes el cliente
// filtraba una sola página de 'any' y un mayorista viejo no aparecía).
const apiStatusFor = (f: string) =>
  PROCESSING_SPLIT_FILTERS.includes(f) ? 'processing' : f;

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

/**
 * Fecha compacta, en una línea: "22/10 · 14:08". Antes salía con año y con hora
 * en formato 12 h ("02:08 p. m."), que en la columna angosta se partía en tres
 * renglones. El año casi nunca importa en la lista y la hora exacta tampoco:
 * las dos están completas en el pedido.
 */
function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
       + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function daysSince(s: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86400000));
}

/** "ahora" / "hace 40 s" / "hace 3 min": de cuándo son los pedidos en pantalla. */
function Frescura({ at }: { at: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  return <span>{s < 15 ? 'ahora' : s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`}</span>;
}

function waLink(phone: string, name: string, orderNum: string) {
  const digits  = phone.replace(/\D/g, '');
  const clean   = digits.startsWith('0') ? digits.slice(1) : digits;
  const intl    = clean.startsWith('54') ? clean : '549' + clean;
  const msg     = encodeURIComponent(`Hola ${name}, te escribimos en relación a tu pedido #${orderNum} en Hypestyle. `);
  return `https://wa.me/${intl}?text=${msg}`;
}

export default function PedidosPage() {
  const [adminKey, setAdminKey]       = useState('');
  const [authed, setAuthed]           = useState(false);
  const [keyInput, setKeyInput]       = useState('');
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(false);
  const [filter, setFilter]           = useState('por-empaquetar');
  const [counts, setCounts]           = useState<Counts | null>(null);
  // Estados de carga explícitos. Un error de WooCommerce y una bandeja limpia
  // tienen que verse distinto: así se perdieron semanas con #3103.
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [parcial, setParcial]         = useState(false);
  /** Momento del que son los pedidos que se están mostrando (para no pasar un dato guardado por recién traído). */
  const [dataAt, setDataAt]           = useState<number | null>(null);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus]   = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusMap, setStatusMap]     = useState<Record<number, string>>({});
  const [cancelTarget, setCancelTarget]   = useState<Order | null>(null);
  const [cancelRestock, setCancelRestock] = useState(true);
  const [cancelNotify, setCancelNotify]   = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Último término buscado: distingue "cambió el tab" de "está tipeando". */
  const buscadoRef = useRef('');
  // Secuencia de fetches: si una respuesta vieja llega después de una más nueva
  // (el search de WC puede tardar varios segundos), se descarta en vez de pisar
  // la lista — antes la búsqueda "aparecía y desaparecía" según cuál llegara última.
  const fetchSeq  = useRef(0);
  // Respuestas de /api/admin/orders por clave de consulta. Los 3 tabs de flujo
  // comparten la misma clave ('processing'), así que cambiar de tab no vuelve a
  // descargar nada: se filtra lo que ya está en memoria.
  const cacheRef  = useRef(new Map<string, { at: number; data: ApiPedidos }>());
  // Pedidos desplegados con la flecha + detalle ya cargado de cada uno.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const detailCache = useRef(new Map<number, OrderDetail>());

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  /** Aplica una respuesta de la API a la vista. */
  const aplicar = useCallback((data: ApiPedidos, at: number) => {
    setLoadError(null);
    setParcial(!!data.parcial);
    setOrders(data.orders);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setDataAt(at);
    const smap: Record<number, string> = {};
    data.orders.forEach((o: Order) => { smap[o.id] = o.status; });
    setStatusMap(smap);
  }, []);

  /**
   * Trae la lista. Los tres tabs de flujo ("Por empaquetar", "Empaquetado",
   * "Enviado s/ marcar") piden exactamente la misma consulta — `processing` — y
   * se diferencian recién al filtrar en el cliente. Antes cada cambio de tab
   * volvía a descargar los mismos 479 pedidos: ~6 s de espera por cambio, para
   * los mismos datos que ya estaban en memoria.
   *
   * Acá la respuesta se guarda por clave de consulta y se reutiliza al
   * instante, revalidando en segundo plano. Para que no se pueda confundir un
   * dato guardado con uno recién traído, el encabezado muestra de cuándo es y
   * hay un botón para forzar la relectura; cualquier escritura tira el caché.
   */
  const fetchOrders = useCallback(async (key: string, f: string, q: string, p: number, forzar = false) => {
    const params = new URLSearchParams({ status: apiStatusFor(f), page: String(p), ...(q && { search: q }) });
    const cacheKey = params.toString();
    const seq = ++fetchSeq.current;
    const cached = cacheRef.current.get(cacheKey);
    const edad = cached ? Date.now() - cached.at : Infinity;
    const sirve = !forzar && !!cached && edad < CACHE_TTL_MS;

    setSelected(new Set());
    if (sirve) {
      aplicar(cached!.data, cached!.at);
      setLoading(false);
      // Recién traído: no hay nada que revalidar. Cambiar de tab no cuesta una
      // consulta a WP.
      if (edad < FRESCO_MS) return;
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/admin/orders?${params}`, { headers: { 'x-admin-key': key } });
      if (res.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const data = await res.json().catch(() => null);
      // La revalidación en segundo plano no compite con el fetch del usuario:
      // si la vista ya cambió de consulta, lo que llega sólo va al caché.
      const vigente = seq === fetchSeq.current;

      // Antes acá sólo se miraba el 403: un 502 de WC dejaba data.orders en
      // undefined → setOrders([]) → "No hay pedidos". Un corte de WP se veía
      // igual que una bandeja vacía. La lista anterior se conserva: es vieja,
      // pero es mejor que una pantalla en blanco que miente.
      if (!res.ok || !Array.isArray(data?.orders)) {
        cacheRef.current.delete(cacheKey); // nunca servir como "bueno" algo que falló
        // Si ya se mostró lo guardado, el aviso dice que es viejo y no se pudo refrescar.
        if (vigente) {
          setLoadError(data?.error ? `${data.error}` : `No se pudieron cargar los pedidos (HTTP ${res.status})`);
          if (!sirve) setParcial(false);
        }
        return;
      }

      const at = Date.now();
      cacheRef.current.set(cacheKey, { at, data });
      if (vigente) aplicar(data, at);
    } catch (e) {
      cacheRef.current.delete(cacheKey);
      if (seq === fetchSeq.current) {
        setLoadError(`No se pudieron cargar los pedidos: ${e instanceof Error ? e.message : 'error de red'}`);
      }
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [aplicar]);

  /** Tras cualquier escritura el caché no vale: lo que hay en Woo cambió. */
  const invalidar = useCallback(() => { cacheRef.current.clear(); }, []);

  const fetchCounts = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/admin/orders/counts', { headers: { 'x-admin-key': key } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) { setCountsError(`No se pudieron cargar los contadores (HTTP ${res.status})`); return; }
      setCounts(data);
      // La ruta ya distingue "cero" de "no se pudo consultar": los conteos que
      // fallaron vienen en null y el detalle en `errores`.
      setCountsError(data.ok ? null : `Contadores incompletos — ${(data.errores || []).join(' · ') || 'faltan pedidos de la consulta'}`);
    } catch (e) {
      setCountsError(`No se pudieron cargar los contadores: ${e instanceof Error ? e.message : 'error de red'}`);
    }
  }, []);

  useEffect(() => {
    if (authed && adminKey) fetchCounts(adminKey);
  }, [authed, adminKey, fetchCounts]);

  useEffect(() => {
    if (!authed || !adminKey || filter === GIFT_CARDS_FILTER) return;
    // Tipear en el buscador se espera 400 ms; cambiar de tab, no: sale del
    // caché y tiene que sentirse instantáneo.
    const soloCambioDeTab = buscadoRef.current === search;
    buscadoRef.current = search;
    if (searchRef.current) clearTimeout(searchRef.current);
    const correr = () => { setPage(1); fetchOrders(adminKey, filter, search, 1); };
    if (soloCambioDeTab) correr();
    else searchRef.current = setTimeout(correr, 400);
  }, [authed, adminKey, filter, search, fetchOrders]);

  // Al volver a la pestaña, revalidar: el equipo deja el panel abierto y los
  // pedidos cambian desde el checkout y desde el portal de Andreani.
  useEffect(() => {
    if (!authed || !adminKey) return;
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      invalidar();
      fetchCounts(adminKey);
      if (filter !== GIFT_CARDS_FILTER) fetchOrders(adminKey, filter, search, page, true);
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [authed, adminKey, filter, search, page, fetchOrders, fetchCounts, invalidar]);

  useEffect(() => {
    if (!authed || !adminKey || filter === GIFT_CARDS_FILTER) return;
    fetchOrders(adminKey, filter, search, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(visible: Order[]) {
    if (selected.size === visible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visible.map(o => o.id)));
    }
  }

  /**
   * Cambia el estado y CONFIRMA que quedó guardado en WooCommerce.
   *
   * Antes se actualizaba la vista sin mirar la respuesta: marcar un pedido como
   * "Enviado" (un estado que no existe en WC) devolvía 400, el panel pintaba el
   * cambio igual y el pedido se quedaba en processing. Así se juntaron 464
   * "enviado sin marcar".
   *
   * Ahora el server relee el pedido después del PUT, así que hay tres
   * resultados distintos y ninguno se disfraza de otro:
   *   'ok'            — releído y confirmado en Woo.
   *   'error'         — no se guardó; la fila pasa a mostrar el estado REAL.
   *   'sin-confirmar' — el PUT entró pero no se pudo releer. No se afirma nada:
   *                     se avisa y se vuelve a pedir la lista.
   */
  async function postStatus(orderId: number, status: string): Promise<'ok' | 'error' | 'sin-confirmar'> {
    const previo = statusMap[orderId] ?? orders.find(o => o.id === orderId)?.status ?? '';
    setStatusMap(s => ({ ...s, [orderId]: status }));
    try {
      const res = await fetch('/api/admin/set-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        // El estado real que devolvió la relectura manda sobre lo que se pintó:
        // si WC guardó otra cosa, la fila tiene que mostrar esa otra cosa, no el
        // valor previo (que también podría estar viejo).
        const real = typeof data?.status === 'string' ? data.status : previo;
        setStatusMap(s => ({ ...s, [orderId]: real }));
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: real } : o));
        invalidar();
        setActionError(`No se pudo cambiar el estado del pedido #${orderId}: ${data?.error || `HTTP ${res.status}`}`);
        return 'error';
      }

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      invalidar();

      if (data.confirmado === false) {
        setActionError(data.aviso || `El cambio del pedido #${orderId} se envió pero no pudimos confirmarlo. Volvé a cargar la lista.`);
        return 'sin-confirmar';
      }
      return 'ok';
    } catch (e) {
      setStatusMap(s => ({ ...s, [orderId]: previo }));
      setActionError(`No se pudo cambiar el estado del pedido #${orderId}: ${e instanceof Error ? e.message : 'error de red'}`);
      return 'error';
    }
  }

  async function changeStatus(orderId: number, status: string) {
    setActionError(null);
    const r = await postStatus(orderId, status);
    // Sin confirmación no alcanza con el estado optimista: se vuelve a pedir la
    // lista salteando el caché para que lo que se ve salga de Woo.
    if (r === 'sin-confirmar') fetchOrders(adminKey, filter, search, page, true);
    fetchCounts(adminKey);
  }

  // Al elegir "Cancelado" abrimos el modal (restock + mail); el resto se aplica directo.
  function onStatusSelect(order: Order, status: string) {
    if (status === 'cancelled') {
      setCancelRestock(true);
      setCancelNotify(!!order.customer.email);
      setCancelTarget(order);
    } else {
      changeStatus(order.id, status);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/admin/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ orderId: cancelTarget.id, restock: cancelRestock, notify: cancelNotify }),
      });
      const data = await res.json().catch(() => null);
      // No alcanza con el 200: el route confirma la cancelación releyendo el
      // pedido y devuelve ok:false si WC guardó otra cosa.
      if (!res.ok || !data?.ok) {
        setActionError(`No se pudo cancelar el pedido #${cancelTarget.number}: ${data?.error || `HTTP ${res.status}`}`);
        return;
      }
      if (data.confirmado === false) setActionError(data.aviso || `Cancelamos el pedido #${cancelTarget.number} pero no pudimos confirmarlo.`);
      setStatusMap(s => ({ ...s, [cancelTarget.id]: 'cancelled' }));
      setOrders(prev => prev.map(o => o.id === cancelTarget.id ? { ...o, status: 'cancelled' } : o));
      invalidar();
      fetchCounts(adminKey);
      setCancelTarget(null);
    } finally {
      setCancelLoading(false);
    }
  }

  // Cancelar en bloque tiene que pasar por /api/admin/cancel-order (restaura stock),
  // no por postStatus/set-status (solo cambia el estado) — si no, queda stock fantasma
  // reservado como pasó con el pedido #2244.
  /** Devuelve los ids que NO quedaron cancelados. */
  async function bulkCancel(ids: number[]): Promise<number[]> {
    const fallaron: number[] = [];
    await Promise.all(ids.map(async id => {
      try {
        const res = await fetch('/api/admin/cancel-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
          body: JSON.stringify({ orderId: id, restock: true, notify: false }),
        });
        const data = await res.json().catch(() => null);
        // El .then() de antes corría pase lo que pase: un 502 de WP dejaba la
        // fila pintada como cancelada, el pedido vivo y el stock sin volver.
        if (!res.ok || !data?.ok) { fallaron.push(id); return; }
        setStatusMap(s => ({ ...s, [id]: 'cancelled' }));
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o));
        invalidar();
      } catch {
        fallaron.push(id);
      }
    }));
    return fallaron;
  }

  async function applyBulk() {
    if (!bulkStatus || selected.size === 0) return;
    const ids = [...selected];
    // Cancelar ya no pasa por window.confirm: el botón de la barra es un
    // HoldToConfirm, y sostenerlo es la confirmación.
    setBulkLoading(true);
    setActionError(null);
    // Se informa cuántos quedaron sin aplicar y cuáles: un lote a medias que se
    // presenta como exitoso es la forma más rápida de perder pedidos.
    let hayDudas = false;
    if (bulkStatus === 'cancelled') {
      const fallaron = await bulkCancel(ids);
      if (fallaron.length) {
        hayDudas = true;
        setActionError(`${ids.length - fallaron.length} de ${ids.length} cancelados. Sin cancelar: ${fallaron.map(id => `#${id}`).join(', ')}.`);
      }
    } else {
      const rs = await Promise.all(ids.map(id => postStatus(id, bulkStatus)));
      const fallaron     = ids.filter((_, i) => rs[i] === 'error');
      const sinConfirmar = ids.filter((_, i) => rs[i] === 'sin-confirmar');
      if (fallaron.length || sinConfirmar.length) {
        hayDudas = true;
        const partes = [`${rs.filter(r => r === 'ok').length} de ${ids.length} cambiados.`];
        if (fallaron.length)     partes.push(`Sin aplicar: ${fallaron.map(id => `#${id}`).join(', ')}.`);
        if (sinConfirmar.length) partes.push(`Sin confirmar: ${sinConfirmar.map(id => `#${id}`).join(', ')}.`);
        setActionError(partes.join(' '));
      }
    }
    // Un lote con dudas se relee de Woo: la pantalla no se queda con el
    // resultado optimista de un cambio que no sabemos si entró.
    if (hayDudas) fetchOrders(adminKey, filter, search, page, true);
    fetchCounts(adminKey);
    setBulkLoading(false);
    setSelected(new Set());
    setBulkStatus('');
  }

  // Vista afinada por rótulo/guía para los tabs de empaquetado y envío; el resto muestra lo cargado.
  // "Por empaquetar" va del más viejo al más nuevo: lo más atrasado arriba, imposible de pasar por alto.
  // Buscar un # de pedido lo muestra siempre, sin importar en qué tab se esté parado.
  const visibleOrders = /^#?\d+$/.test(search.trim())
    ? orders
    : filter === 'por-empaquetar'
    ? orders.filter(o => !o.packaged && !o.digital).sort((a, b) => +new Date(a.date) - +new Date(b.date))
    : filter === 'empaquetado'
      ? orders.filter(o => o.packaged && !o.shipped)
      : filter === 'enviado-sin-marcar'
        ? orders.filter(o => o.shipped)
        : orders;
  const revenue = visibleOrders.reduce((s, o) => s + o.total, 0);
  const enGiftCards = filter === GIFT_CARDS_FILTER;
  const headerCount = enGiftCards ? 0 : CLIENT_REFINED_FILTERS.includes(filter) ? visibleOrders.length : total;
  const anomalias = counts?.anomalias || [];

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 w-full max-w-sm">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-muted-foreground text-center mb-4">Clave de administrador</p>
          <input
            type="password"
            className="w-full border border-border-mid rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring"
            placeholder="Clave admin"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          <button onClick={login} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold hover:opacity-90">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[14px] font-semibold text-foreground">Pedidos</span>
          {headerCount > 0 && <span className="text-[12px] text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-full">{headerCount}</span>}

        </div>
        <div className="flex items-center gap-2">
          {/* Stats globales reales */}
          {!!counts?.porEmpaquetar && <span className="hidden sm:inline text-[11px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">{counts.porEmpaquetar} por empaquetar</span>}
          {!!counts?.empaquetados && <span className="hidden sm:inline text-[11px] font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300">{counts.empaquetados} empaquetados</span>}
          {!enGiftCards && <span className="hidden md:inline text-[11px] text-muted-foreground font-medium">{fmt(revenue)}</span>}
          {/* De cuándo es lo que se está viendo + relectura forzada. Sin esto, un
              dato reutilizado del caché sería indistinguible de uno recién traído. */}
          {!enGiftCards && dataAt !== null && (
            <button
              onClick={() => { invalidar(); fetchOrders(adminKey, filter, search, page, true); fetchCounts(adminKey); }}
              disabled={loading}
              title="Volver a leer los pedidos desde WooCommerce"
              className="flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground px-2 py-1 rounded hover:bg-muted disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" /></svg>
              {loading ? 'Actualizando' : <Frescura at={dataAt} />}
            </button>
          )}
          <Link
            href="/admin/pedidos/nuevo"
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-colors"
          >
            + Cargar pedido
          </Link>
          <button
            onClick={() => { sessionStorage.removeItem(WP_SECRET_KEY); setAuthed(false); setAdminKey(''); }}
            className="text-[11px] text-muted-foreground/70 hover:text-foreground/80 px-2 py-1 rounded hover:bg-muted"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-5">
        {/* Avisos de confiabilidad: lo que el panel NO sabe, dicho en voz alta. */}
        {(loadError || countsError || parcial || counts?.parcial || actionError || anomalias.length > 0) && (
          <div className="space-y-2 mb-4">
            {loadError && (
              <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-[13px] text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                <span className="font-semibold">No se pudieron cargar los pedidos.</span>
                <span className="text-[12px] opacity-80">{loadError}</span>
                <button
                  onClick={() => { fetchOrders(adminKey, filter, search, page, true); fetchCounts(adminKey); }}
                  className="ml-auto text-[12px] font-semibold px-2.5 py-1 rounded border border-red-400 hover:bg-red-100 dark:border-red-500/50 dark:hover:bg-red-500/20"
                >
                  Reintentar
                </button>
              </div>
            )}
            {(parcial || counts?.parcial) && (
              <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <span className="font-semibold">Lista incompleta.</span>{' '}
                <span className="text-[12px] opacity-90">Faltan pedidos de esta consulta: lo que ves abajo no es todo. No tomes decisiones de despacho con esta vista.</span>
              </div>
            )}
            {countsError && (
              <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <span className="font-semibold">Contadores no confiables.</span>{' '}
                <span className="text-[12px] opacity-90">{countsError}</span>
              </div>
            )}
            {actionError && (
              <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-[13px] text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                <span>{actionError}</span>
                <button onClick={() => setActionError(null)} className="ml-auto flex-none text-[11px] opacity-70 hover:opacity-100">Cerrar</button>
              </div>
            )}
            {anomalias.map(a => (
              <div key={`${a.id}-${a.tipo}`} className="flex flex-wrap items-center gap-x-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-[12px] text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-200">
                <span className="font-semibold">Revisar:</span>
                <Link href={`/admin/pedidos/${a.id}`} className="font-bold underline">#{a.number}</Link>
                <span className="opacity-90">{a.tipo === 'total_negativo' ? `total negativo (${a.detalle})` : a.detalle}</span>
              </div>
            ))}
          </div>
        )}

        {/* KPIs — conteos reales globales. `null` = no se pudo consultar, se muestra "—". */}
        {counts && (
          // 3 por fila en mobile: a 2 por fila las seis tarjetas ocupaban tres
          // renglones y empujaban la lista fuera de la primera pantalla.
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {([
              { f: 'por-empaquetar',     n: counts.porEmpaquetar,     label: 'Por empaquetar',     num: 'text-red-600 dark:text-red-400',       active: 'border-red-400 ring-red-200 dark:border-red-500/60 dark:ring-red-500/25' },
              { f: 'empaquetado',        n: counts.empaquetados,      label: 'Empaquetado',        num: 'text-orange-600 dark:text-orange-400', active: 'border-orange-400 ring-orange-200 dark:border-orange-500/60 dark:ring-orange-500/25' },
              { f: 'enviado-sin-marcar', n: counts.enviadosSinMarcar, label: 'Enviado (con guía)', num: 'text-blue-600 dark:text-blue-400',     active: 'border-blue-400 ring-blue-200 dark:border-blue-500/60 dark:ring-blue-500/25' },
              { f: 'pending',            n: counts.pendientes,        label: 'Sin pagar',          num: 'text-yellow-600 dark:text-yellow-400', active: 'border-yellow-400 ring-yellow-200 dark:border-yellow-500/60 dark:ring-yellow-500/25' },
              { f: 'on-hold',            n: counts.enEspera,          label: 'En espera',          num: 'text-orange-600 dark:text-orange-400', active: 'border-orange-400 ring-orange-200 dark:border-orange-500/60 dark:ring-orange-500/25' },
              { f: 'failed',             n: counts.fallidos,          label: 'Falló el pago',      num: 'text-rose-600 dark:text-rose-400',     active: 'border-rose-400 ring-rose-200 dark:border-rose-500/60 dark:ring-rose-500/25' },
            ]).map(k => (
              <button
                key={k.f}
                onClick={() => setFilter(k.f)}
                aria-pressed={filter === k.f}
                className={`text-left bg-card rounded-lg border p-3 transition-colors ${filter === k.f ? `${k.active} ring-1` : 'border-border hover:border-border-mid'}`}
              >
                <div className={`text-[22px] font-bold leading-none ${k.n === null ? 'text-muted-foreground/60' : k.num}`}>
                  {k.n === null ? '—' : k.n}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">{k.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Cola de estampado de las prendas print on demand por empaquetar. */}
        <PendienteEstampar adminKey={adminKey} />

        {/* Toolbar: flujo de despacho · tipos · estados · búsqueda */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0 [scrollbar-width:none]">
            {/* Flujo de despacho — lo operativo del día, "Por empaquetar" manda */}
            <div className="flex flex-none rounded-lg border border-border bg-card p-0.5">
              {FLUJO_FILTERS.map(({ f, label }) => {
                const active = filter === f;
                const n = f === 'por-empaquetar' ? counts?.porEmpaquetar : f === 'empaquetado' ? counts?.empaquetados : counts?.enviadosSinMarcar;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                    {typeof n === 'number' && n > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-px rounded-full leading-[14px] ${
                        active
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : f === 'por-empaquetar'
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tipos de pedido */}
            <div className="flex flex-none rounded-lg border border-border bg-card p-0.5">
              {TIPO_FILTERS.map(({ f, label }) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors ${
                    filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Estados de Woo, colapsados en un select */}
            <select
              value={ESTADO_SET.has(filter) ? filter : ''}
              onChange={e => e.target.value && setFilter(e.target.value)}
              className={`flex-none h-[34px] rounded-lg border bg-card px-2.5 text-[12px] font-medium cursor-pointer focus:outline-none ${
                ESTADO_SET.has(filter) ? 'border-primary text-foreground' : 'border-border text-muted-foreground'
              }`}
            >
              <option value="" disabled>Estado…</option>
              {ESTADO_OPTIONS.map(({ f, label }) => <option key={f} value={f}>{label}</option>)}
            </select>
          </div>

          {!enGiftCards && <input
            type="text"
            className="lg:ml-auto lg:w-[280px] border border-border rounded-lg px-3 py-1.5 text-[13px] bg-card focus:outline-none focus:border-border-mid"
            placeholder="Buscar por nombre o # de pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />}
        </div>

        {/* Bulk action bar */}
        {!enGiftCards && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg">
            <span className="text-[13px] font-medium">{selected.size} seleccionado{selected.size > 1 ? 's' : ''}</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="text-[12px] bg-card text-foreground rounded px-2 py-1 focus:outline-none"
            >
              <option value="">Cambiar estado...</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            {bulkStatus === 'cancelled' ? (
              // Cancelar restaura stock y no tiene vuelta atrás: se confirma
              // sosteniendo, no con un click.
              <HoldToConfirm
                onConfirm={applyBulk}
                disabled={bulkLoading}
                className="h-7 min-w-0 rounded text-[12px]"
                confirmedContent={bulkLoading ? 'Cancelando...' : 'Cancelado'}
              >
                {`Mantené para cancelar ${selected.size}`}
              </HoldToConfirm>
            ) : (
              <button
                onClick={applyBulk}
                disabled={!bulkStatus || bulkLoading}
                className="text-[12px] font-semibold bg-card text-foreground px-3 py-1 rounded hover:bg-muted disabled:opacity-50"
              >
                {bulkLoading ? 'Aplicando...' : 'Aplicar'}
              </button>
            )}
            <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-primary-foreground/70 hover:text-primary-foreground">
              Cancelar
            </button>
          </div>
        )}

        {/* Table */}
        {enGiftCards ? (
          <GiftCardsPanel adminKey={adminKey} />
        ) : loading ? (
          <div className="text-center py-20 text-[13px] text-muted-foreground/70">Cargando pedidos...</div>
        ) : visibleOrders.length === 0 ? (
          // "No hay pedidos" sólo cuando de verdad no hay. Si la consulta falló,
          // el vacío es desconocimiento, no una bandeja limpia.
          <div className="text-center py-20 text-[13px] text-muted-foreground/70">
            {loadError
              ? <span className="text-red-700 dark:text-red-300">No sabemos qué pedidos hay: la consulta a WooCommerce falló. Reintentá arriba.</span>
              : 'No hay pedidos'}
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Table header */}
            <div className="hidden lg:grid grid-cols-[32px_84px_1fr_1fr_100px_120px_80px] gap-3 px-4 py-2.5 border-b border-border bg-muted/50">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los pedidos de la lista"
                  checked={selected.size === visibleOrders.length && visibleOrders.length > 0}
                  onChange={() => toggleAll(visibleOrders)}
                  className="rounded border-border-mid cursor-pointer"
                />
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Orden</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:block">Productos</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Total</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Fecha</div>
            </div>

            {/* Rows */}
            {visibleOrders.map((order, idx) => {
              const isOpen = expanded.has(order.id);
              return (
              <Fragment key={order.id}>
              {/* Toda la fila despliega el pedido; los controles internos frenan la propagación. */}
              <div
                onClick={() => toggleExpanded(order.id)}
                className={`grid grid-cols-[28px_1fr_auto] gap-x-3 gap-y-1.5 lg:gap-y-3 lg:grid-cols-[32px_84px_1fr_1fr_100px_120px_80px] px-4 py-3 items-center border-b border-border hover:bg-muted/50 transition-colors group cursor-pointer ${
                  selected.has(order.id) ? 'bg-blue-50 hover:bg-blue-50 dark:bg-blue-500/10 dark:hover:bg-blue-500/10' : ''
                } ${isOpen ? 'bg-muted/30' : ''} ${idx === visibleOrders.length - 1 && !isOpen ? 'border-b-0' : ''}`}
              >
                {/* Checkbox */}
                <div className="flex items-center col-start-1 row-start-1 lg:col-start-auto lg:row-start-auto" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar pedido #${order.number}`}
                    checked={selected.has(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    className="rounded border-border-mid cursor-pointer"
                  />
                </div>

                {/* Order # */}
                <div className="col-start-2 row-start-1 lg:col-start-auto lg:row-start-auto">
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-[13px] font-bold text-foreground hover:underline"
                  >
                    #{order.number}
                  </Link>
                  <a
                    href={`/admin/pedidos/${order.id}/rotulo`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title="Imprimir rótulo de envío"
                    className="ml-1.5 inline-flex align-middle text-muted-foreground/50 hover:text-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v7H6z" /></svg>
                  </a>
                  {order.isMayorista && (
                    <div className="text-[9px] font-bold uppercase tracking-wide text-purple-700 bg-purple-100 dark:bg-purple-500/15 dark:text-purple-300 rounded px-1 inline-block mt-0.5 mr-1">
                      Mayorista
                    </div>
                  )}
                  {order.total === 0 && !order.digital && (
                    <div className="text-[9px] font-bold uppercase tracking-wide text-teal-700 bg-teal-100 dark:bg-teal-500/15 dark:text-teal-300 rounded px-1 inline-block mt-0.5">
                      Canje/Regalo
                    </div>
                  )}
                  {order.shipped ? (
                    <div className="text-[10px] text-green-600 dark:text-green-400 font-medium mt-0.5 truncate max-w-[80px]" title={order.tracking}>
                      ✓ Enviado
                    </div>
                  ) : order.packaged ? (
                    <div className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-0.5 truncate max-w-[80px]" title={order.andreani}>
                      Empaquetado
                    </div>
                  ) : order.digital ? (
                    <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Digital</div>
                  ) : order.status === 'processing' ? (
                    <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-0.5">Sin empaquetar</div>
                  ) : null}
                </div>

                {/* Customer */}
                <div className="min-w-0 col-start-2 col-span-1 row-start-2 lg:col-span-1 lg:col-start-auto lg:row-start-auto">
                  <Link href={`/admin/pedidos/${order.id}`} onClick={e => e.stopPropagation()} className="text-[13px] font-medium text-foreground hover:underline truncate block">
                    {order.customer.first_name} {order.customer.last_name}
                  </Link>
                  {order.customer_note && (
                    <div className="text-[11px] text-muted-foreground italic border-l-2 border-warning/60 pl-1.5 mt-1 truncate max-w-full lg:max-w-[260px]" title={order.customer_note}>
                      {order.customer_note}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground/70 truncate">{order.customer.email}</span>
                    {order.customer.phone && (
                      <a
                        href={waLink(order.customer.phone, order.customer.first_name, order.number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title={`WhatsApp ${order.customer.phone}`}
                        className="flex-none opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-green-500 hover:fill-green-600" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {/* Chevron mobile: a la derecha de la fila del cliente */}
                <div className="flex items-center justify-end col-start-3 row-start-2 lg:hidden">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleExpanded(order.id); }}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `Cerrar pedido #${order.number}` : `Ver pedido #${order.number}`}
                    className="w-6 h-6 flex items-center justify-center rounded-md border border-border text-muted-foreground"
                  >
                    <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                </div>

                {/* Products — con la flecha de desglose al lado */}
                <div className="hidden lg:flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleExpanded(order.id); }}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `Cerrar pedido #${order.number}` : `Ver pedido #${order.number}`}
                    className="w-6 h-6 flex-none flex items-center justify-center rounded-md border border-border hover:border-border-mid hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                  <span className="min-w-0 truncate text-[12px] text-muted-foreground">
                    {order.items.map((it, i) => (
                      <span key={i}>{i > 0 && ' · '}{it.name.replace(/\s*—\s*Talle\s*\S+/i, '')}{it.size ? ` ${it.size}` : ''}{(it.dorsalNumber || it.dorsalName) ? ` [${it.dorsalNumber ? `#${it.dorsalNumber}` : ''}${it.dorsalName ? ` ${it.dorsalName}` : ''}]` : ''} ×{it.quantity}</span>
                    ))}
                  </span>
                </div>

                {/* Total */}
                <div className="text-right col-start-3 row-start-1 lg:col-start-auto lg:row-start-auto">
                  <div className="text-[13px] font-semibold text-foreground">{fmt(order.total)}</div>
                  <div className="text-[11px] text-muted-foreground/70">{order.payment_method_title.replace('MercadoPago', 'MP')}</div>
                </div>

                {/* Status */}
                <div className="col-start-2 row-start-3 lg:col-start-auto lg:row-start-auto">
                  <select
                    aria-label={`Estado del pedido #${order.number}`}
                    value={statusMap[order.id] || order.status}
                    onChange={e => onStatusSelect(order, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring/40 ${
                      STATUS_COLORS[statusMap[order.id] || order.status] || 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>

                {/* Date + antigüedad */}
                <div className="text-right col-start-3 row-start-3 lg:col-start-auto lg:row-start-auto">
                  <Link href={`/admin/pedidos/${order.id}`} onClick={e => e.stopPropagation()} className="text-[11px] text-muted-foreground/70 hover:text-foreground block whitespace-nowrap">
                    {fmtDate(order.date)}
                  </Link>
                  {order.status === 'processing' && !order.shipped && !order.digital && (
                    <div className={`text-[10px] font-semibold mt-0.5 ${daysSince(order.date) >= 3 ? 'text-red-600 dark:text-red-400' : daysSince(order.date) >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/70'}`}>
                      hace {daysSince(order.date)}d
                    </div>
                  )}
                </div>
              </div>
              {isOpen && <OrderQuickView orderId={order.id} adminKey={adminKey} cache={detailCache.current} />}
              </Fragment>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!enGiftCards && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="text-[12px] text-muted-foreground">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Modal de cancelación */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !cancelLoading && setCancelTarget(null)}
        >
          <div className="bg-card rounded-lg shadow-lg w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-foreground">Cancelar pedido #{cancelTarget.number}</h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              {cancelTarget.customer.first_name} {cancelTarget.customer.last_name} · {fmt(cancelTarget.total)}
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={cancelRestock} onChange={e => setCancelRestock(e.target.checked)} className="mt-0.5 rounded border-border-mid" />
                <span className="text-[13px] text-foreground">
                  Restaurar stock
                  <span className="block text-[11px] text-muted-foreground/70">Devuelve las unidades de cada talle al inventario.</span>
                </span>
              </label>
              <label className={`flex items-start gap-2 ${cancelTarget.customer.email ? 'cursor-pointer' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={cancelNotify}
                  disabled={!cancelTarget.customer.email}
                  onChange={e => setCancelNotify(e.target.checked)}
                  className="mt-0.5 rounded border-border-mid"
                />
                <span className="text-[13px] text-foreground">
                  Enviar mail al cliente
                  <span className="block text-[11px] text-muted-foreground/70">
                    {cancelTarget.customer.email ? `Mail de cancelación a ${cancelTarget.customer.email}` : 'El pedido no tiene email'}
                  </span>
                </span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setCancelTarget(null)} disabled={cancelLoading} className="flex-1 text-[13px] font-medium py-2 rounded-lg border border-border hover:bg-muted/50 disabled:opacity-50">
                Volver
              </button>
              <HoldToConfirm
                onConfirm={confirmCancel}
                disabled={cancelLoading}
                className="h-9 flex-1 min-w-0 rounded-lg text-[13px]"
                confirmedContent={cancelLoading ? 'Cancelando...' : 'Cancelado'}
              >
                Mantené para cancelar
              </HoldToConfirm>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
