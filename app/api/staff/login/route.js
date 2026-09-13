import { NextResponse } from 'next/server';
import { computeStaffToken, COOKIE_NAME } from '@/lib/staffAuth';

export async function POST(request) {
  try {
    const { pin } = await request.json();
    const expectedPin = process.env.STAFF_PIN;

    if (!expectedPin) {
      return NextResponse.json(
        { error: 'STAFF_PIN belum diatur di server (env variable)' },
        { status: 500 }
      );
    }
    if (!pin || String(pin) !== String(expectedPin)) {
      return NextResponse.json({ error: 'PIN salah' }, { status: 401 });
    }

    const token = await computeStaffToken(expectedPin);
    const res = NextResponse.json({ data: { ok: true } });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 hari
      path: '/',
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
