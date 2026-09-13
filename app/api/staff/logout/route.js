import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/staffAuth';

export async function POST() {
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
