export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

function ipToBigInt(ip: string): bigint | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  try {
    return (
      BigInt(parts[0]) * BigInt(256 ** 3) +
      BigInt(parts[1]) * BigInt(256 ** 2) +
      BigInt(parts[2]) * BigInt(256) +
      BigInt(parts[3])
    );
  } catch {
    return null;
  }
}

function cpfToBigInt(cpf: string): bigint | undefined {
  if (!cpf) return undefined;
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return undefined;

  try {
    return BigInt(cleanCpf);
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Ponto de exemplo não precisa de usuário (criadoPorId null)
    const criadoPorId = null;

    // Buscar ou criar grupo de exemplo
    let grupo = await prisma.grupo.findFirst({
      where: { nome: 'Grupo Exemplo' },
    });

    if (!grupo) {
      grupo = await prisma.grupo.create({
        data: {
          nome: 'Grupo Exemplo',
          ativo: true,
        },
      });
    }

    // Buscar ou criar unidade de exemplo
    let unidade = await prisma.unidade.findFirst({
      where: { nome: 'Unidade Exemplo' },
    });

    if (!unidade) {
      unidade = await prisma.unidade.create({
        data: {
          nome: 'Unidade Exemplo',
          ativa: true,
        },
      });
    }

    // Buscar ou criar funcionário de exemplo
    let funcionario = await prisma.funcionario.findFirst({
      where: { cpf: '12345678901' },
    });

    if (!funcionario) {
      funcionario = await prisma.funcionario.create({
        data: {
          nome: 'João Silva - Exemplo',
          cpf: '12345678901',
          grupoId: grupo.id,
          unidadeId: unidade.id,
        },
      });
    }

    // Buscar ou criar QR Code
    let qrcode = await prisma.pontoQrCode.findFirst({
      where: { unidadeId: unidade.id, ativo: true },
    });

    if (!qrcode) {
      qrcode = await prisma.pontoQrCode.create({
        data: {
          unidadeId: unidade.id,
          code: 'EXEMPLO-001',
          ativo: true,
        },
      });
    }

    // Limpar registros existentes do mês de outubro de 2025
    const monthStart = new Date('2025-10-01T00:00:00.000Z');
    const monthEnd = new Date('2025-11-01T00:00:00.000Z');

    await prisma.registroPonto.deleteMany({
      where: {
        funcionarioId: funcionario.id,
        timestamp: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    // Criar registros de ponto para outubro de 2025
    // Horário padrão: Entrada 08:00, Intervalo 12:00, Volta 13:00, Saída 17:00 (horário de Brasília)
    const registros = [];

    for (let dia = 1; dia <= 31; dia++) {
      const date = new Date(`2025-10-${String(dia).padStart(2, '0')}T00:00:00-03:00`);
      const dayOfWeek = date.getDay();

      // Não criar registros para domingos (dia 0)
      if (dayOfWeek === 0) continue;

      // Para sábados (dia 6), horário reduzido: 08:00 - 12:00
      const isSaturday = dayOfWeek === 6;

      // Entrada
      const entrada = new Date(date);
      entrada.setHours(8, 0, 0, 0);
      const entradaUtc = new Date(entrada.toISOString());

      // Intervalo início
      const intervaloInicio = new Date(date);
      intervaloInicio.setHours(12, 0, 0, 0);
      const intervaloInicioUtc = new Date(intervaloInicio.toISOString());

      // Intervalo fim
      const intervaloFim = new Date(date);
      intervaloFim.setHours(13, 0, 0, 0);
      const intervaloFimUtc = new Date(intervaloFim.toISOString());

      // Saída
      const saida = new Date(date);
      if (isSaturday) {
        saida.setHours(12, 0, 0, 0);
      } else {
        saida.setHours(17, 0, 0, 0);
      }
      const saidaUtc = new Date(saida.toISOString());

      const tipos = [
        { tipo: 'ENTRADA' as const, timestamp: entradaUtc },
        { tipo: 'INTERVALO_INICIO' as const, timestamp: intervaloInicioUtc },
        { tipo: 'INTERVALO_FIM' as const, timestamp: intervaloFimUtc },
        { tipo: 'SAIDA' as const, timestamp: saidaUtc },
      ];

      for (const { tipo, timestamp } of tipos) {
        const canonical = [
          `ts=${timestamp.toISOString()}`,
          `cpf=${funcionario.cpf || ''}`,
          `unidade=${unidade.id}`,
          `tipo=${tipo}`,
          `ip=127.0.0.1`,
          `device=EXAMPLE-DEVICE`,
          `qr=${qrcode.id}`,
        ].join('|');
        const hash = createHash('sha256').update(canonical).digest('hex');
        const protocolo = `KL-${timestamp.toISOString().slice(0, 10).replace(/-/g, '')}-${hash.slice(0, 8).toUpperCase()}`;

        registros.push({
          funcionarioId: funcionario.id,
          unidadeId: unidade.id,
          tipo,
          timestamp,
          lat: null,
          lng: null,
          accuracy: null,
          selfieUrl: null,
          ip: ipToBigInt('127.0.0.1'),
          userAgent: 'Example Generator',
          deviceId: 'EXAMPLE-DEVICE',
          qrcodeId: qrcode.id,
          hash,
          protocolo,
          cpfSnapshot: cpfToBigInt(funcionario.cpf || ''),
          criadoPorId,
        });
      }

      // Alguns dias com horas extras (20% dos dias úteis)
      if (dia % 5 === 0 && !isSaturday) {
        const extraEntrada = new Date(date);
        extraEntrada.setHours(18, 0, 0, 0);
        const extraEntradaUtc = new Date(extraEntrada.toISOString());

        const extraSaida = new Date(date);
        extraSaida.setHours(20, 0, 0, 0);
        const extraSaidaUtc = new Date(extraSaida.toISOString());

        const extraTipos = [
          { tipo: 'ENTRADA' as const, timestamp: extraEntradaUtc },
          { tipo: 'SAIDA' as const, timestamp: extraSaidaUtc },
        ];

        for (const { tipo, timestamp } of extraTipos) {
          const canonical = [
            `ts=${timestamp.toISOString()}`,
            `cpf=${funcionario.cpf || ''}`,
            `unidade=${unidade.id}`,
            `tipo=${tipo}`,
            `ip=127.0.0.1`,
            `device=EXAMPLE-DEVICE`,
            `qr=${qrcode.id}`,
          ].join('|');
          const hash = createHash('sha256').update(canonical).digest('hex');
          const protocolo = `KL-${timestamp.toISOString().slice(0, 10).replace(/-/g, '')}-${hash.slice(0, 8).toUpperCase()}`;

          registros.push({
            funcionarioId: funcionario.id,
            unidadeId: unidade.id,
            tipo,
            timestamp,
            lat: null,
            lng: null,
            accuracy: null,
            selfieUrl: null,
            ip: ipToBigInt('127.0.0.1'),
            userAgent: 'Example Generator',
            deviceId: 'EXAMPLE-DEVICE',
            qrcodeId: qrcode.id,
            hash,
            protocolo,
            cpfSnapshot: cpfToBigInt(funcionario.cpf || ''),
            criadoPorId,
          });
        }
      }
    }

    // Inserir todos os registros
    await prisma.registroPonto.createMany({
      data: registros,
    });

    return NextResponse.json({
      ok: true,
      message: `${registros.length} registros de ponto criados para ${funcionario.nome}`,
      funcionarioId: funcionario.id,
      funcionarioCpf: funcionario.cpf,
      unidadeId: unidade.id,
      mes: '2025-10',
      url: `/api/ponto/folha?month=2025-10&funcionarioId=${funcionario.id}&unidadeId=${unidade.id}`,
    });
  } catch (error: any) {
    console.error('Erro ao popular dados de exemplo:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao popular dados' },
      { status: 500 }
    );
  }
}

