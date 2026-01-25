import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword || String(newPassword).length < 6)
    return NextResponse.json({ error: 'senha inválida' }, { status: 400 });

  const ok = await bcrypt.compare(
    String(currentPassword),
    (me as any).password || ''
  );
  if (!ok)
    return NextResponse.json(
      { error: 'senha atual incorreta' },
      { status: 400 }
    );

  const hash = await bcrypt.hash(String(newPassword), 10);
  await prisma.user.update({ where: { id: me.id }, data: { password: hash } });
  return NextResponse.json({ ok: true });
}
