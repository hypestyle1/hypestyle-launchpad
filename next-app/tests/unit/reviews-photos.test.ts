import { describe, expect, it } from 'vitest';
import { ACCEPTED_TYPES, MAX_EDGE, MAX_INPUT_BYTES, MAX_PHOTOS, fitWithin, validatePhotoFile } from '@/lib/reviews/photos';

describe('validatePhotoFile', () => {
  const jpg = { type: 'image/jpeg', size: 2_000_000, name: 'IMG_1.jpg' };

  it('acepta una foto normal', () => {
    expect(validatePhotoFile(jpg, 0)).toEqual({ ok: true });
  });

  it('corta al llegar al tope por producto', () => {
    expect(validatePhotoFile(jpg, MAX_PHOTOS).ok).toBe(false);
    expect(validatePhotoFile(jpg, MAX_PHOTOS - 1).ok).toBe(true);
  });

  it('rechaza archivos vacíos o gigantes', () => {
    expect(validatePhotoFile({ ...jpg, size: 0 }, 0).ok).toBe(false);
    expect(validatePhotoFile({ ...jpg, size: MAX_INPUT_BYTES + 1 }, 0).ok).toBe(false);
  });

  it('rechaza lo que no es imagen', () => {
    expect(validatePhotoFile({ type: 'application/pdf', size: 1000 }, 0).ok).toBe(false);
    expect(validatePhotoFile({ type: 'video/mp4', size: 1000 }, 0).ok).toBe(false);
    expect(validatePhotoFile({ type: 'image/svg+xml', size: 1000 }, 0).ok).toBe(false);
  });

  it('deja pasar type vacío (Android con HEIC) y todos los aceptados', () => {
    expect(validatePhotoFile({ type: '', size: 1000 }, 0).ok).toBe(true);
    for (const type of ACCEPTED_TYPES) {
      expect(validatePhotoFile({ type, size: 1000 }, 0).ok).toBe(true);
    }
  });
});

describe('fitWithin', () => {
  it('no agranda una foto chica', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('reduce por el lado mayor manteniendo proporción', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_EDGE, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: MAX_EDGE });
  });

  it('acepta un maxEdge distinto y no rompe con dimensiones inválidas', () => {
    expect(fitWithin(1000, 500, 100)).toEqual({ width: 100, height: 50 });
    expect(fitWithin(0, 500)).toEqual({ width: 0, height: 0 });
  });
});
