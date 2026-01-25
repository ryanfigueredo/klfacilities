import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user as any).role,
    photoUrl: (user as any).photoUrl,
  });
}

export async function PUT(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim();
  if (!name || !email)
    return NextResponse.json(
      { error: 'name/email obrigatórios' },
      { status: 400 }
    );
  const user = await prisma.user.update({
    where: { id: me.id },
    data: { name, email },
  });
  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
