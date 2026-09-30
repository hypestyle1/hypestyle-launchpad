import { describe, it, expect } from 'vitest';
import {
  BAR_DELAY_AFTER_CLOSE_S,
  BAR_DELAY_SOCIAL_S,
  MODAL_DELAY_RETURNING_S,
  MODAL_DELAY_S,
  cameFromOurEmail,
  classifyTraffic,
  closedUntil,
  isClosedRecently,
  isExcludedPage,
  isProductPage,
  planPopup,
  type PopupContext,
} from '@/lib/newsletter-popup';
import { isGdprCountry } from '@/lib/geo';

const base: PopupContext = {
  pathname: '/producto/hoodie-lettering',
  source: 'direct',
  subscribed: false,
  buyer: false,
  closedRecently: false,
  returning: false,
  barPending: false,
  barShown: false,
};

describe('newsletter popup — dónde', () => {
  it('reconoce la ficha de producto con y sin barra final', () => {
    expect(isProductPage('/producto/hoodie-lettering')).toBe(true);
    expect(isProductPage('/producto/hoodie-lettering/')).toBe(true);
    expect(isProductPage('/productos')).toBe(false);
    expect(isProductPage('/')).toBe(false);
    expect(isProductPage('/colecciones/fw26')).toBe(false);
  });

  it('no aparece donde están comprando, pagando o administrando', () => {
    for (const p of ['/checkout', '/checkout/', '/confirmacion', '/pendiente-de-pago', '/pagar/3160', '/admin/pedidos', '/mayoristas/catalogo', '/acceso']) {
      expect(isExcludedPage(p), p).toBe(true);
    }
    expect(isExcludedPage('/producto/x')).toBe(false);
    expect(isExcludedPage('/administracion-de-nada')).toBe(false);
  });
});

describe('newsletter popup — de dónde viene', () => {
  it('utm de Meta, IG o TikTok es social', () => {
    expect(classifyTraffic('?utm_source=ig&utm_medium=paid', '')).toBe('social');
    expect(classifyTraffic('?utm_source=facebook', '')).toBe('social');
    expect(classifyTraffic('?utm_source=tiktok', '')).toBe('social');
    expect(classifyTraffic('?utm_source=hype&utm_medium=cpc', '')).toBe('social');
  });
  it('sin utm decide por el referrer', () => {
    expect(classifyTraffic('', 'https://l.instagram.com/')).toBe('social');
    expect(classifyTraffic('', 'https://www.google.com/')).toBe('organic');
    expect(classifyTraffic('', '')).toBe('direct');
    expect(classifyTraffic('', 'https://hypestyle.com.ar/productos')).toBe('direct');
  });
  it('un link de nuestro mail marca al visitante como suscripto', () => {
    expect(cameFromOurEmail('?utm_source=brevo&utm_medium=email')).toBe(true);
    expect(cameFromOurEmail('?utm_medium=email')).toBe(true);
    expect(cameFromOurEmail('?utm_source=ig')).toBe(false);
    expect(cameFromOurEmail('')).toBe(false);
  });
});

describe('newsletter popup — frecuencia', () => {
  it('cerrado bloquea 3 días y después libera', () => {
    const now = Date.now();
    const raw = closedUntil(now);
    expect(isClosedRecently(raw, now)).toBe(true);
    expect(isClosedRecently(raw, now + 2 * 24 * 3600 * 1000)).toBe(true);
    expect(isClosedRecently(raw, now + 3 * 24 * 3600 * 1000 + 1)).toBe(false);
  });
  it('un valor roto o ausente no bloquea', () => {
    expect(isClosedRecently(null)).toBe(false);
    expect(isClosedRecently('1')).toBe(false);
    expect(isClosedRecently('{}')).toBe(false);
  });
});

describe('newsletter popup — qué mostrar', () => {
  it('directo u orgánico en una ficha: el modal, al scroll o a los 10 s', () => {
    expect(planPopup(base)).toEqual({ kind: 'modal', delayS: MODAL_DELAY_S, scrollDepth: 0.5 });
    expect(planPopup({ ...base, source: 'organic' })).toMatchObject({ kind: 'modal' });
  });
  it('al que ya vino antes se le muestra antes', () => {
    expect(planPopup({ ...base, returning: true })).toMatchObject({ kind: 'modal', delayS: MODAL_DELAY_RETURNING_S });
  });
  it('nunca en el home ni en el catálogo', () => {
    expect(planPopup({ ...base, pathname: '/' })).toEqual({ kind: 'none' });
    expect(planPopup({ ...base, pathname: '/productos' })).toEqual({ kind: 'none' });
  });
  it('tráfico pago: la barra, nunca el modal', () => {
    expect(planPopup({ ...base, source: 'social' })).toEqual({ kind: 'bar', delayS: BAR_DELAY_SOCIAL_S });
    expect(planPopup({ ...base, source: 'social', barShown: true })).toEqual({ kind: 'none' });
  });
  it('suscripto o comprador: nada, ni siquiera la barra pendiente', () => {
    expect(planPopup({ ...base, subscribed: true })).toEqual({ kind: 'none' });
    expect(planPopup({ ...base, buyer: true, barPending: true })).toEqual({ kind: 'none' });
  });
  it('cerró el modal: la barra en la página siguiente, aunque no sea una ficha y aunque esté en los 3 días', () => {
    expect(planPopup({ ...base, pathname: '/productos', closedRecently: true, barPending: true }))
      .toEqual({ kind: 'bar', delayS: BAR_DELAY_AFTER_CLOSE_S });
    expect(planPopup({ ...base, pathname: '/productos', closedRecently: true, barPending: true, barShown: true }))
      .toEqual({ kind: 'none' });
  });
  it('dentro de los 3 días, sin barra pendiente, nada', () => {
    expect(planPopup({ ...base, closedRecently: true })).toEqual({ kind: 'none' });
  });
  it('en checkout no aparece ni la barra pendiente', () => {
    expect(planPopup({ ...base, pathname: '/checkout', barPending: true })).toEqual({ kind: 'none' });
  });
});

describe('cartel de cookies — país', () => {
  it('el cartel completo es solo para Europa, Reino Unido y Suiza', () => {
    for (const c of ['ES', 'DE', 'FR', 'IT', 'GB', 'CH', 'NO', 'pt']) expect(isGdprCountry(c), c).toBe(true);
    for (const c of ['AR', 'US', 'BR', 'MX', 'CL', 'UY', '', null, undefined]) expect(isGdprCountry(c), String(c)).toBe(false);
  });
});
