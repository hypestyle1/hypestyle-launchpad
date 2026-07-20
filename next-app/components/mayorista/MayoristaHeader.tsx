'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMayoristaCart } from '@/context/MayoristaCartContext';

export default function MayoristaHeader() {
  const router = useRouter();
  const { count } = useMayoristaCart();

  async function logout() {
    await fetch('/api/mayorista/logout', { method: 'POST' });
    router.push('/mayoristas/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10 sticky top-0 z-20 bg-black/95 backdrop-blur">
      <Link href="/mayoristas" className="text-lg font-bold tracking-tight">
        Hype<span className="text-white/40">.</span> <span className="text-[11px] font-normal uppercase tracking-[0.2em] text-white/40 ml-1">Mayoristas</span>
      </Link>
      <nav className="flex items-center gap-4 text-[12px] uppercase tracking-wide">
        <Link href="/mayoristas/carrito" className="text-white/70 hover:text-white transition-colors">
          Pedido{count > 0 ? ` (${count})` : ''}
        </Link>
        <button onClick={logout} className="text-white/40 hover:text-white transition-colors">
          Salir
        </button>
      </nav>
    </header>
  );
}
