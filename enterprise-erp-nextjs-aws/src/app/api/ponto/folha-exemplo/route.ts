export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toZonedTime, format as tzFormat } from 'date-fns-tz';
import { writeFile } from 'fs/promises';
import { join } from 'path';

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

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

type DiaRow = {
  dia: number;
  semana: string;
  normalInicio?: string;
  normalIntervalo?: string;
  normalVoltaIntervalo?: string;
  normalTermino?: string;
  extraInicio?: string;
  extraTermino?: string;
  obs?: string;
  totalHoras?: string;
  totalMinutos?: number;
  pontos: any[];
};

function weekdayPtShort(d: Date) {
  const map = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const zonedDate = toZonedTime(d, 'America/Sao_Paulo');
  return map[zonedDate.getDay()] || '';
}

async function popularDadosExemplo() {
  // Ponto de exemplo não precisa de usuário (criadoPorId null)

  // Buscar ou criar grupo de exemplo
  let grupo = await prisma.grupo.findFirst({
    where: { nome: 'KL Facilities' },
  });

  if (!grupo) {
    grupo = await prisma.grupo.findFirst({});
    if (!grupo) {
      grupo = await prisma.grupo.create({
        data: {
          nome: 'KL Facilities',
          ativo: true,
        },
      });
    }
  }

  // Buscar ou criar unidade de exemplo
  let unidade = await prisma.unidade.findFirst({
    where: { nome: 'Matriz - São Paulo' },
  });

  if (!unidade) {
    unidade = await prisma.unidade.findFirst({});
    if (!unidade) {
      unidade = await prisma.unidade.create({
        data: {
          nome: 'Matriz - São Paulo',
          ativa: true,
        },
      });
    }
  }

  // Buscar ou criar funcionário de exemplo
  let funcionario = await prisma.funcionario.findFirst({
    where: { cpf: '12345678901' },
  });

  if (!funcionario) {
    funcionario = await prisma.funcionario.create({
      data: {
        nome: 'João Silva',
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
  const registros = [];

  for (let dia = 1; dia <= 31; dia++) {
    const date = new Date(`2025-10-${String(dia).padStart(2, '0')}T00:00:00-03:00`);
    const dayOfWeek = date.getDay();

    // Não criar registros para domingos (dia 0)
    if (dayOfWeek === 0) continue;

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
        criadoPorId: null,
      });
    }

    // Alguns dias com horas extras
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
          criadoPorId: null,
        });
      }
    }
  }

  // Inserir todos os registros
  if (registros.length > 0) {
    await prisma.registroPonto.createMany({
      data: registros,
    });
  }

  return { funcionario, grupo, unidade };
}

