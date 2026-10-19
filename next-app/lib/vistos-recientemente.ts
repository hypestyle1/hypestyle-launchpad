'use client';

/**
 * "Vistos recientemente" — los últimos productos que miró esta persona
 * (referencia: coldcultureworldwide.com, 19/10/2026).
 *
 * Guarda solo slugs en localStorage: nombre, precio, foto y stock salen del
 * catálogo cuando se renderiza, así que nada queda desactualizado ni se
 * muestra un precio viejo (el bug del carrito de septiembre fue exactamente
 * eso). Es por navegador, no viaja al servidor y no identifica a nadie.
 */

const CLAVE = 'hs_vistos';
/** Suficiente para la tira; más es memoria al pedo. */
const MAX = 12;

export function leerVistos(): string[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const v = JSON.parse(crudo);
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Lo deja primero y sin repetir. Silencioso si localStorage no está. */
export function registrarVisto(slug: string): void {
  if (!slug) return;
  try {
    const previos = leerVistos().filter((s) => s !== slug);
    localStorage.setItem(CLAVE, JSON.stringify([slug, ...previos].slice(0, MAX)));
  } catch {}
}
