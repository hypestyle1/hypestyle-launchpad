/**
 * Posters de los videos 360 de las fichas: el primer cuadro de cada video, en
 * public/ficha/360/<nombre>.webp (1080x1350, ~100 KB).
 *
 * El video 360 es lo primero que se ve en la ficha (y el LCP), viene de
 * WordPress y sin poster: hasta que llegaba el primer cuadro el lugar quedaba
 * vacío (LCP 3,7-4 s en mobile, 11/10). Con el poster se pinta enseguida y el
 * video arranca encima con el mismo cuadro, sin salto.
 *
 * La clave es el nombre del archivo del video en WordPress. Un video nuevo sin
 * poster acá se ve igual que antes. Para sumar uno: sacar el primer cuadro
 * (ffmpeg -i <url> -frames:v 1 x.png), pasarlo a webp y agregarlo a la lista.
 */
const CON_POSTER = new Set([
  'athletic-dept-blue-longsleeve-360',
  'athletic-dept-navy-tee-360',
  'athletic-dept-pink-longsleeve-360',
  'athletic-dept-washed-grey-polo-360',
  'athletic-dept-white-tee-360',
  'department-of-culture-washed-black-waffle-longsleeve-360',
  'h-hype-navy-tee-360',
  'h-hype-white-tee-360',
  'hs-crest-olive-raglan-longsleeve-360',
  'hype-dept-cross-white-waffle-longsleeve-360',
  'hype-distressed-grey-hoodie-360',
  'hype-distressed-grey-hoodie-mujer-360',
  'hype-washed-black-waffle-longsleeve-360',
  'style-culture-university-black-tee-360',
  'style-culture-university-navy-tee-360',
  'style-culture-university-white-tee-360',
  'worn-varsity-club-navy-tee-360',
  'worn-varsity-club-white-tee-360',
  'zolotye-kupola-washed-graphite-hoodie-360',
]);

export function videoPoster(src: string): string | undefined {
  const nombre = src.split('/').pop()?.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, '');
  return nombre && CON_POSTER.has(nombre) ? `/ficha/360/${nombre}.webp` : undefined;
}
