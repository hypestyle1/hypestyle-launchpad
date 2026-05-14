import { NextRequest, NextResponse } from 'next/server';

const COUPONS: Record<string, { discount: number }> = {
  'HYPE10': { discount: 10 },
};

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    const coupon = COUPONS[(code || '').toUpperCase().trim()];
    if (!coupon) return NextResponse.json({ valid: false, error: 'Código inválido' });
    return NextResponse.json({ valid: true, discount: coupon.discount });
  } catch {
    return NextResponse.json({ valid: false, error: 'Error al validar' }, { status: 400 });
  }
}
