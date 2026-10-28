import { describe, it, expect } from 'vitest';
import {
  CYBER_START,
  CYBER_END,
  CYBER_FECHAS,
  cyberEstado,
  cyberProximoHito,
  cyberCapturaAbierta,
} from '@/lib/cyber-hype';
import { PACK_REGULAR_X4_DESDE, PACK_REGULAR_X4_HASTA } from '@/lib/promo-pack-regular';
import { isExcludedPage } from '@/lib/newsletter-popup';

/**
 * Fechas y estado de la landing de CYBER HYPE.
 *
 * El test que más importa es el de coherencia con la ventana del 4 PACK: si la
 * landing y el carrito se separan, la página dice "abrió" mientras el carrito
 * todavía cobra el precio viejo.
 */
describe('CYBER HYPE — fechas', () => {
  it('arranca y termina en el mismo instante que la ventana del 4 PACK', () => {
    expect(Date.parse(CYBER_START)).toBe(PACK_REGULAR_X4_DESDE);
    expect(Date.parse(CYBER_END)).toBe(PACK_REGULAR_X4_HASTA);
  });

  it('abre el 2/11 a las 00:00 ART y cierra el 4/11 a las 23:59', () => {
    expect(new Date(CYBER_START).toISOString()).toBe('2026-11-02T03:00:00.000Z');
    expect(new Date(CYBER_END).toISOString()).toBe('2026-11-05T03:00:00.000Z');
  });

  it('el texto de fechas es el único dato duro que se comunica', () => {
    expect(CYBER_FECHAS).toBe('2, 3 y 4 de noviembre');
  });
});

describe('CYBER HYPE — estado por fecha', () => {
  const t = (iso: string) => new Date(iso);

  it('antes de la apertura es previa', () => {
    expect(cyberEstado(t('2026-10-28T12:00:00-03:00'))).toBe('previa');
    expect(cyberEstado(t('2026-11-01T23:59:59-03:00'))).toBe('previa');
  });

  it('el primer segundo de la apertura ya es evento', () => {
    expect(cyberEstado(t('2026-11-02T00:00:00-03:00'))).toBe('evento');
    expect(cyberEstado(t('2026-11-04T23:59:59-03:00'))).toBe('evento');
  });

  it('a las 00:00 del 5/11 está cerrado', () => {
    expect(cyberEstado(t('2026-11-05T00:00:00-03:00'))).toBe('cerrado');
  });

  it('no hay acceso anticipado: a las 23:00 del 1/11 todavía es previa', () => {
    // El estado "preview" del PR original (1/11 23:00) se eliminó a propósito:
    // la landing no habilita nada antes de la hora pública.
    expect(cyberEstado(t('2026-11-01T23:00:00-03:00'))).toBe('previa');
  });
});

describe('CYBER HYPE — captación', () => {
  it('solo está abierta en la previa', () => {
    expect(cyberCapturaAbierta(new Date('2026-10-29T10:00:00-03:00'))).toBe(true);
    expect(cyberCapturaAbierta(new Date('2026-11-02T01:00:00-03:00'))).toBe(false);
    expect(cyberCapturaAbierta(new Date('2026-11-06T01:00:00-03:00'))).toBe(false);
  });

  it('el reloj cuenta a la apertura, después al cierre, y después a nada', () => {
    expect(cyberProximoHito(new Date('2026-10-29T10:00:00-03:00'))).toEqual({ iso: CYBER_START, label: 'Abre en' });
    expect(cyberProximoHito(new Date('2026-11-03T10:00:00-03:00'))).toEqual({ iso: CYBER_END, label: 'Cierra en' });
    expect(cyberProximoHito(new Date('2026-11-06T10:00:00-03:00'))).toBeNull();
  });
});

describe('popup de newsletter', () => {
  it('no aparece en la landing del evento (ofrece HYPE10, que se suma a los packs)', () => {
    expect(isExcludedPage('/hype72')).toBe(true);
    expect(isExcludedPage('/hype72/')).toBe(true);
  });

  it('sigue apareciendo donde aparecía', () => {
    expect(isExcludedPage('/producto/remera-x')).toBe(false);
    expect(isExcludedPage('/')).toBe(false);
  });
});
