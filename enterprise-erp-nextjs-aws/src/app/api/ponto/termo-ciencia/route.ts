import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

function ipToBigInt(ip: string): bigint | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  try {
    return BigInt(
      parts.reduce((acc, part) => (acc << BigInt(8)) + BigInt(parseInt(part, 10)), BigInt(0))
    );
  } catch {
    return null;
  }
}

// GET - Verificar se funcionário já assinou
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get('cpf')?.replace(/\D/g, '');

  if (!cpf || cpf.length !== 11) {
    return NextResponse.json(
      { error: 'CPF inválido' },
      { status: 400 }
    );
  }

  const funcionario = await prisma.funcionario.findFirst({
    where: { cpf },
    include: { termoCiencia: true },
  });

  if (!funcionario) {
    return NextResponse.json(
      { error: 'Funcionário não encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    funcionario: {
      id: funcionario.id,
      nome: funcionario.nome,
      cpf: funcionario.cpf,
    },
    assinado: !!funcionario.termoCiencia,
    termoCiencia: funcionario.termoCiencia
      ? {
          assinadoEm: funcionario.termoCiencia.assinadoEm,
          versaoTermo: funcionario.termoCiencia.versaoTermo,
        }
      : null,
  });
}

// POST - Assinar termo de ciência
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cpf, deviceId, userAgent, ip } = body;

    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    const funcionario = await prisma.funcionario.findFirst({
      where: { cpf: cpf.replace(/\D/g, '') },
      include: { termoCiencia: true },
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já assinou
    if (funcionario.termoCiencia) {
      return NextResponse.json(
        {
          error: 'Termo já assinado',
          assinadoEm: funcionario.termoCiencia.assinadoEm,
        },
        { status: 409 }
      );
    }

    // Criar hash para garantir integridade
    const now = new Date();
    const canonical = [
      `funcionario=${funcionario.id}`,
      `cpf=${cpf.replace(/\D/g, '')}`,
      `timestamp=${now.toISOString()}`,
      `versao=1.0.0`,
    ].join('|');
    const hash = createHash('sha256').update(canonical).digest('hex');

    // Criar registro de assinatura
    const termoCiencia = await prisma.termoCienciaPonto.create({
      data: {
        funcionarioId: funcionario.id,
        assinadoEm: now,
        ip: ipToBigInt(ip || ''),
        userAgent: userAgent || null,
        deviceId: deviceId || null,
        hash,
        versaoTermo: '1.0.0',
      },
    });

    return NextResponse.json({
      success: true,
      mensagem: 'Termo de ciência assinado com sucesso',
      termoCiencia: {
        assinadoEm: termoCiencia.assinadoEm,
        versaoTermo: termoCiencia.versaoTermo,
      },
    });
  } catch (error: any) {
    console.error('Erro ao assinar termo:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao assinar termo de ciência' },
      { status: 500 }
    );
  }
}

