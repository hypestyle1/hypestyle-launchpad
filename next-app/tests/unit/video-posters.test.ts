import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { videoPoster } from '@/lib/video-posters';

describe('videoPoster', () => {
  it('devuelve el poster local de un video 360 de WordPress', () => {
    const p = videoPoster('https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/10/hype-distressed-grey-hoodie-mujer-360.mp4');
    expect(p).toBe('/ficha/360/hype-distressed-grey-hoodie-mujer-360.webp');
    expect(existsSync(path.join(process.cwd(), 'public', p!))).toBe(true);
  });
  it('sin poster cargado devuelve undefined (el video se ve como antes)', () => {
    expect(videoPoster('https://x/wp-content/uploads/2026/10/otro-video-360.mp4')).toBeUndefined();
    expect(videoPoster('/ss27/banner/01-duo.webp')).toBeUndefined();
  });
  it('ignora la query string', () => {
    expect(videoPoster('https://x/h-hype-navy-tee-360.mp4?v=2')).toBe('/ficha/360/h-hype-navy-tee-360.webp');
  });
});
