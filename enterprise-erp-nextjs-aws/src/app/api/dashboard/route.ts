import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

// Forçar revalidação a cada requisição
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissão para visualizar dashboard
    if (!can(user.role as any, 'relatorios', 'read')) {
      return NextResponse.json(forbiddenPayload('relatorios', 'read'), {
        status: 403,
      });
    }
    // Forçar busca de dados frescos
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const dataInicio = new Date(currentYear, currentMonth - 1, 1);
    const dataFim = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Buscar movimentos do mês atual (excluindo movimentos deletados)
    const movimentos = await prisma.movimento.findMany({
      where: {
        dataLanc: {
          gte: dataInicio,
          lte: dataFim,
        },
        deletedAt: null, // Excluir movimentos deletados
      },
      include: {
        grupo: true,
        unidade: true,
        categoriaRel: true,
      },
      orderBy: {
        dataLanc: 'desc',
      },
      take: 10,
    });

    // Converter objetos Decimal para números
    const movimentosSerializados = movimentos.map(movimento => ({
      ...movimento,
      valor: Number(movimento.valor),
      valorAssinado: Number(movimento.valorAssinado),
    }));

    // Calcular totais
    const totalDespesas = movimentosSerializados
      .filter(m => m.tipo === 'DESPESA')
      .reduce((sum, m) => sum + m.valor, 0);

    const totalReceitas = movimentosSerializados
      .filter(m => m.tipo === 'RECEITA')
      .reduce((sum, m) => sum + m.valor, 0);

    // Calcular saldo do mês
    const saldoMes = totalReceitas - totalDespesas;

    // Buscar dados do mês anterior para comparação
    const mesAnterior = new Date(currentYear, currentMonth - 2, 1);
    const fimMesAnterior = new Date(
      currentYear,
      currentMonth - 1,
      0,
      23,
      59,
      59
    );

    const movimentosMesAnterior = await prisma.movimento.findMany({
      where: {
        dataLanc: {
          gte: mesAnterior,
          lte: fimMesAnterior,
        },
        deletedAt: null, // Excluir movimentos deletados
      },
    });

    const despesasMesAnterior = movimentosMesAnterior
      .filter(m => m.tipo === 'DESPESA')
      .reduce((sum, m) => sum + Number(m.valor), 0);

    const receitasMesAnterior = movimentosMesAnterior
      .filter(m => m.tipo === 'RECEITA')
      .reduce((sum, m) => sum + Number(m.valor), 0);

    // Calcular variação percentual
    const variacaoDespesas =
      despesasMesAnterior > 0
        ? ((totalDespesas - despesasMesAnterior) / despesasMesAnterior) * 100
        : 0;

    const variacaoReceitas =
      receitasMesAnterior > 0
        ? ((totalReceitas - receitasMesAnterior) / receitasMesAnterior) * 100
        : 0;

    // Agrupar movimentos por categoria
    const movimentosPorCategoria = movimentosSerializados.reduce(
      (acc, movimento) => {
        const categoria = movimento.categoriaRel?.nome || 'Sem categoria';
        if (!acc[categoria]) {
          acc[categoria] = { total: 0, count: 0 };
        }
        acc[categoria].total += movimento.valor;
        acc[categoria].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>
    );

    // Top 5 categorias por valor
    const topCategorias = Object.entries(movimentosPorCategoria)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5);

    return NextResponse.json({
      movimentos: movimentosSerializados,
      totalDespesas,
      totalReceitas,
      totalMovimentos: movimentosSerializados.length,

      saldoMes,
      variacaoDespesas,
      variacaoReceitas,
      topCategorias,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao buscar dados da dashboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
