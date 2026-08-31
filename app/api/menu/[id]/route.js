import { NextResponse } from 'next/server';
import { updateMenuItem, deleteMenuItem } from '@/lib/db';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const item = await updateMenuItem(params.id, body);
    if (!item) {
      return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await deleteMenuItem(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
