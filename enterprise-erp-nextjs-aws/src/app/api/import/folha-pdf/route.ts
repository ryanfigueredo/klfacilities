export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { importFromPdf } from '@/server/services/folha/importFromPdf';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (process.env.ALLOW_IMPORT_FOLHA !== 'true') {
    return NextResponse.json(
      { error: 'Importação desabilitada' },
      { status: 403 }
    );
  }
  try {
    const form = await req.formData();
    const file = form.get('file') as unknown as File | null;
    if (!file)
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      );
    const buf = Buffer.from(await file.arrayBuffer());
    const res = await importFromPdf(buf, session.user.id);
    const expected = 69509.22;
    const diff = Math.abs(res.total - expected);
    if (diff > 0.01) {
      return NextResponse.json({ ...res, diff }, { status: 409 });
    }
    return NextResponse.json({ ...res, diff });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Erro ao importar' },
      { status: 400 }
    );
  }
}
