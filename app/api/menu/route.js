import { NextResponse } from 'next/server';
import { listMenuItems, createMenuItem } from '@/lib/db';

export async function GET() {
  try {
    const items = await listMenuItems();
    return NextResponse.json({ data: items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const item = await createMenuItem({
      name: body.name,
      price: body.price,
      category: body.category,
      is_available: body.is_available,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
