import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toZonedTime } from 'date-fns-tz';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cpf = searchParams.get('cpf')?.replace(/\D/g, '');
    const unidadeSlug = searchParams.get('unidade');
    const code = searchParams.get('code');

    if (!cpf || cpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    // Buscar funcionário por CPF
    const funcionario = await prisma.funcionario.findFirst({
      where: { cpf },
      select: { id: true },
    });

    if (!funcionario) {
      return NextResponse.json({
        tiposBatidos: [],
        message: 'Funcionário não encontrado',
      });
    }

    // Buscar unidade se especificada (por slug ou code)
    let unidadeId: string | undefined;
    if (code) {
      const qr = await prisma.pontoQrCode.findFirst({
        where: { code, ativo: true },
        select: { unidadeId: true },
      });
      if (qr) {
        unidadeId = qr.unidadeId;
      }
    } else if (unidadeSlug) {
      const unidade = await prisma.unidade.findFirst({
        where: {
          ativa: true,
          nome: { equals: unidadeSlug, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (unidade) {
        unidadeId = unidade.id;
      }
    }

    // Obter início e fim do dia em horário de Brasília
    const agora = new Date();
    const brasiliaTime = toZonedTime(agora, 'America/Sao_Paulo');
    
    // Início do dia em Brasília (00:00:00)
    const inicioDiaBrasilia = new Date(brasiliaTime);
    inicioDiaBrasilia.setHours(0, 0, 0, 0);
    
    // Fim do dia em Brasília (23:59:59)
    const fimDiaBrasilia = new Date(brasiliaTime);
    fimDiaBrasilia.setHours(23, 59, 59, 999);

    // Converter para UTC usando ISO string com timezone
    // Criar string ISO no formato YYYY-MM-DDTHH:mm:ss e adicionar timezone
    const ano = inicioDiaBrasilia.getFullYear();
    const mes = String(inicioDiaBrasilia.getMonth() + 1).padStart(2, '0');
    const dia = String(inicioDiaBrasilia.getDate()).padStart(2, '0');
    
    // Criar data UTC equivalente ao início do dia em Brasília
    // Usar ISO string com timezone -03:00 (Brasília)
    const inicioDiaISO = `${ano}-${mes}-${dia}T00:00:00-03:00`;
    const inicioDiaUTC = new Date(inicioDiaISO);
    
    // Fim do dia: 23:59:59 em Brasília
    const fimDiaISO = `${ano}-${mes}-${dia}T23:59:59.999-03:00`;
    const fimDiaUTC = new Date(fimDiaISO);

    // Buscar registros do funcionário hoje
    const where: any = {
      funcionarioId: funcionario.id,
      timestamp: {
        gte: inicioDiaUTC,
        lte: fimDiaUTC,
      },
    };

    if (unidadeId) {
      where.unidadeId = unidadeId;
    }

    const registrosHoje = await prisma.registroPonto.findMany({
      where,
      select: {
        tipo: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Extrair tipos únicos que já foram batidos hoje
    const tiposBatidos = Array.from(
      new Set(registrosHoje.map(r => r.tipo))
    ) as string[];

    return NextResponse.json({
      tiposBatidos,
      registrosHoje: registrosHoje.map(r => ({
        tipo: r.tipo,
        timestamp: r.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Erro ao verificar pontos de hoje:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar pontos' },
      { status: 500 }
    );
  }
}

