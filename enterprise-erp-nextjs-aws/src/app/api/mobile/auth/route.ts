import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * OPTIONS /api/mobile/auth
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 horas
    },
  });
}

/**
 * POST /api/mobile/auth
 * Autenticação para app mobile - valida CPF e retorna informações do funcionário
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

    // Normalizar CPF (remover formatação)
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
      include: {
        unidade: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
            lat: true,
            lng: true,
            radiusM: true,
          },
        },
        grupo: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    // Se não encontrou, buscar todos e filtrar manualmente (pode ter formatação no banco)
    if (!funcionario) {
      const todosFuncionarios = await prisma.funcionario.findMany({
        where: { cpf: { not: null } },
        include: {
          unidade: {
            select: {
              id: true,
              nome: true,
              cidade: true,
              estado: true,
              lat: true,
              lng: true,
              radiusM: true,
            },
          },
          grupo: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
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

    if (!funcionario.unidadeId || !funcionario.unidade) {
      return NextResponse.json(
        { error: 'Funcionário não está vinculado a uma unidade' },
        { status: 400 }
      );
    }

    // Converter Decimal para number (Prisma retorna Decimal para campos Decimal)
    const unidadeData = {
      id: funcionario.unidade.id,
      nome: funcionario.unidade.nome,
      cidade: funcionario.unidade.cidade,
      estado: funcionario.unidade.estado,
      lat: funcionario.unidade.lat ? Number(funcionario.unidade.lat) : null,
      lng: funcionario.unidade.lng ? Number(funcionario.unidade.lng) : null,
      radiusM: funcionario.unidade.radiusM,
    };

    // Log para debug (sempre, para facilitar troubleshooting)
    console.log('📍 Dados da Unidade retornados pela API:', {
      unidadeId: unidadeData.id,
      nome: unidadeData.nome,
      lat: unidadeData.lat,
      lng: unidadeData.lng,
      radiusM: unidadeData.radiusM,
      tipoLat: typeof unidadeData.lat,
      tipoLng: typeof unidadeData.lng,
      latOriginal: funcionario.unidade.lat,
      lngOriginal: funcionario.unidade.lng,
      latTipoOriginal: typeof funcionario.unidade.lat,
      lngTipoOriginal: typeof funcionario.unidade.lng,
    });

    // Retornar informações do funcionário (sem dados sensíveis)
    const response = NextResponse.json({
      success: true,
      funcionario: {
        id: funcionario.id,
        nome: funcionario.nome,
        cpf: funcionario.cpf,
        unidade: unidadeData,
        grupo: funcionario.grupo,
      },
    });
    
    // CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error: any) {
    console.error('Erro na autenticação mobile:', error);
    return NextResponse.json(
      { error: 'Erro ao autenticar' },
      { status: 500 }
    );
  }
}

