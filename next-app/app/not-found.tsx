import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">404</p>
      <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-4">Página no encontrada</h1>
      <p className="text-[14px] text-muted-foreground mb-8">La página que buscás no existe o fue movida.</p>
      <Button asChild variant="hype" size="cta">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
