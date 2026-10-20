'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Producto {
  id: number;
  name: string;
  slug: string;
  images: string[];
  video: string | null;
}

function dlUrl(src: string) {
  return `/api/mayorista/contenido/descargar?src=${encodeURIComponent(src)}`;
}

function basename(src: string) {
  try {
    return decodeURIComponent(new URL(src).pathname.split('/').pop() || 'archivo');
  } catch {
    return 'archivo';
  }
}

export default function MayoristaContenido() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  // Progreso del zip por producto: "3/8" mientras junta fotos, null en reposo.
  const [zipping, setZipping] = useState<Record<number, string | null>>({});

  useEffect(() => {
    fetch('/api/mayorista/contenido')
      .then(res => res.ok ? res.json() : null)
      .then(data => setProductos(data?.products ?? []))
      .catch(() => setProductos([]));
  }, []);

  async function descargarZip(p: Producto) {
    if (zipping[p.id]) return;
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (let i = 0; i < p.images.length; i++) {
        setZipping(s => ({ ...s, [p.id]: `${i + 1}/${p.images.length}` }));
        const res = await fetch(dlUrl(p.images[i]));
        if (!res.ok) throw new Error('fetch');
        const ext = basename(p.images[i]).split('.').pop() || 'jpg';
        zip.file(`${p.slug}-${String(i + 1).padStart(2, '0')}.${ext}`, await res.blob());
      }
      setZipping(s => ({ ...s, [p.id]: 'Comprimiendo…' }));
      // STORE: las fotos ya vienen comprimidas, deflate solo suma tiempo.
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `hype-${p.slug}-fotos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    } catch {
      alert('No se pudo armar el zip. Probá descargar las fotos de a una.');
    } finally {
      setZipping(s => ({ ...s, [p.id]: null }));
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Contenido</h1>
      <p className="text-[13px] text-muted-foreground mt-1">
        Fotos en alta y videos de los productos que ya recibiste, listos para tus redes y tu local.
      </p>

      {productos === null && <p className="text-[13px] text-muted-foreground mt-6">Cargando…</p>}

      {productos !== null && productos.length === 0 && (
        <div className="mt-6 rounded-[16px] border border-border bg-bg-alt/50 p-10 text-center">
          <p className="text-[15px] font-semibold">Todavía no hay contenido disponible</p>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-sm mx-auto">
            El contenido de cada producto se habilita cuando tu pedido figura entregado.
          </p>
          <Button asChild variant="hype" size="cta" className="mt-6 py-3 rounded-full">
            <Link href="/mayoristas/pedidos">Ver mis pedidos</Link>
          </Button>
        </div>
      )}

      {productos && productos.length > 0 && (
        <div className="mt-6 space-y-3">
          {productos.map((p) => {
            const open = abierto === p.id;
            return (
              <div key={p.id} className="rounded-[12px] border border-border overflow-hidden">
                <button
                  onClick={() => setAbierto(open ? null : p.id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                  aria-expanded={open}
                >
                  {p.images[0] && (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      loading="lazy"
                      className="w-14 h-14 object-cover rounded-[8px] border border-border shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold truncate">{p.name}</p>
                    <p className="text-[12px] text-text-light mt-0.5">
                      {p.images.length} foto{p.images.length !== 1 ? 's' : ''}{p.video ? ' · 1 video' : ''}
                    </p>
                  </div>
                  <span className={`text-[12px] text-foreground/40 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                </button>

                {open && (
                  <div className="px-3 pb-3 border-t border-border pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="hype"
                        size="sm"
                        className="rounded-full text-[12px]"
                        disabled={!!zipping[p.id]}
                        onClick={() => descargarZip(p)}
                      >
                        {zipping[p.id] ? `Descargando ${zipping[p.id]}` : 'Descargar todas las fotos (.zip)'}
                      </Button>
                      {p.video && (
                        <Button asChild variant="outline" size="sm" className="rounded-full text-[12px]">
                          <a href={dlUrl(p.video)} download>Descargar video</a>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                      {p.images.map((src, i) => (
                        <a
                          key={src}
                          href={dlUrl(src)}
                          download
                          className="relative group block aspect-square rounded-[8px] overflow-hidden border border-border"
                          title={`Descargar foto ${i + 1}`}
                        >
                          <img
                            src={src}
                            alt={`${p.name} — foto ${i + 1}`}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            ↓
                          </span>
                        </a>
                      ))}
                      {p.video && (
                        <div className="relative aspect-square rounded-[8px] overflow-hidden border border-border bg-black">
                          <video
                            src={p.video}
                            muted
                            playsInline
                            preload="metadata"
                            controls
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
