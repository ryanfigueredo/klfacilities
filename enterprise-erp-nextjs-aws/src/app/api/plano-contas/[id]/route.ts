import { NextResponse } from 'next/server';

export async function PUT() {
  return NextResponse.json({ error: 'Endpoint removido' }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Endpoint removido' }, { status: 410 });
}
