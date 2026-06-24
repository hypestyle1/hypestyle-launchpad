import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correct = process.env.EARLY_ACCESS_PASSWORD ?? 'HYPE50K';

  if (typeof password === 'string' && password.toUpperCase() === correct.toUpperCase()) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('hype_early_access', 'true', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24hs
    });
    return res;
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
