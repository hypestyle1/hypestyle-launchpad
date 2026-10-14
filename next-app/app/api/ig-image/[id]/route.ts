import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getInstagramPosts } from '@/lib/instagram';
import { IG_IMAGE_WIDTHS } from '@/lib/instagram-image';

export const runtime = 'nodejs';

/**
 * Miniatura de un post del feed de Instagram, al tamaño de la tira del home.
 *
 * Instagram entrega las fotos en tamaño original (hasta 3240x4050, ~3 MB cada
 * una) y la tira las dibuja a 190–240 px: al llegar al pie del home se bajaban
 * ~8,8 MB (auditoría 11/10, PA-02). Las URLs del CDN de Instagram son firmadas y
 * vencen, así que no van por el optimizador de Next (pediría un remotePattern
 * comodín y cachearía URLs muertas).
 *
 * Esta ruta recibe el id del post, no una URL: solo sirve posts que están en el
 * feed actual (no es un proxy abierto). Busca la URL vigente del lado del
 * servidor (el feed ya está cacheado una hora), la recorta cuadrada como la
 * dibuja la tira y la deja en la CDN de Vercel un día.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const w = Number(req.nextUrl.searchParams.get('w'));
  if (!(IG_IMAGE_WIDTHS as readonly number[]).includes(w)) {
    return NextResponse.json({ message: 'Ancho inválido' }, { status: 400 });
  }

  const posts = await getInstagramPosts(50);
  const post = posts?.find((p) => p.id === params.id);
  if (!post) return NextResponse.json({ message: 'Post no encontrado' }, { status: 404 });

  const res = await fetch(post.imageUrl, { cache: 'no-store' });
  if (!res.ok) return NextResponse.json({ message: `Instagram ${res.status}` }, { status: 502 });

  const out = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize({ width: w, height: w, fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();

  return new NextResponse(new Uint8Array(out), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
