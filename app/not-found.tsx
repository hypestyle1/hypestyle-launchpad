import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">404</p>
      <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-4">Página no encontrada</h1>
      <p className="text-[14px] text-muted-foreground mb-8">La página que buscás no existe o fue movida.</p>
      <Link href="/" className="bg-bg-dark text-primary-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors">
        Volver al inicio
      </Link>
    </div>
  );
}
