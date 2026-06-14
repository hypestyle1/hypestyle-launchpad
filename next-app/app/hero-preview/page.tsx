import HeroLaNuestra from '@/components/HeroLaNuestra';

// Ruta temporal solo para previsualizar el hero de LA NUESTRA.
// No está enlazada en el sitio; sirve para verlo aislado en /hero-preview.
export default function HeroPreviewPage() {
  return (
    <>
      <HeroLaNuestra />
      {/* contenido falso para ver el scroll/despinneo después del efecto */}
      <section className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          contenido siguiente del home
        </p>
      </section>
    </>
  );
}
