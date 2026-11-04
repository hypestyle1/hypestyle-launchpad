import CyberRevealCountdown from './CyberRevealCountdown';
import DropShowcase from '@/components/drops/DropShowcase';
import type { CyberDropPublico } from '@/lib/cyber-cartelera';

/* LOS DROPS — los lanzamientos del evento, con el camo como protagonista.

   La sección entera usa el beige de los mockups (#E7E6DF): las prendas se
   apoyan sobre la página, sin marcos. Cada drop se arma con DropShowcase
   (components/drops): el camo como `principal`, el Raglan como `secundaria`.

   Links: cada prenda trae su href ya resuelto por `piezaPublica` (solo si
   está publicada en Woo). El CTA del camo lo sigue gobernando
   PREVENTA_ZIP_CAMO: apagado, "PRÓXIMAMENTE" deshabilitado.

   Componente de SERVIDOR: recibe la vista saneada (dropsPublicos). Un drop
   bloqueado llega SIN producto. */

export default function CyberDrops({ drops }: { drops: CyberDropPublico[] }) {
  const esPreventa = (d: CyberDropPublico) => d.estado === 'revelado' && !!d.producto?.preventa;
  const hero = drops.find(esPreventa);
  const resto = drops.filter((d) => !esPreventa(d));

  return (
    <section id="drops" className="bg-[#e7e6df] px-4 pb-8 pt-9 text-[#0a0a0a] md:px-10 md:pb-14 md:pt-14">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="border-b border-[#0a0a0a]/15 pb-3 text-[12px] font-black uppercase tracking-[0.24em] md:pb-4 md:text-[13px]">
          Los drops
        </h2>

        {hero?.producto && (
          <div className="mt-6 md:mt-10">
            <DropShowcase
              jerarquia="principal"
              eyebrow={`Drop ${hero.id} · Preventa`}
              titulo={hero.producto.nombre}
              datos={[
                { label: 'Colores', valor: 'Olive · Brown' },
                { label: 'Entrega estimada', valor: 'Vie 13/11' },
              ]}
              piezas={hero.producto.piezas ?? []}
              cta={
                hero.producto.href
                  ? { label: 'Ver colección', href: hero.producto.href }
                  : { label: 'Próximamente', href: null }
              }
            />
          </div>
        )}

        {resto.map((d) => (
          <div key={d.id} className="mt-8 border-t border-[#0a0a0a]/15 pt-6 md:mt-14 md:pt-10">
            {d.estado === 'revelado' && d.producto?.piezas?.length ? (
              <DropShowcase
                jerarquia="secundaria"
                eyebrow={`Drop ${d.id} · Disponible`}
                titulo={d.producto.nombre}
                piezas={d.producto.piezas}
                cta={d.producto.href ? { label: 'Ver todos', href: d.producto.href } : undefined}
              />
            ) : (
              <p className="text-[15px] font-black uppercase tracking-[0.01em] text-[#0a0a0a]/45">
                Drop {d.id} · Por revelar ·{' '}
                {d.estado === 'bloqueado' ? <CyberRevealCountdown targetIso={d.revealAt} /> : d.producto?.nombre}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
