// Navegación del panel: única fuente para el sidebar (AdminShell) y el
// command palette. Separada del shell para que ambos la importen sin ciclos.

import type { LucideIcon } from 'lucide-react';
import {
  Home, Package, PackagePlus, Calculator, Store, MessageSquare,
  Users, Star, Mail, BarChart3, UserCog, ListChecks, Settings,
  Wallet, TrendingUp, SlidersHorizontal, Bot, Receipt,
} from 'lucide-react';

export type Seccion =
  | 'pedidos' | 'costos' | 'mayoristas' | 'creadores'
  | 'reviews' | 'newsletter' | 'conversaciones' | 'email-metrics' | 'perfiles';

export type NavItem = { label: string; href: string; seccion: Seccion; match: string; Icono: LucideIcon };
export type NavGrupo = { titulo: string; items: NavItem[] };

export const INICIO: NavItem = { label: 'Inicio', href: '/admin', seccion: 'pedidos', match: '/admin', Icono: Home };

export const GRUPOS: NavGrupo[] = [
  {
    titulo: 'Ventas',
    items: [
      { label: 'Pedidos', href: '/admin/pedidos', seccion: 'pedidos', match: '/admin/pedidos', Icono: Package },
    ],
  },
  {
    titulo: 'Finanzas',
    items: [
      { label: 'Resumen', href: '/admin/finance', seccion: 'costos', match: '/admin/finance', Icono: Wallet },
      { label: 'Rentabilidad', href: '/admin/finance/rentabilidad', seccion: 'costos', match: '/admin/finance/rentabilidad', Icono: TrendingUp },
      { label: 'Costos y márgenes', href: '/admin/costos', seccion: 'costos', match: '/admin/costos', Icono: Calculator },
      { label: 'Costos operativos', href: '/admin/finance/operating-costs', seccion: 'costos', match: '/admin/finance/operating-costs', Icono: Receipt },
      { label: 'Configuración', href: '/admin/finance/config', seccion: 'costos', match: '/admin/finance/config', Icono: SlidersHorizontal },
    ],
  },
  {
    titulo: 'Operaciones',
    items: [
      { label: 'Bot', href: '/admin/bot', seccion: 'conversaciones', match: '/admin/bot', Icono: Bot },
    ],
  },
  {
    titulo: 'Clientes',
    items: [
      { label: 'Locales', href: '/admin/mayoristas', seccion: 'mayoristas', match: '/admin/mayoristas', Icono: Store },
      { label: 'Conversaciones', href: '/admin/conversaciones', seccion: 'conversaciones', match: '/admin/conversaciones', Icono: MessageSquare },
    ],
  },
  {
    titulo: 'Contenido',
    items: [
      { label: 'Creadores', href: '/admin/creadores', seccion: 'creadores', match: '/admin/creadores', Icono: Users },
      { label: 'Reseñas', href: '/admin/reviews', seccion: 'reviews', match: '/admin/reviews', Icono: Star },
    ],
  },
  {
    titulo: 'Marketing',
    items: [
      { label: 'Newsletter', href: '/admin/newsletter', seccion: 'newsletter', match: '/admin/newsletter', Icono: Mail },
      { label: 'Métricas de email', href: '/admin/email-metrics', seccion: 'email-metrics', match: '/admin/email-metrics', Icono: BarChart3 },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      { label: 'Perfiles', href: '/admin/perfiles', seccion: 'perfiles', match: '/admin/perfiles', Icono: UserCog },
    ],
  },
];

// Acciones rápidas del command palette. Solo rutas que existen hoy — dos de
// ellas (tandas y settings de reseñas) eran inalcanzables desde la UI.
export const ACCIONES: NavItem[] = [
  { label: 'Cargar pedido manual', href: '/admin/pedidos/nuevo', seccion: 'pedidos', match: '', Icono: PackagePlus },
  { label: 'Nueva tanda de reseñas', href: '/admin/reviews/nueva-tanda', seccion: 'reviews', match: '', Icono: ListChecks },
  { label: 'Configuración de reseñas', href: '/admin/reviews/settings', seccion: 'reviews', match: '', Icono: Settings },
];
