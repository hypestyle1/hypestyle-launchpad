'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ReviewsTabs from '@/components/admin/reviews/ReviewsTabs';
import { ConfirmDialog } from '@/components/admin/ui';

const WP_SECRET_KEY = 'hype_admin_key';

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type Action = 'approve' | 'reject' | 'pending';

type Review = {
  id: number;
  status: ReviewStatus;
  status_label: string;
  rating: number;
  author_name: string;
  author_email: string;
  text: string;
  date: string;
  product: { id: number; name: string; slug: string; image: string | null };
  order_id: number | null;
  order_number: string | null;
  request_id: number | null;
  source: string;
  source_label: string;
  verified: boolean;
  incentivized: boolean;
  photos: { id: number; thumb: string; full: string }[];
  reply: { id: number; text: string; date: string } | null;
  wp_admin_edit_url: string | null;
};

type Counts = { total: number; pending: number; approved: number; rejected: number };

const EMPTY_COUNTS: Counts = { total: 0, pending: 0, approved: 0, rejected: 0 };

const STATUS_TONE: Record<ReviewStatus, string> = {
  pending:  'bg-warning-soft text-warning',
  approved: 'bg-success-soft text-success',
  rejected: 'bg-muted text-muted-foreground',
};

const ACTION_LABEL: Record<Action, string> = {
  approve: 'Publicar',
  reject:  'Rechazar',
  pending: 'Pasar a pendiente',
};

const ACTION_DONE: Record<Action, string> = {
  approve: 'publicada',
  reject:  'rechazada',
  pending: 'vuelta a pendiente',
};

function parseTs(s: string | null): number {
  if (!s) return NaN;
  return Date.parse(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(parseTs(s));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px" aria-label={`${rating} de 5 estrellas`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'text-foreground' : 'text-border-mid'}>★</span>
      ))}
    </span>
  );
}

// Acciones disponibles según el estado actual: nunca se ofrece la que ya está.
function actionsFor(status: ReviewStatus): Action[] {
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'approved') return ['reject', 'pending'];
  return ['approve', 'pending'];
}

function ActionButton({ action, busy, onClick, small }: { action: Action; busy?: boolean; onClick: () => void; small?: boolean }) {
  const base = `${small ? 'text-[11px] px-2.5 py-1' : 'text-[12px] px-3 py-1.5'} font-semibold rounded-md disabled:opacity-40 transition-colors whitespace-nowrap`;
  const look = action === 'approve'
    ? 'bg-primary text-primary-foreground hover:opacity-90'
    : action === 'reject'
      ? 'border border-destructive/40 text-destructive hover:bg-destructive/10'
      : 'border border-border text-muted-foreground hover:text-foreground hover:bg-muted';
  return (
    <button type="button" onClick={onClick} disabled={busy} className={`${base} ${look}`}>
      {busy ? '...' : ACTION_LABEL[action]}
    </button>
  );
}

function ModeracionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const [rows, setRows]       = useState<Review[]>([]);
  const [counts, setCounts]   = useState<Counts>(EMPTY_COUNTS);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  const [status, setStatus]   = useState(searchParams.get('status') || 'pending');
  const [stars, setStars]     = useState(searchParams.get('stars') || '');
  const [search, setSearch]   = useState(searchParams.get('search') || '');
  const [period, setPeriod]   = useState(searchParams.get('period') || '');
  const [sort, setSort]       = useState(searchParams.get('sort') || 'recent');
  const [photos, setPhotos]   = useState(searchParams.get('photos') === 'yes');
  const [page, setPage]       = useState(Number(searchParams.get('page')) || 1);
  const perPage = 20;

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busyId, setBusyId]     = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirm, setConfirm]   = useState<{ ids: number[]; action: Action } | null>(null);

  // Respuesta de la tienda: una sola caja abierta a la vez.
  const [replyFor, setReplyFor]   = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const [lightbox, setLightbox] = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  const syncUrl = useCallback((p: number) => {
    const params = new URLSearchParams();
    if (status && status !== 'pending') params.set('status', status);
    if (stars) params.set('stars', stars);
    if (search) params.set('search', search);
    if (period) params.set('period', period);
    if (sort !== 'recent') params.set('sort', sort);
    if (photos) params.set('photos', 'yes');
    if (p > 1) params.set('page', String(p));
    router.replace(`/admin/reviews/moderacion${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
  }, [status, stars, search, period, sort, photos, router]);

  const fetchRows = useCallback(async (p: number) => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage), status, sort });
      if (stars) params.set('stars', stars);
      if (search) params.set('search', search);
      if (period) params.set('period', period);
      if (photos) params.set('photos', 'yes');
      const res = await fetch(`/api/admin/reviews/moderation?${params}`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'No se pudieron cargar las reseñas.'); return; }
      setRows(data.items || []);
      setTotal(data.total || 0);
      if (data.counts) setCounts(data.counts);
      setSelected(new Set());
    } catch {
      setMsg('Error al cargar las reseñas.');
    } finally {
      setLoading(false);
    }
  }, [adminKey, status, stars, search, period, sort, photos]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    setPage(1);
    syncUrl(1);
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, adminKey, status, stars, period, sort, photos]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(1); syncUrl(1); fetchRows(1); }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!authed || !adminKey) return;
    syncUrl(page);
    fetchRows(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Reemplaza la fila en memoria con la versión que devolvió el server. Si el
  // filtro activo ya no la incluye (ej. se publicó una pendiente), la saca.
  function applyUpdated(review: Review, newCounts?: Counts) {
    setRows(prev => {
      const keep = status === 'all' || status === review.status;
      return keep ? prev.map(r => (r.id === review.id ? review : r)) : prev.filter(r => r.id !== review.id);
    });
    if (newCounts) setCounts(newCounts);
    if (status !== 'all' && status !== review.status) setTotal(t => Math.max(0, t - 1));
  }

  async function doAction(review: Review, action: Action) {
    if (busyId) return;
    setBusyId(review.id);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/reviews/moderation/${review.id}`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'No se pudo completar la acción.'); return; }
      applyUpdated(data.review, data.counts);
      setMsg(`✓ Reseña de ${review.author_name || 'cliente'} ${ACTION_DONE[action]}.`);
    } catch {
      setMsg('Error al conectar.');
    } finally {
      setBusyId(null);
    }
  }

  async function doBulk(ids: number[], action: Action) {
    if (bulkBusy || ids.length === 0) return;
    setBulkBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/reviews/moderation/bulk', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'No se pudo completar la acción en lote.'); return; }
      const okCount = (data.results || []).filter((r: { ok: boolean }) => r.ok).length;
      const failed = (data.results || []).length - okCount;
      setMsg(`✓ ${okCount} reseña${okCount === 1 ? '' : 's'} ${ACTION_DONE[action]}${failed ? ` · ${failed} con error` : ''}.`);
      setConfirm(null);
      fetchRows(page);
    } catch {
      setMsg('Error al conectar.');
    } finally {
      setBulkBusy(false);
    }
  }

  function requestAction(review: Review, action: Action) {
    // Rechazar o despublicar pide confirmación; publicar no.
    if (action === 'approve') { doAction(review, action); return; }
    setConfirm({ ids: [review.id], action });
  }

  function confirmAction() {
    if (!confirm) return;
    if (confirm.ids.length === 1) {
      const review = rows.find(r => r.id === confirm.ids[0]);
      setConfirm(null);
      if (review) doAction(review, confirm.action);
      return;
    }
    doBulk(confirm.ids, confirm.action);
  }

  function openReply(review: Review) {
    setReplyFor(review.id);
    setReplyText(review.reply?.text || '');
  }

  async function saveReply(review: Review, text: string) {
    if (replyBusy) return;
    setReplyBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/reviews/moderation/${review.id}/reply`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'No se pudo guardar la respuesta.'); return; }
      setRows(prev => prev.map(r => (r.id === review.id ? data.review : r)));
      setReplyFor(null);
      setReplyText('');
      setMsg(text.trim() ? '✓ Respuesta guardada. Se ve en la tienda junto a la reseña.' : '✓ Respuesta borrada.');
    } catch {
      setMsg('Error al conectar.');
    } finally {
      setReplyBusy(false);
    }
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => (prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id))));
  }

  const hasFilters = stars || search || period || photos || sort !== 'recent';

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

  const cards: { key: string; label: string; n: number; tone: string; active: string }[] = [
    { key: 'all',      label: 'Total de reseñas', n: counts.total,    tone: 'text-foreground',       active: 'border-foreground' },
    { key: 'pending',  label: 'Pendientes',       n: counts.pending,  tone: 'text-warning',          active: 'border-warning ring-1 ring-warning/30' },
    { key: 'approved', label: 'Publicadas',       n: counts.approved, tone: 'text-success',          active: 'border-success ring-1 ring-success/30' },
    { key: 'rejected', label: 'Rechazadas',       n: counts.rejected, tone: 'text-muted-foreground', active: 'border-border-mid ring-1 ring-border' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[14px] font-semibold text-foreground">Reseñas</span>
          <ReviewsTabs badge={counts.pending} />
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(WP_SECRET_KEY); setAuthed(false); setAdminKey(''); }}
          className="text-[11px] text-muted-foreground/70 hover:text-foreground/80 px-2 py-1 rounded hover:bg-muted"
        >
          Salir
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-5">
        <div className="mb-4">
          <h1 className="text-[18px] font-bold text-foreground leading-tight">Listado de reseñas</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Gestioná todas las reseñas de la tienda: publicá, rechazá y respondé desde acá.</p>
        </div>

        {/* Tarjetas de estado (clickeables, filtran) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {cards.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setStatus(c.key)}
              className={`text-left bg-card rounded-lg border p-4 transition-colors ${status === c.key ? c.active : 'border-border hover:border-border-mid'}`}
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium">{c.label}</div>
              <div className={`text-[26px] font-bold leading-none mt-2 tabular-nums ${c.tone}`}>{c.n}</div>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-lg border border-border p-3 mb-4 space-y-2">
          <input
            type="text"
            className="w-full border border-border rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-border-mid"
            placeholder="Buscar por autor, producto, contenido o número de pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <select value={status} onChange={e => setStatus(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-border-mid">
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Publicadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
            <select value={stars} onChange={e => setStars(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-border-mid">
              <option value="">Todas las calificaciones</option>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrella{n === 1 ? '' : 's'}</option>)}
            </select>
            <select value={period} onChange={e => setPeriod(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-border-mid">
              <option value="">Todo el período</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-border-mid">
              <option value="recent">Más recientes</option>
              <option value="oldest">Más antiguas</option>
              <option value="top">Mejor calificadas</option>
              <option value="low">Peor calificadas</option>
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={photos} onChange={e => setPhotos(e.target.checked)} className="accent-foreground" />
              Con fotos
            </label>
            {hasFilters && (
              <button
                onClick={() => { setStars(''); setSearch(''); setPeriod(''); setSort('recent'); setPhotos(false); }}
                className="ml-auto text-[11px] text-muted-foreground/70 hover:text-foreground underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className={`mb-3 px-3 py-2 rounded-lg text-[12px] ${msg.startsWith('✓') ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive'}`}>
            {msg}
          </div>
        )}

        {/* Barra de selección */}
        {selected.size > 0 && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-card border border-foreground/30 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold text-foreground">{selected.size} seleccionada{selected.size === 1 ? '' : 's'}</span>
            <span className="text-muted-foreground">·</span>
            <button onClick={() => doBulk([...selected], 'approve')} disabled={bulkBusy} className="font-semibold text-primary-foreground bg-primary rounded-md px-2.5 py-1 hover:opacity-90 disabled:opacity-40">Publicar</button>
            <button onClick={() => setConfirm({ ids: [...selected], action: 'reject' })} disabled={bulkBusy} className="font-semibold text-destructive border border-destructive/40 rounded-md px-2.5 py-1 hover:bg-destructive/10 disabled:opacity-40">Rechazar</button>
            <button onClick={() => setConfirm({ ids: [...selected], action: 'pending' })} disabled={bulkBusy} className="font-semibold text-muted-foreground border border-border rounded-md px-2.5 py-1 hover:text-foreground disabled:opacity-40">Pasar a pendiente</button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground/70 hover:text-foreground underline">Deseleccionar</button>
          </div>
        )}

        {/* Listado */}
        {loading ? (
          <div className="text-center py-20 text-[13px] text-muted-foreground/70 animate-pulse">Cargando reseñas...</div>
        ) : rows.length === 0 ? (
          <div className="bg-card rounded-lg border border-border text-center py-20 px-4">
            <div className="text-[28px] text-muted-foreground/40 leading-none mb-2">☆</div>
            <p className="text-[14px] font-semibold text-foreground">
              {status === 'pending' && !hasFilters ? 'No hay reseñas pendientes' : 'No se encontraron reseñas'}
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              {status === 'pending' && !hasFilters ? 'Las nuevas aparecen acá apenas un cliente las deja.' : 'Probá ajustando los filtros de búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <input
                type="checkbox"
                aria-label="Seleccionar todas"
                checked={rows.length > 0 && selected.size === rows.length}
                onChange={toggleAll}
                className="accent-foreground"
              />
              <span>{total} reseña{total === 1 ? '' : 's'}</span>
              <span className="ml-auto normal-case tracking-normal font-normal">Página {page} de {totalPages}</span>
            </div>

            {rows.map((r, idx) => {
              const isBusy = busyId === r.id;
              const isReplying = replyFor === r.id;
              return (
                <div
                  key={r.id}
                  className={`flex gap-3 px-4 py-4 border-b border-border hover:bg-muted/30 transition-colors ${idx === rows.length - 1 ? 'border-b-0' : ''} ${selected.has(r.id) ? 'bg-muted/40' : ''}`}
                >
                  <div className="pt-1">
                    <input type="checkbox" aria-label={`Seleccionar reseña de ${r.author_name}`} checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="accent-foreground" />
                  </div>

                  {/* Producto */}
                  <div className="w-14 flex-shrink-0">
                    <div className="w-14 h-14 rounded-md bg-muted overflow-hidden border border-border">
                      {r.product.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.product.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                  </div>

                  {/* Cuerpo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Stars rating={r.rating} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${STATUS_TONE[r.status]}`}>{r.status_label}</span>
                      {r.verified && <span className="text-[10px] font-medium text-success bg-success-soft rounded-full px-2 py-0.5">Compra verificada</span>}
                      {r.photos.length > 0 && <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">{r.photos.length} foto{r.photos.length === 1 ? '' : 's'}</span>}
                      <span className="text-[11px] text-muted-foreground/70">{fmtDate(r.date)}</span>
                    </div>

                    <div className="mt-1 text-[12px] text-muted-foreground flex flex-wrap items-center gap-x-1.5">
                      <span className="font-semibold text-foreground">{r.author_name || 'Sin nombre'}</span>
                      {r.author_email && <span className="truncate">· {r.author_email}</span>}
                      <span>· {r.source_label}</span>
                    </div>

                    <div className="mt-1 text-[12px] text-muted-foreground flex flex-wrap items-center gap-x-1.5">
                      {r.product.slug ? (
                        <a href={`/producto/${r.product.slug}`} target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:underline truncate max-w-[360px]">{r.product.name}</a>
                      ) : (
                        <span className="text-foreground/80 truncate max-w-[360px]">{r.product.name}</span>
                      )}
                      {r.order_number && r.order_id && (
                        <>
                          <span>·</span>
                          <Link href={`/admin/pedidos/${r.order_id}`} className="hover:underline">Pedido #{r.order_number}</Link>
                        </>
                      )}
                      {r.request_id && (
                        <>
                          <span>·</span>
                          <Link href={`/admin/reviews/${r.request_id}`} className="hover:underline">Solicitud</Link>
                        </>
                      )}
                    </div>

                    <p className="mt-2 text-[13px] text-foreground leading-relaxed whitespace-pre-line">{r.text || <span className="text-muted-foreground/60 italic">Sin comentario, solo calificación.</span>}</p>

                    {r.photos.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {r.photos.map(p => (
                          <button key={p.id} type="button" onClick={() => setLightbox(p.full)} className="w-16 h-16 rounded-md overflow-hidden border border-border bg-muted hover:opacity-90">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Respuesta de la tienda */}
                    {isReplying ? (
                      <div className="mt-3 border border-border rounded-lg p-3 bg-background">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Respuesta de HYPE</label>
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          rows={3}
                          maxLength={1500}
                          autoFocus
                          placeholder="Gracias por tu reseña..."
                          className="mt-1 w-full border border-border rounded-md px-3 py-2 text-[13px] bg-card focus:outline-none focus:border-border-mid"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => saveReply(r, replyText)} disabled={replyBusy || !replyText.trim()} className="text-[12px] font-semibold bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-40">
                            {replyBusy ? 'Guardando...' : r.reply ? 'Guardar cambios' : 'Publicar respuesta'}
                          </button>
                          {r.reply && (
                            <button onClick={() => saveReply(r, '')} disabled={replyBusy} className="text-[12px] font-semibold text-destructive border border-destructive/40 rounded-md px-3 py-1.5 hover:bg-destructive/10 disabled:opacity-40">
                              Borrar respuesta
                            </button>
                          )}
                          <button onClick={() => { setReplyFor(null); setReplyText(''); }} disabled={replyBusy} className="text-[12px] text-muted-foreground hover:text-foreground px-2 py-1.5">Cancelar</button>
                          <span className="ml-auto text-[11px] text-muted-foreground/60">{replyText.length}/1500</span>
                        </div>
                      </div>
                    ) : r.reply ? (
                      <div className="mt-3 border-l-2 border-foreground/30 pl-3">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-semibold uppercase tracking-wide">Respuesta de HYPE</span>
                          <span>{fmtDate(r.reply.date)}</span>
                          <button onClick={() => openReply(r)} className="underline hover:text-foreground">Editar</button>
                        </div>
                        <p className="text-[12.5px] text-foreground/80 leading-relaxed mt-0.5 whitespace-pre-line">{r.reply.text}</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {actionsFor(r.status).map(a => (
                      <ActionButton key={a} action={a} busy={isBusy} onClick={() => requestAction(r, a)} small />
                    ))}
                    {!isReplying && !r.reply && (
                      <button onClick={() => openReply(r)} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 whitespace-nowrap">
                        Responder
                      </button>
                    )}
                    {r.wp_admin_edit_url && (
                      <a href={r.wp_admin_edit_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground/60 hover:text-foreground mt-1">
                        Editar en WP
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed">
              ← Anterior
            </button>
            <span className="text-[12px] text-muted-foreground">Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed">
              Siguiente →
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'reject'
          ? (confirm.ids.length === 1 ? '¿Rechazar esta reseña?' : `¿Rechazar ${confirm.ids.length} reseñas?`)
          : (confirm?.ids.length === 1 ? '¿Pasar esta reseña a pendiente?' : `¿Pasar ${confirm?.ids.length} reseñas a pendiente?`)}
        body={confirm?.action === 'reject'
          ? 'Deja de verse en la tienda. Queda en Rechazadas y se puede volver a publicar más adelante.'
          : 'Deja de verse en la tienda hasta que se vuelva a publicar.'}
        confirmLabel={confirm?.action === 'reject' ? 'Rechazar' : 'Pasar a pendiente'}
        tone={confirm?.action === 'reject' ? 'critical' : 'default'}
        busy={bulkBusy || !!busyId}
        onConfirm={confirmAction}
        onClose={() => !bulkBusy && setConfirm(null)}
      />

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-md" />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[13px] text-muted-foreground/70">Cargando...</div>}>
      <ModeracionPage />
    </Suspense>
  );
}
