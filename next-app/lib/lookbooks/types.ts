/**
 * Lookbooks: una página por shooting profesional de colección (ver el menú
 * Colecciones del navbar). Cada uno es una lista de bloques con fotos y, debajo
 * de cada foto, el producto que lleva puesto con el acceso directo a la ficha.
 * Sin `href` cuando la pieza todavía no está cargada en Woo ("Próximamente").
 */
export type Producto = { producto: string; href?: string };

export type Foto = Producto & { n: string };

export type Bloque =
  | { tipo: 'full'; foto: Foto }           // horizontal a sangre (3:2)
  | { tipo: 'uno'; foto: Foto }            // una vertical sola, centrada (4:5)
  | { tipo: 'tres'; fotos: [Foto, Foto, Foto] } // fila de tres en 4:5
  | { tipo: 'dos'; fotos: [Foto, Foto] };  // par alto en 9:16

export type Lookbook = {
  /** Carpeta en public/ donde viven los webp: `/lookbook-fw26/book`. */
  dir: string;
  eyebrow: string;
  title: string;
  intro: string;
  bloques: Bloque[];
};

export const foto = (n: string, p: Producto): Foto => ({ n, ...p });
