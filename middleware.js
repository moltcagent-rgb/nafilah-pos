import { NextResponse } from 'next/server';
import { computeStaffToken, COOKIE_NAME } from '@/lib/staffAuth';

// Halaman staff (harus login PIN dulu). '/' = Kasir.
const STAFF_PAGES = new Set(['/', '/antrian', '/menu', '/laporan']);

// Method + path API yang dianggap "aksi staff" (ubah harga, hapus menu, ubah
// status pesanan, lihat daftar semua pesanan). Method/path lain di luar ini
// (GET menu, POST buat pesanan baru, GET satu pesanan buat pelacakan) SENGAJA
// dibiarkan publik supaya halaman pelanggan (/pesan, /lacak/[id]) tetap jalan
// tanpa login.
function isProtectedApi(pathname, method) {
  if (pathname === '/api/orders' && method === 'GET') return true;
  if (pathname.startsWith('/api/orders/') && method === 'PATCH') return true;
  if (pathname === '/api/menu' && method === 'POST') return true;
  if (pathname.startsWith('/api/menu/') && (method === 'PATCH' || method === 'DELETE')) return true;
  return false;
}

async function isAuthed(request) {
  const expectedPin = process.env.STAFF_PIN;
  // Kalau STAFF_PIN belum diisi di environment variable, jangan kunci siapa
  // pun — supaya tidak ke-lockout total sebelum sempat mengatur env-nya.
  // INI HARUS DIISI sebelum link disebar ke pelanggan, lihat README.
  if (!expectedPin) return true;

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return false;

  const expectedToken = await computeStaffToken(expectedPin);
  return cookie === expectedToken;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const staffPage = STAFF_PAGES.has(pathname);
  const protectedApi = isProtectedApi(pathname, method);

  if (!staffPage && !protectedApi) {
    return NextResponse.next();
  }

  if (await isAuthed(request)) {
    return NextResponse.next();
  }

  if (protectedApi) {
    return NextResponse.json({ error: 'Perlu login staff' }, { status: 401 });
  }

  const loginUrl = new URL('/staff/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/',
    '/antrian',
    '/menu',
    '/laporan',
    '/api/orders',
    '/api/orders/:path*',
    '/api/menu',
    '/api/menu/:path*',
  ],
};
