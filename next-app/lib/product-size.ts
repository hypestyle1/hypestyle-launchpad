// Algunos productos (ej. HStars) tienen más atributos de variación aparte del talle
// (FIT, size-guide con la URL de la imagen de guía). Antes varios endpoints admin
// juntaban las opciones de TODOS los atributos con " / ", así que un talle
// terminaba mostrándose (y guardándose en el pedido) como "S / https://...jpg".
// Esta función busca puntualmente el atributo "Talle" y, si no existe, toma la
// primera opción que no sea una URL — nunca una guía de talles ni una imagen.
export function sizeFromAttributes(attributes: { name?: string; option?: string }[]): string {
  const talle = attributes.find(a => (a.name || '').toLowerCase() === 'talle');
  if (talle?.option) return talle.option;
  const first = attributes.find(a => a.option && !/^https?:\/\//i.test(a.option));
  return first?.option || '';
}
