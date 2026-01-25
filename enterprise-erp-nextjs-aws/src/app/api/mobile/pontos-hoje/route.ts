import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * OPTIONS /api/mobile/pontos-hoje
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * POST /api/mobile/pontos-hoje
 * Buscar tipos de ponto já registrados hoje para um CPF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cpf } = body;

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      );
    }

    // Normalizar CPF
    const cpfNormalizado = cpf.replace(/\D/g, '').trim();

    if (cpfNormalizado.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    // Buscar funcionário pelo CPF
    let funcionario = await prisma.funcionario.findFirst({
      where: { cpf: cpfNormalizado },
    });

    if (!funcionario) {
      const todosFuncionarios = await prisma.funcionario.findMany({
        where: { cpf: { not: null } },
      });

      funcionario = todosFuncionarios.find(f => {
        if (!f.cpf) return false;
        const cpfBancoNormalizado = f.cpf.replace(/\D/g, '').trim();
        return cpfBancoNormalizado === cpfNormalizado;
      }) || null;
    }

    if (!funcionario) {
      return NextResponse.json(
        { error: 'CPF não cadastrado no sistema' },
        { status: 404 }
      );
    }

    // Data de hoje no timezone do Brasil (America/Sao_Paulo - GMT-3)
    // Obter data/hora atual no timezone do Brasil
    const agoraBrasil = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    
    // Criar objeto Date a partir da string formatada
    const [dataParte, horaParte] = agoraBrasil.split(', ');
    const [dia, mes, ano] = dataParte.split('/').map(Number);
    
    // Criar datas de início e fim do dia no timezone do Brasil
    // Usar Date.UTC e depois ajustar para o offset do Brasil
    const inicioDiaBrasil = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
    const fimDiaBrasil = new Date(ano, mes - 1, dia, 23, 59, 59, 999);
    
    // Converter para UTC para busca no banco
    // Prisma armazena timestamps em UTC, então precisamos converter
    // O timezone do servidor pode ser diferente, então vamos usar uma abordagem mais segura
    // Obter o offset do timezone do Brasil em relação a UTC
    const testeData = new Date();
    const offsetBrasilMinutos = testeData.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      timeZoneName: 'longOffset',
    });
    
    // Calcular offset (Brasil está UTC-3, ou seja, 3 horas atrás)
    // Quando é 00:00 BRT, em UTC é 03:00
    // Para converter BRT para UTC, adicionamos 3 horas
    const offsetBrasil = 3 * 60 * 60 * 1000; // 3 horas em milissegundos
    
    // Criar datas UTC equivalentes
    // inicioDiaBrasil já está em UTC relativo, só precisamos ajustar
    const inicioDiaUTC = new Date(inicioDiaBrasil.getTime() - (inicioDiaBrasil.getTimezoneOffset() * 60 * 1000) + offsetBrasil);
    const fimDiaUTC = new Date(fimDiaBrasil.getTime() - (fimDiaBrasil.getTimezoneOffset() * 60 * 1000) + offsetBrasil);
    
    // Abordagem mais simples: usar a data local e deixar o Prisma fazer a conversão
    // Mas precisamos garantir que estamos usando o dia correto no timezone do Brasil
    // Solução: criar a data como se fosse no timezone do Brasil e converter
    const inicioDia = new Date(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00-03:00`);
    const fimDia = new Date(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T23:59:59-03:00`);

    // Buscar pontos registrados hoje para este funcionário
    const registrosHoje = await prisma.registroPonto.findMany({
      where: {
        funcionarioId: funcionario.id,
        timestamp: {
          gte: inicioDia,
          lte: fimDia,
        },
      },
      select: {
        tipo: true,
      },
      distinct: ['tipo'], // Pegar tipos únicos
    });

    // Extrair apenas os tipos
    const tiposRegistrados = registrosHoje.map(r => r.tipo);

    const response = NextResponse.json({
      success: true,
      pontos: tiposRegistrados,
    });
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error: any) {
    console.error('Erro ao buscar pontos de hoje:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pontos registrados' },
      { status: 500 }
    );
  }
}

