import { NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus } from '@/lib/db';

// Publik — dipakai halaman pelacakan pesanan pelanggan (tidak butuh login
// staff). middleware.js sengaja TIDAK mengunci method GET di sini.
export async function GET(request, { params }) {
  try {
    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ data: order });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const order = await updateOrderStatus(params.id, body.status);
    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ data: order });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
