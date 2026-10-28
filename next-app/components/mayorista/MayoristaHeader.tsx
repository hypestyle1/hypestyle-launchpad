'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMayoristaCart, forgetMayoristaUser } from '@/context/MayoristaCartContext';
import MayoristaMinBar from './MayoristaMinBar';
import MayoristaDivisaSelector from './MayoristaDivisaSelector';
import { useMayoristaPerfil } from '@/context/MayoristaPerfilContext';

const glassBar = {
  background: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(32px) saturate(200%)',
  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
} as React.CSSProperties;

export default function MayoristaHeader() {
  const router = useRouter();
  const { count, total, hydrated, clear } = useMayoristaCart();
  // Nombre del local y pedido mínimo salen del perfil que ya cargó el
  // layout (context/MayoristaPerfilContext): una sola consulta para todo el portal.
  const { name, minOrder, consignacion } = useMayoristaPerfil();

  async function logout() {
    await fetch('/api/mayorista/logout', { method: 'POST' });
    // El pedido en curso no queda para el próximo que use este navegador
    // (los borradores guardados en la cuenta sí siguen).
    clear();
    forgetMayoristaUser();
    router.push('/mayoristas/login');
    router.refresh();
  }

  // Mobile: links cortos, separación de 12 px y 44 px de alto táctil; la barra
  // de mínimo va como franja debajo (en el header no entra).
  const link = 'inline-flex items-center min-h-[44px] text-foreground/70 hover:text-foreground transition-colors';

  return (
    <header className="sticky top-0 z-20" style={glassBar}>
      <div className="flex items-center justify-between px-5 sm:px-8 py-2 md:py-4">
        <Link href="/mayoristas" className="flex items-center gap-2.5 min-h-[44px]">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-5 w-auto" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/40 hidden sm:inline">{consignacion ? 'Consignación' : 'Mayoristas'}</span>
        </Link>
        <nav className="flex items-center gap-3 md:gap-5 text-[11px] md:text-[12px] uppercase tracking-wide">
          {hydrated && count > 0 && <MayoristaMinBar total={total} minOrder={minOrder} compact />}
          {/* En mobile no entra en la fila de links: va en la franja de abajo. */}
          <MayoristaDivisaSelector className="hidden md:inline-flex" />
          {name && (
            <Link href="/mayoristas/cuenta" className="text-foreground/50 normal-case tracking-normal hidden sm:inline hover:text-foreground transition-colors">
              {name}
            </Link>
          )}
          <Link href="/mayoristas/como-funciona" className="text-foreground/50 hover:text-foreground transition-colors hidden md:inline">
            Cómo funciona
          </Link>
          <Link href="/mayoristas/pedidos" className={link}>
            <span className="md:hidden">Pedidos</span><span className="hidden md:inline">Mis pedidos</span>
          </Link>
          {/* En mobile no entra; el acceso ahí es desde cada pedido entregado. */}
          <Link href="/mayoristas/contenido" className={`${link} hidden sm:inline-flex`}>
            Contenido
          </Link>
          <Link href="/mayoristas/carrito" className={link}>
            Pedido{count > 0 ? ` (${count})` : ''}
          </Link>
          <Link href="/mayoristas/cuenta" className={`${link} sm:hidden`}>
            Cuenta
          </Link>
          <button onClick={logout} className="inline-flex items-center min-h-[44px] text-foreground/40 hover:text-foreground transition-colors">
            Salir
          </button>
        </nav>
      </div>
      {hydrated && count > 0 && <MayoristaMinBar total={total} minOrder={minOrder} strip />}
      <div className="md:hidden flex items-center justify-end gap-2 px-5 py-1 border-t border-border/60 bg-background/80">
        <span className="text-[10px] uppercase tracking-wide text-foreground/45">Precios en</span>
        <MayoristaDivisaSelector />
      </div>
    </header>
  );
}