export async function GET(req: NextRequest) {
  try {
    // Popular dados de exemplo
    const { funcionario, grupo, unidade } = await popularDadosExemplo();

    // Buscar registros do mês
    const parsed = { y: 2025, m: 10, start: new Date('2025-10-01T00:00:00.000Z'), end: new Date('2025-11-01T00:00:00.000Z') };

    const rows = await prisma.registroPonto.findMany({
      where: {
        funcionarioId: funcionario.id,
        timestamp: { gte: parsed.start, lt: parsed.end },
      },
      orderBy: { timestamp: 'asc' },
    });

    const byDay = new Map<number, any[]>();
    for (const r of rows) {
      const dt = new Date(r.timestamp as any);
      const dtSp = toZonedTime(dt, 'America/Sao_Paulo');
      const dia = dtSp.getDate();
      const list = byDay.get(dia) || [];
      list.push(r);
      byDay.set(dia, list);
    }

    const firstDayOfMonth = toZonedTime(
      new Date(Date.UTC(parsed.y, parsed.m - 1, 1)),
      'America/Sao_Paulo'
    );
    const lastDayOfMonth = toZonedTime(
      new Date(Date.UTC(parsed.y, parsed.m, 0)),
      'America/Sao_Paulo'
    );
    const daysInMonth = lastDayOfMonth.getDate();
    const table: DiaRow[] = [];
    let totalHorasMes = 0;
    let totalMinutosMes = 0;

    const fmt = (date: Date) =>
      tzFormat(toZonedTime(date, 'America/Sao_Paulo'), 'HH:mm', {
        timeZone: 'America/Sao_Paulo',
      });

    for (let d = 1; d <= daysInMonth; d++) {
      const utcDate = new Date(Date.UTC(parsed.y, parsed.m - 1, d, 12, 0, 0));
      const date = toZonedTime(utcDate, 'America/Sao_Paulo');
      const list = (byDay.get(d) || []).sort(
        (a, b) => +new Date(a.timestamp as any) - +new Date(b.timestamp as any)
      );
      const row: DiaRow = {
        dia: d,
        semana: weekdayPtShort(date),
        pontos: list,
        totalMinutos: 0,
      };

      let minutosTrabalhados = 0;
      const records = list.map(r => ({
        ...r,
        time: new Date(r.timestamp as any).getTime(),
      }));

      const entradas = records.filter(r => r.tipo === 'ENTRADA');
      const saidas = records.filter(r => r.tipo === 'SAIDA');
      const intervalosIni = records.filter(r => r.tipo === 'INTERVALO_INICIO');
      const intervalosFim = records.filter(r => r.tipo === 'INTERVALO_FIM');

      if (entradas.length > 0) {
        row.normalInicio = fmt(new Date(entradas[0].time));
      }

      if (saidas.length > 0) {
        row.normalTermino = fmt(new Date(saidas[saidas.length - 1].time));
      }

      if (intervalosIni.length > 0) {
        row.normalIntervalo = fmt(new Date(intervalosIni[0].time));
      }

      if (intervalosFim.length > 0) {
        row.normalVoltaIntervalo = fmt(new Date(intervalosFim[0].time));
      }

      if (entradas.length > 1) {
        row.extraInicio = fmt(new Date(entradas[1].time));
      }
      if (saidas.length > 1) {
        row.extraTermino = fmt(new Date(saidas[1].time));
      }

      if (entradas.length > 0 && saidas.length > 0) {
        const entradaInicial = entradas[0];
        const saidaFinal = saidas[saidas.length - 1];
        let tempoTotal = saidaFinal.time - entradaInicial.time;

        for (let i = 0; i < intervalosIni.length; i++) {
          const inicioIntervalo = intervalosIni[i];
          const fimIntervalo =
            intervalosFim.find(f => f.time > inicioIntervalo.time) || saidaFinal;
          tempoTotal -= fimIntervalo.time - inicioIntervalo.time;
        }

        minutosTrabalhados = Math.max(0, Math.round(tempoTotal / (1000 * 60)));
      }

      row.totalMinutos = minutosTrabalhados;
      row.totalHoras = `${Math.floor(minutosTrabalhados / 60)}:${String(minutosTrabalhados % 60).padStart(2, '0')}`;

      totalMinutosMes += minutosTrabalhados;
      totalHorasMes = Math.floor(totalMinutosMes / 60);

      table.push(row);
    }

    // Gerar PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.2, 0.4, 0.8);
    const secondaryColor = rgb(0.1, 0.1, 0.1);
    const lightGray = rgb(0.9, 0.9, 0.9);
    const white = rgb(1, 1, 1);

    let y = 800;

    const drawText = (
      text: string,
      x: number,
      size = 10,
      b = false,
      color = secondaryColor
    ) => {
      page.drawText(text, {
        x,
        y,
        size,
        font: b ? bold : font,
        color,
      });
    };

    const drawAt = (
      text: string,
      x: number,
      yPos: number,
      size = 10,
      b = false,
      color = secondaryColor
    ) => {
      page.drawText(text, {
        x,
        y: yPos,
        size,
        font: b ? bold : font,
        color,
      });
    };

    const line = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      thickness = 0.7,
      color = secondaryColor
    ) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        color,
        thickness,
      });
    };

    const drawRect = (
      x: number,
      y: number,
      width: number,
      height: number,
      color = white,
      borderColor = secondaryColor
    ) => {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor,
        borderWidth: 0.5,
        color,
      });
    };

    drawRect(30, 750, 535, 80, lightGray);
    drawText('FOLHA DE PONTO INDIVIDUAL', 50, 16, true, primaryColor);
    y -= 25;

    drawText(
      `Período: ${pad2(1)}/${pad2(parsed.m)}/${parsed.y} a ${pad2(daysInMonth)}/${pad2(parsed.m)}/${parsed.y}`,
      50,
      12,
      true,
      secondaryColor
    );
    y -= 20;

    drawText('EMPRESA:', 50, 10, true, secondaryColor);
    drawText(
      `${grupo?.nome || '-'} - ${unidade?.nome || '-'}`,
      120,
      10,
      false,
      secondaryColor
    );
    y -= 15;

    drawText('FUNCIONÁRIO:', 50, 10, true, secondaryColor);
    drawText(funcionario.nome, 140, 10, false, secondaryColor);
    drawText('CPF:', 400, 10, true, secondaryColor);
    drawText(funcionario.cpf || '-', 430, 10, false, secondaryColor);
    y -= 15;

    drawText('TOTAL DE HORAS NO MÊS:', 50, 10, true, primaryColor);
    drawText(
      `${totalHorasMes}:${String(totalMinutosMes % 60).padStart(2, '0')} (${totalMinutosMes} minutos)`,
      220,
      10,
      true,
      primaryColor
    );
    y -= 25;

    const left = 40;
    const right = 555;
    const rowH = 24;
    const cellPadX = 8;
    const cols = [
      { w: 50 },
      { w: 180 },
      { w: 100 },
      { w: 100 },
      { w: 95 },
    ];

    let x = left;
    let headerTop = y;
    let headerBottom = y - rowH;

    drawRect(left, headerBottom, right - left, rowH, primaryColor);
    line(left, headerTop, right, headerTop, 1, secondaryColor);
    line(left, headerBottom, right, headerBottom, 1, secondaryColor);
    line(left, headerTop, left, headerBottom, 1, secondaryColor);

    x = left;
    for (const c of cols) {
      x += c.w;
      line(x, headerTop, x, headerBottom, 0.5, white);
    }

    const headerY = headerBottom + cellPadX + 4;
    x = left + cellPadX;
    drawAt('Dias', x, headerY, 10, true, white);
    x = left + cols[0].w + cellPadX;
    drawAt('Normal', x, headerY, 10, true, white);
    x = left + cols[0].w + cols[1].w + cellPadX;
    drawAt('Extra', x, headerY, 10, true, white);
    x = left + cols[0].w + cols[1].w + cols[2].w + cellPadX;
    drawAt('Total', x, headerY, 10, true, white);
    x = left + cols[0].w + cols[1].w + cols[2].w + cols[3].w + cellPadX;
    drawAt('Observações', x, headerY, 10, true, white);
    y = headerBottom;

    const normalStartX = left + cols[0].w;
    const normalWidth = cols[1].w;
    const nW = normalWidth / 4;
    const extraStartX = normalStartX + normalWidth;
    const extraWidth = cols[2].w;
    const eW = extraWidth / 2;
    const totalStartX = extraStartX + extraWidth;
    const totalWidth = cols[3].w;

    const subTop = y;
    const subBottom = y - rowH;

    drawRect(left, subBottom, right - left, rowH, lightGray);
    line(left, subBottom, right, subBottom, 1, secondaryColor);

    line(normalStartX + nW, subTop, normalStartX + nW, subBottom, 0.5, secondaryColor);
    line(normalStartX + 2 * nW, subTop, normalStartX + 2 * nW, subBottom, 0.5, secondaryColor);
    line(normalStartX + 3 * nW, subTop, normalStartX + 3 * nW, subBottom, 0.5, secondaryColor);
    line(extraStartX + eW, subTop, extraStartX + eW, subBottom, 0.5, secondaryColor);
    line(extraStartX + extraWidth, subTop, extraStartX + extraWidth, subBottom, 0.5, secondaryColor);
    line(totalStartX + totalWidth, subTop, totalStartX + totalWidth, subBottom, 0.5, secondaryColor);

    const subHeaderY = subBottom + cellPadX + 2;
    drawAt('Início', normalStartX + cellPadX, subHeaderY, 9, true, secondaryColor);
    drawAt('Intervalo', normalStartX + nW + cellPadX, subHeaderY, 9, true, secondaryColor);
    drawAt('Volta', normalStartX + 2 * nW + cellPadX, subHeaderY, 9, true, secondaryColor);
    drawAt('Saída', normalStartX + 3 * nW + cellPadX, subHeaderY, 9, true, secondaryColor);
    drawAt('Início', extraStartX + cellPadX, subHeaderY, 9, true, secondaryColor);
    drawAt('Saída', extraStartX + eW + cellPadX, subHeaderY, 9, true, secondaryColor);
    drawAt('Horas', totalStartX + cellPadX, subHeaderY, 9, true, secondaryColor);
    y = subBottom;

    for (let i = 0; i < table.length; i++) {
      const r = table[i];
      const rowTop = y;
      const rowBottom = y - rowH;
      if (rowBottom < 80) break;

      const isEven = i % 2 === 0;
      if (isEven) {
        drawRect(left, rowBottom, right - left, rowH, white);
      } else {
        drawRect(left, rowBottom, right - left, rowH, rgb(0.98, 0.98, 0.98));
      }

      line(left, rowBottom, right, rowBottom, 0.5, secondaryColor);
      line(left, rowTop, left, rowBottom, 0.5, secondaryColor);
      line(left + cols[0].w, rowTop, left + cols[0].w, rowBottom, 0.5, secondaryColor);
      line(normalStartX + nW, rowTop, normalStartX + nW, rowBottom, 0.5, secondaryColor);
      line(normalStartX + 2 * nW, rowTop, normalStartX + 2 * nW, rowBottom, 0.5, secondaryColor);
      line(normalStartX + 3 * nW, rowTop, normalStartX + 3 * nW, rowBottom, 0.5, secondaryColor);
      line(extraStartX, rowTop, extraStartX, rowBottom, 0.5, secondaryColor);
      line(extraStartX + eW, rowTop, extraStartX + eW, rowBottom, 0.5, secondaryColor);
      line(extraStartX + extraWidth, rowTop, extraStartX + extraWidth, rowBottom, 0.5, secondaryColor);
      line(totalStartX + totalWidth, rowTop, totalStartX + totalWidth, rowBottom, 0.5, secondaryColor);
      line(right, rowTop, right, rowBottom, 0.5, secondaryColor);

      const textY = rowBottom + cellPadX + 2;
      const dayColor =
        r.semana === 'Dom' || r.semana === 'Sáb'
          ? rgb(0.8, 0.2, 0.2)
          : secondaryColor;
      drawAt(
        `${pad2(r.dia)}  ${r.semana}`,
        left + cellPadX,
        textY,
        9,
        true,
        dayColor
      );

      const centerText = (
        t: string,
        xStart: number,
        width: number,
        color = secondaryColor
      ) => {
        const w = font.widthOfTextAtSize(t, 9);
        const xCenter = xStart + width / 2 - w / 2;
        drawAt(t, Math.max(xStart + cellPadX, xCenter), textY, 9, false, color);
      };

      if (r.normalInicio) centerText(r.normalInicio, normalStartX, nW);
      if (r.normalIntervalo) centerText(r.normalIntervalo, normalStartX + nW, nW);
      if (r.normalVoltaIntervalo)
        centerText(r.normalVoltaIntervalo, normalStartX + 2 * nW, nW);
      if (r.normalTermino) centerText(r.normalTermino, normalStartX + 3 * nW, nW);

      if (r.extraInicio) centerText(r.extraInicio, extraStartX, eW, primaryColor);
      if (r.extraTermino)
        centerText(r.extraTermino, extraStartX + eW, eW, primaryColor);

      const hoursColor =
        r.totalMinutos && r.totalMinutos > 0 ? primaryColor : secondaryColor;
      centerText(r.totalHoras || '0:00', totalStartX, totalWidth, hoursColor);

      y = rowBottom;
    }

    y -= 30;
    drawRect(30, y - 40, 535, 50, lightGray);

    const issued = tzFormat(
      toZonedTime(new Date(), 'America/Sao_Paulo'),
      'dd/MM/yyyy HH:mm',
      {
        timeZone: 'America/Sao_Paulo',
      }
    );

    const ym = `${parsed.y}-${pad2(parsed.m)}`;
    const payload = `${funcionario.id}.${unidade.id}.${ym}`;
    const encoded = Buffer.from(payload, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const proto = `KL-${encoded}`;

    const footerY = y - 10;
    drawAt(`Protocolo: ${proto}`, 50, footerY, 10, true, secondaryColor);
    drawAt(`Emitido em: ${issued}`, 50, footerY - 12, 10, false, secondaryColor);

    y -= 20;
    line(right - 220, y + 4, right - 20, y + 4, 1, secondaryColor);
    y -= 15;
    line(right - 220, y + 4, right - 20, y + 4, 1, secondaryColor);

    const bytes = await pdf.save();
    
    // Salvar na pasta public
    const filename = 'folha_ponto_exemplo_outubro_2025.pdf';
    const publicPath = join(process.cwd(), 'public', filename);
    await writeFile(publicPath, bytes);
    
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar PDF de exemplo:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}

