import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File;

    if (!photo) {
      return NextResponse.json({ error: 'Nenhuma foto fornecida' }, { status: 400 });
    }

    // Validar tipo de arquivo
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 });
    }

    // Validar tamanho (5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 5MB)' }, { status: 400 });
    }

    // Converter para base64 para armazenar no banco
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${photo.type};base64,${base64}`;

    // Atualizar usuário no banco
    await prisma.user.update({
      where: { id: session.user.id },
      data: { photoUrl: dataUrl },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
