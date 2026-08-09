import ResenaClient from './ResenaClient';

// Página de uso puntual (link directo por mail o por pedido), sin valor en
// búsqueda. follow para no cortar el flujo de link equity hacia el resto.
// El noindex solo lo lee Google si la ruta NO está en Disallow (robots.txt).
export const metadata = {
  title: 'Dejá tu reseña — Hypestyle',
  robots: { index: false, follow: true },
};

export default function ResenaPage() {
  return <ResenaClient />;
}
