'use client';

import type { CartItem } from '@/context/CartContext';

/**
 * Copia de seguridad del carrito, guardada justo antes de mandar al cliente al
 * gateway de pago (MercadoPago, PayPal, GOcuotas) o a la pantalla de transferencia.
 *
 * El carrito se vacía en ese momento para no dejar la compra duplicada cuando el
 * pago sale bien, pero los tres gateways devuelven a `/checkout` cuando el pago
 * falla o se cancela — y ahí el cliente se encontraba con "Tu carrito está vacío"
 * justo después de que le rechazaran la tarjeta. Rearmar la compra a mano en ese
 * momento es donde más gente abandona.
 *
 * Va en sessionStorage (igual que `hype_order`): sobrevive la ida y vuelta al
 * gateway en la misma pestaña y se muere sola al cerrarla.
 */
const SNAPSHOT_KEY = 'hype_cart_snapshot';

/** Pasado este tiempo la copia se considera vieja y no se restaura. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 h

interface CartSnapshot {
  items: CartItem[];
  savedAt: number;
}

export function saveCartSnapshot(items: CartItem[]): void {
  if (typeof window === 'undefined' || items.length === 0) return;
  try {
    const snapshot: CartSnapshot = { items, savedAt: Date.now() };
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {}
}

export function readCartSnapshot(): CartItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as CartSnapshot;
    if (!Array.isArray(snapshot.items) || snapshot.items.length === 0) return null;
    if (!snapshot.savedAt || Date.now() - snapshot.savedAt > MAX_AGE_MS) {
      clearCartSnapshot();
      return null;
    }
    return snapshot.items;
  } catch {
    return null;
  }
}

export function clearCartSnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SNAPSHOT_KEY);
  } catch {}
}
