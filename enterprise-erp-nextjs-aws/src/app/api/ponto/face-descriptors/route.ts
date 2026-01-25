import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { isUniversalQRCode } from '@/lib/ponto-universal';

/**
 * GET /api/ponto/face-descriptors?code=XXX
 * Retorna os descritores faciais de todos os funcionários da unidade do QR code
 * para comparação no cliente
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'code requerido' },
        { status: 400 }
      );
    }

    // Verificar se é QR universal
    const isUniversal = isUniversalQRCode(code);
    
    let funcionarios: any[] = [];
    
    if (isUniversal) {
      // QR Universal: buscar TODOS os funcionários que têm descritor facial
      funcionarios = await prisma.funcionario.findMany({
        where: {
          faceDescriptor: { not: Prisma.JsonNull },
          fotoUrl: { not: null },
        },
        select: {
          id: true,
          cpf: true,
          nome: true,
          fotoUrl: true,
          faceDescriptor: true,
        },
      });
    } else {
      // QR normal: buscar QR code e unidade
      const qr = await prisma.pontoQrCode.findFirst({
        where: { code, ativo: true },
        include: {
          unidade: {
            select: { id: true, nome: true },
          },
        },
      });

      if (!qr) {
        return NextResponse.json({ error: 'QR inválido' }, { status: 404 });
      }

      // Buscar funcionários da unidade que têm descritor facial cadastrado
      funcionarios = await prisma.funcionario.findMany({
        where: {
          unidadeId: qr.unidadeId,
          faceDescriptor: { not: Prisma.JsonNull },
          fotoUrl: { not: null },
        },
        select: {
          id: true,
          cpf: true,
          nome: true,
          fotoUrl: true,
          faceDescriptor: true,
        },
      });
    }

    // Retornar apenas os dados necessários para comparação
    return NextResponse.json({
      funcionarios: funcionarios.map(f => ({
        id: f.id,
        cpf: f.cpf,
        nome: f.nome,
        fotoUrl: f.fotoUrl,
        descriptor: f.faceDescriptor, // Array de 128 números
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar descritores faciais:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar descritores faciais' },
      { status: 500 }
    );
  }
}

