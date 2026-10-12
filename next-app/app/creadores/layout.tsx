import { buildMetadata } from '@/lib/seo';

// La página es 'use client' (formulario), así que la metadata va acá. Sin esto
// heredaba el title del layout raíz — el mismo de la home — y no tenía
// canonical. El texto es el mismo que muestra la página.
export const metadata = buildMetadata({
  title: 'Crea contenido con Hype',
  description:
    'Buscamos gente que entienda la marca y quiera construir algo con nosotros. No nos importa cuánta gente te sigue: nos importa lo que hacés y cómo lo hacés.',
  path: '/creadores/',
});

export default function CreadoresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
