// Categorías de la colección SS27 — fuente única de los tests por regex.
// Las usa el feed del home (Ss27Feed) y la landing /colecciones/ss27: así el
// índice sticky de los dos lugares agrupa igual y un producto nuevo cae en la
// misma sección en ambos sin tocar dos archivos.
export type Ss27Categoria = {
  id: string;
  label: string;
  /** Recibe `${category} ${name}` en minúsculas. */
  test: (cat: string) => boolean;
};

// Orden: de lo más caro a lo más barato de la colección (hoodies primero,
// accesorios al final). "Accesorios" es el colector: lo que no matchea ninguna
// otra cae ahí y nunca desaparece.
export const SS27_CATEGORIAS: Ss27Categoria[] = [
  { id: 'hoodies', label: 'Hoodies', test: (c) => /hoodie/.test(c) },
  { id: 'remeras', label: 'Remeras', test: (c) => /\btee\b|polo|remera/.test(c) && !/longsleeve/.test(c) },
  { id: 'longsleeves', label: 'Longsleeves', test: (c) => /longsleeve/.test(c) },
  { id: 'mas', label: 'Accesorios', test: () => true },
];
