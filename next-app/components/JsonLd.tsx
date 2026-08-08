/**
 * Emite un bloque <script type="application/ld+json">.
 *
 * Server component a propósito: el structured data tiene que estar en el HTML
 * que sirve el servidor, que es lo que lee el crawler en la primera pasada.
 *
 * El escape de "<" evita que un "</script>" dentro de un dato de WooCommerce
 * (nombre o descripción de producto) cierre el tag antes de tiempo.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
