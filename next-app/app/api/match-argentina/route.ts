import { NextResponse } from 'next/server';
import { getArgentinaFixture, hasKey } from '@/lib/argentina-fixture';

// Devuelve el partido relevante de Argentina (auto-detectado con solo la API key).
// La key vive en el server. El cliente controla la cadencia de polling.

export const revalidate = 0;

export async function GET() {
  if (!hasKey()) {
    return NextResponse.json({ configured: false, message: 'Falta API_FOOTBALL_KEY' });
  }
  try {
    const fx = await getArgentinaFixture();
    return NextResponse.json({ configured: true, match: fx });
  } catch (e: any) {
    return NextResponse.json({ configured: true, error: String(e?.message || e) });
  }
}
