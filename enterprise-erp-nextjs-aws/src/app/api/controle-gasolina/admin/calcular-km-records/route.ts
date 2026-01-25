import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

/**
 * Rota para calcular KmRecords a partir dos FuelRecords existentes no banco
 * Isso é útil quando os dados foram importados antes da implementação da criação automática de KmRecords
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireControleGasolinaAdmin();

    const { searchParams } = new URL(req.url);
    const forceRecalculate = searchParams.get('force') === 'true';

    // Buscar todos os veículos
    const veiculos = await prisma.vehicle.findMany({
      select: { id: true, placa: true },
    });

    let totalCreated = 0;
    let totalSkipped = 0;
    const errors: Array<{ placa: string; error: string }> = [];

    for (const veiculo of veiculos) {
      try {
        // Buscar todos os abastecimentos do veículo ordenados por data
        const abastecimentos = await prisma.fuelRecord.findMany({
          where: { veiculoId: veiculo.id },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            kmAtual: true,
            createdAt: true,
            observacao: true,
          },
        });

        if (abastecimentos.length < 2) {
          // Precisa de pelo menos 2 abastecimentos para calcular KM
          continue;
        }

        // Para cada par de abastecimentos consecutivos
        for (let i = 1; i < abastecimentos.length; i++) {
          const anterior = abastecimentos[i - 1];
          const atual = abastecimentos[i];

          // Verificar se já existe um KmRecord para este intervalo
          if (!forceRecalculate) {
            const existeKmRecord = await prisma.kmRecord.findFirst({
              where: {
                veiculoId: veiculo.id,
                createdAt: {
                  gte: anterior.createdAt,
                  lte: atual.createdAt,
                },
              },
            });

            if (existeKmRecord) {
              totalSkipped++;
              continue;
            }
          }

          // Calcular KM rodados
          const kmRodados = atual.kmAtual - anterior.kmAtual;

          // Apenas criar se houver uma diferença positiva e razoável
          if (kmRodados > 0 && kmRodados < 999999) {
            // Data do registro de KM: meio-termo entre os dois abastecimentos
            const dataKmRecord = new Date(
              (anterior.createdAt.getTime() + atual.createdAt.getTime()) / 2
            );

            // Se forceRecalculate, deletar registros existentes no intervalo
            if (forceRecalculate) {
              await prisma.kmRecord.deleteMany({
                where: {
                  veiculoId: veiculo.id,
                  createdAt: {
                    gte: anterior.createdAt,
                    lte: atual.createdAt,
                  },
                },
              });
            }

            await prisma.kmRecord.create({
              data: {
                km: kmRodados,
                observacao: `Calculado automaticamente a partir de abastecimentos existentes (entre ${anterior.id} e ${atual.id})`,
                photoUrl: null,
                createdAt: dataKmRecord,
                usuarioId: me.id,
                veiculoId: veiculo.id,
              },
            });

            totalCreated++;
          }
        }
      } catch (error) {
        console.error(`Erro ao processar veículo ${veiculo.placa}:`, error);
        errors.push({
          placa: veiculo.placa,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalCreated,
      totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Foram criados ${totalCreated} registros de KM. ${totalSkipped} foram ignorados por já existirem.`,
    });
  } catch (error) {
    console.error('Erro ao calcular KmRecords:', error);
    return NextResponse.json(
      {
        error: 'Erro ao calcular registros de KM',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

