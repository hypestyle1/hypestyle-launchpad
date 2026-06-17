import { NextResponse } from 'next/server';
import { getArgentinaFixture, hasKey } from '@/lib/argentina-fixture';
import { syncDiscount } from '@/lib/goal-discount';

// Devuelve el partido relevante de Argentina (auto-detectado con la API key).
// Durante el partido (IN_PLAY) además sincroniza el descuento por gol — así se
// actualiza en vivo con el tráfico del widget, sin depender del cron de Vercel.

export const revalidate = 0;

export async function GET() {
  if (!hasKey()) {
    return NextResponse.json({ configured: false, message: 'Falta FOOTBALL_DATA_TOKEN' });
  }
  try {
    const fx = await getArgentinaFixture();
    if (fx?.live) { try { await syncDiscount(true); } catch { /* no romper el widget */ } }
    return NextResponse.json({ configured: true, match: fx });
  } catch (e: any) {
    return NextResponse.json({ configured: true, error: String(e?.message || e) });
  }
}
