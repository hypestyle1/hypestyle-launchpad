import { Suspense } from 'react';
import SeguimientoClient from './SeguimientoClient';

export const metadata = { title: 'Seguimiento de pedido — Hypestyle' };

export default function SeguimientoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Cargando...</p></div>}>
      <SeguimientoClient />
    </Suspense>
  );
}
