'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, ArrowRight, ExternalLink, User } from 'lucide-react';
import { GRUPOS, ACCIONES, INICIO } from './nav';

// Paleta de comandos (Ctrl+K / ⌘K). Navega a secciones y acciones existentes;
// no inventa resultados de entidades que el backend todavía no sabe buscar.
// Sin portal: se monta dentro de .admin-theme para heredar los tokens.

const itemCls =
  'flex items-center gap-2.5 px-3 py-2 text-[13px] text-foreground rounded-md cursor-pointer ' +
  'data-[selected=true]:bg-muted aria-selected:bg-muted';

export function CommandPalette({ open, onClose, secciones }: {
  open: boolean;
  onClose: () => void;
  secciones: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState('');

  useEffect(() => { if (!open) setQ(''); }, [open]);

  if (!open) return null;

  const puede = (s: string) => secciones.includes(s);
  const num = q.trim().match(/^#?(\d{2,})$/);
  const go = (href: string) => { onClose(); router.push(href); };

  const navItems = [INICIO, ...GRUPOS.flatMap(g => g.items)].filter(i => i.href === '/admin' || puede(i.seccion));
  const acciones = ACCIONES.filter(a => puede(a.seccion));

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
    >
      <Command
        label="Buscar en el panel"
        className="bg-card border border-border rounded-lg w-full max-w-lg overflow-hidden shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-3 border-b border-border">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Sección, acción o número de pedido…"
            className="w-full bg-transparent py-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">Esc</kbd>
        </div>
        <Command.List className="max-h-[50vh] overflow-y-auto p-1.5">
          <Command.Empty>
            <p className="text-[12px] text-muted-foreground text-center py-6">Sin resultados para “{q}”.</p>
          </Command.Empty>

          {num && puede('pedidos') && (
            <Command.Group heading="Pedidos" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1">
              <Command.Item value={`pedido-${num[1]} ${q}`} onSelect={() => go(`/admin/pedidos/${num[1]}`)} className={itemCls}>
                <ArrowRight size={14} className="text-muted-foreground" />
                Abrir pedido #{num[1]}
              </Command.Item>
            </Command.Group>
          )}

          <Command.Group heading="Ir a" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1">
            {navItems.map(i => (
              <Command.Item key={i.href} value={`${i.label}`} onSelect={() => go(i.href)} className={itemCls}>
                <i.Icono size={14} className="text-muted-foreground" />
                {i.label}
              </Command.Item>
            ))}
          </Command.Group>

          {acciones.length > 0 && (
            <Command.Group heading="Acciones" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1">
              {acciones.map(a => (
                <Command.Item key={a.href} value={a.label} onSelect={() => go(a.href)} className={itemCls}>
                  <a.Icono size={14} className="text-muted-foreground" />
                  {a.label}
                </Command.Item>
              ))}
              <Command.Item value="Mi cuenta" onSelect={() => go('/admin/cuenta')} className={itemCls}>
                <User size={14} className="text-muted-foreground" />
                Mi cuenta
              </Command.Item>
              <Command.Item value="Ver el sitio" onSelect={() => { onClose(); window.open('/', '_blank'); }} className={itemCls}>
                <ExternalLink size={14} className="text-muted-foreground" />
                Ver el sitio
              </Command.Item>
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
