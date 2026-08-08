/**
 * Emite structured data: un <script type="application/ld+json"> por entidad.
 *
 * Server component a propósito: el structured data tiene que estar en el HTML
 * que sirve el servidor, que es lo que lee el crawler en la primera pasada.
 *
 * Un bloque por entidad, y no un array ni un `@graph`, porque en esas dos
 * formas el objeto raíz del script queda sin `@type` y hay parsers que
 * directamente no reconocen el contenido. Google acepta las tres, pero también
 * fusiona todos los bloques de la página, así que las referencias por `@id`
 * entre entidades (ej. Offer.seller apuntando a la Organization) siguen
 * resolviendo aunque estén en scripts separados.
 *
 * El escape de "<" evita que un "</script>" dentro de un dato de WooCommerce
 * (nombre o descripción de producto) cierre el tag antes de tiempo.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
