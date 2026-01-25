import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function GET(req: NextRequest) {
  try {
    await requireControleGasolinaAdmin();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const periodFilter: { gte?: Date; lt?: Date } = {};
    if (startDate) periodFilter.gte = new Date(startDate + 'T00:00:00');
    if (endDate) {
      const end = new Date(endDate + 'T00:00:00');
      periodFilter.lt = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    // Buscar todos os veículos com seus registros
    const veiculos = await prisma.vehicle.findMany({
      include: {
        responsavel: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        rotas: {
          where: periodFilter.gte || periodFilter.lt ? { createdAt: periodFilter } : undefined,
          select: {
            kmSaida: true,
            createdAt: true,
          },
        },
        abastecimentos: {
          where: periodFilter.gte || periodFilter.lt ? { createdAt: periodFilter } : undefined,
          select: {
            litros: true,
            valor: true,
            kmAtual: true,
            createdAt: true,
          },
        },
        semPararRegistros: {
          where: periodFilter.gte || periodFilter.lt ? { data: periodFilter } : undefined,
          select: {
            valor: true,
            data: true,
          },
        },
      },
    });

    // Processar dados por veículo
    const gastosPorPlaca = veiculos
      .map(veiculo => {
        // 🎯 HIERARQUIA DE FONTE DE DADOS:
        // 1º PRIORIDADE: Rotas manuais (dados preenchidos pelo funcionário - mais confiáveis)
        // 2º PRIORIDADE: Ticket Log (quando não há rotas manuais)
        
        let kmRodados = 0;
        let fonteKmRodados = 'Nenhuma';
        
        // Ordenar abastecimentos por data (mais antigo primeiro)
        const abastecimentosOrdenados = [...veiculo.abastecimentos]
          .filter(a => a.kmAtual > 0)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        // Ordenar rotas por data (mais antigo primeiro)
        const rotasOrdenadas = [...veiculo.rotas]
          .filter(r => r.kmSaida > 0)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        if (rotasOrdenadas.length > 0) {
          // 🥇 USAR ROTAS MANUAIS (mais confiáveis - funcionário preencheu)
          const primeiraRota = rotasOrdenadas[0];
          const ultimaRota = rotasOrdenadas[rotasOrdenadas.length - 1];
          
          const kmPrimeira = Number(primeiraRota.kmSaida) || 0;
          const kmUltima = Number(ultimaRota.kmSaida) || 0;
          
          // KM rodados = diferença entre primeira e última rota por data
          if (kmUltima > kmPrimeira) {
            kmRodados = kmUltima - kmPrimeira;
            fonteKmRodados = 'Rotas Manuais';
          }
        } else if (abastecimentosOrdenados.length > 0) {
          // 🥈 USAR TICKET LOG (menos confiável - frentista pode errar)
          const kmValues = abastecimentosOrdenados
            .map(ab => Number(ab.kmAtual) || 0)
            .filter(km => km > 0);
          
          if (kmValues.length > 0) {
            const kmMinimo = Math.min(...kmValues);
            const kmMaximo = Math.max(...kmValues);
            kmRodados = kmMaximo - kmMinimo;
            fonteKmRodados = 'Ticket Log';
          }
        }

        const totalLitros = veiculo.abastecimentos.reduce((acc, r) => acc + r.litros, 0);
        const totalGastoAbastecimentos = veiculo.abastecimentos.reduce(
          (acc, r) => acc + r.valor,
          0
        );
        const totalGastoSemParar = veiculo.semPararRegistros.reduce(
          (acc, r) => acc + Number(r.valor),
          0
        );
        const totalGasto = totalGastoAbastecimentos + totalGastoSemParar;

        const qtdAbastecimentos = veiculo.abastecimentos.length;
        const qtdRotasManuais = veiculo.rotas.length;
        const qtdSemParar = veiculo.semPararRegistros.length;
        const totalRegistros = qtdAbastecimentos + qtdRotasManuais + qtdSemParar;

        // Determinar fonte principal baseada na hierarquia
        const temTicketLog = qtdAbastecimentos > 0 || qtdSemParar > 0;
        const temRotasManuais = qtdRotasManuais > 0;
        let fonte = '';
        if (temTicketLog && temRotasManuais) {
          fonte = `Rotas Manuais • ${qtdAbastecimentos + qtdSemParar} abastecimentos • ${qtdRotasManuais} rotas manuais`;
        } else if (temRotasManuais) {
          fonte = `Rotas Manuais • 0 abastecimentos • ${qtdRotasManuais} rotas manuais`;
        } else if (temTicketLog) {
          fonte = `Ticket Log • ${qtdAbastecimentos + qtdSemParar} abastecimentos • 0 rotas manuais`;
        } else {
          fonte = 'Sem registros';
        }

        // Calcular eficiência (km/L)
        const kmPorLitro = totalLitros > 0 ? kmRodados / totalLitros : 0;

        return {
          id: veiculo.id,
          placa: veiculo.placa,
          colaborador: veiculo.responsavel?.name || '—',
          totalGasto,
          registros: totalRegistros,
          fonte,
          totalLitros,
          kmRodados,
          kmPorLitro,
          qtdAbastecimentos,
          qtdRotasManuais,
          qtdSemParar,
        };
      })
      .filter(v => v.registros > 0) // Apenas veículos com registros
      .sort((a, b) => b.totalGasto - a.totalGasto); // Ordenar por maior gasto

    return NextResponse.json(gastosPorPlaca);
  } catch (error) {
    console.error('Erro ao buscar gastos por placa:', error);
    return NextResponse.json({ error: 'Erro ao buscar gastos por placa' }, { status: 500 });
  }
}

