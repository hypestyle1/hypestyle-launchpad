'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMayoristaCart } from '@/context/MayoristaCartContext';

const glassBar = {
  background: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(32px) saturate(200%)',
  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
} as React.CSSProperties;

export default function MayoristaHeader() {
  const router = useRouter();
  const { count } = useMayoristaCart();

  async function logout() {
    await fetch('/api/mayorista/logout', { method: 'POST' });
    router.push('/mayoristas/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between px-5 sm:px-8 py-4 sticky top-0 z-20" style={glassBar}>
      <Link href="/mayoristas" className="flex items-center gap-2.5">
        <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-5 w-auto" />
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/40 hidden sm:inline">Mayoristas</span>
      </Link>
      <nav className="flex items-center gap-5 text-[12px] uppercase tracking-wide">
        <Link href="/mayoristas/carrito" className="text-foreground/70 hover:text-foreground transition-colors">
          Pedido{count > 0 ? ` (${count})` : ''}
        </Link>
        <button onClick={logout} className="text-foreground/40 hover:text-foreground transition-colors">
          Salir
        </button>
      </nav>
    </header>
  );
}
