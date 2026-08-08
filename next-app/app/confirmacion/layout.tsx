import type { Metadata } from 'next';

// Confirmación de compra: contenido por pedido, sin valor en búsqueda.
// follow (y no nofollow) para que el crawler siga los links del navbar y el
// footer hacia las páginas que sí queremos indexadas.
//
// OJO: para que Google llegue a leer este noindex, la ruta NO puede estar
// bloqueada en robots.txt — una URL con Disallow nunca se rastrea y el
// noindex no se lee nunca. Ver public/robots.txt.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
