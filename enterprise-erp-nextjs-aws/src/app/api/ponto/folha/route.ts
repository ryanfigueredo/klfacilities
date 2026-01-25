export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { toZonedTime, format as tzFormat } from 'date-fns-tz';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { createHash } from 'crypto';

function parseMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { y, m, start, end };
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
  // Usar getDay() diretamente do objeto Date
  // getDay() retorna: 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  const dayOfWeek = d.getDay();
  return map[dayOfWeek] || '';
}

// Função helper para converter BigInt para string recursivamente
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key]);
    }
    return serialized;
  }

  return obj;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || '';
    const funcionarioId = searchParams.get('funcionarioId') || undefined;
    const cpfRaw = searchParams.get('cpf') || undefined;
    const unidadeId = searchParams.get('unidadeId') || undefined;

    const parsed = parseMonth(month);
    if (!parsed)
      return NextResponse.json(
        { error: 'month invalido (YYYY-MM)' },
        { status: 400 }
      );

    const me = await getCurrentUser();
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let allowedUnidades: string[] | null = null;
    if (me.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(me.id);
      allowedUnidades = scope.unidadeIds;
      if (!allowedUnidades.length) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
    }

    let func = null as any;
    if (funcionarioId) {
      func = await prisma.funcionario.findUnique({
        where: { id: funcionarioId },
        include: { grupo: true, unidade: true },
      });
    } else if (cpfRaw) {
      const cpf = cpfRaw.replace(/\D/g, '');
      func = await prisma.funcionario.findFirst({
        where: { cpf },
        include: { grupo: true, unidade: true },
      });
    }
    if (!func)
      return NextResponse.json(
        { error: 'funcionario nao encontrado' },
        { status: 404 }
      );

    if (allowedUnidades) {
      const funcUnit = func.unidadeId || func.unidade?.id;
      if (!funcUnit || !allowedUnidades.includes(funcUnit)) {
        return NextResponse.json(
          { error: 'Sem permissão para este funcionário' },
          { status: 403 }
        );
      }
      if (unidadeId && !allowedUnidades.includes(unidadeId)) {
        return NextResponse.json(
          { error: 'Sem permissão para esta unidade' },
          { status: 403 }
        );
      }
    }

    const registrosWhere: any = {
      funcionarioId: func.id,
      timestamp: { gte: parsed.start, lt: parsed.end },
    };

    if (unidadeId) {
      registrosWhere.unidadeId = unidadeId;
    } else if (allowedUnidades) {
      registrosWhere.unidadeId = { in: allowedUnidades };
    }

    const rows = await prisma.registroPonto.findMany({
      where: registrosWhere,
      orderBy: { timestamp: 'asc' },
    });

    // Agrupar registros por dia do mês (usando timezone de São Paulo)
    const byDay = new Map<number, any[]>();
    for (const r of rows) {
      const dt = new Date(r.timestamp as any);
      // Converter para timezone de São Paulo para garantir que o dia está correto
      const dtSp = toZonedTime(dt, 'America/Sao_Paulo');
      const dia = dtSp.getDate();
      const mes = dtSp.getMonth() + 1; // getMonth() retorna 0-11
      const ano = dtSp.getFullYear();

      // Verificar se o registro pertence ao mês correto
      if (mes === parsed.m && ano === parsed.y) {
        const list = byDay.get(dia) || [];
        list.push(r);
        byDay.set(dia, list);
      }
    }

    // Calcular número de dias do mês corretamente
    // parsed.m é o número do mês (1-12)
    // No JavaScript Date, o mês é 0-indexed (0-11), então:
    // - Para pegar o último dia de novembro (mês 11): new Date(2024, 12, 0) = 30 ✅
    // - Para pegar o último dia de dezembro (mês 12): new Date(2024, 13, 0) = 31 ✅
    // Então usamos parsed.m (sem subtrair 1) para pegar o último dia do mês parsed.m
    // porque new Date(year, month, 0) retorna o último dia do mês anterior
    const lastDayDate = new Date(parsed.y, parsed.m, 0);
    const daysInMonth = lastDayDate.getDate();
    const table: DiaRow[] = [];
    let totalHorasMes = 0;
    let totalMinutosMes = 0;

    const fmt = (date: Date) =>
      tzFormat(toZonedTime(date, 'America/Sao_Paulo'), 'HH:mm', {
        timeZone: 'America/Sao_Paulo',
      });

    // Função auxiliar para processar um dia específico
    const processDay = (day: number): DiaRow => {
      // Criar data local do dia (usar horário local para evitar problemas de timezone)
      // O JavaScript Date usa o timezone local automaticamente
      const localDate = new Date(parsed.y, parsed.m - 1, day, 12, 0, 0);

      // Converter para timezone de São Paulo para garantir consistência
      const zonedDate = toZonedTime(localDate, 'America/Sao_Paulo');

      // Verificar se o dia está correto após conversão
      // Se o dia mudou devido ao timezone, usar a data original
      let finalDate = zonedDate;
      if (zonedDate.getDate() !== day) {
        // Se o timezone causou mudança de dia, usar a data local original
        finalDate = localDate;
      }

      const list = (byDay.get(day) || []).sort(
        (a, b) => +new Date(a.timestamp as any) - +new Date(b.timestamp as any)
      );

      let minutosTrabalhados = 0;
      const records = list.map(r => ({
        ...r,
        time: new Date(r.timestamp as any).getTime(),
      }));

      // Agrupar por tipo e pegar apenas o PRIMEIRO registro de cada tipo por dia
      const tiposMap = new Map<string, any>();
      for (const r of records) {
        if (!tiposMap.has(r.tipo)) {
          tiposMap.set(r.tipo, r);
        }
      }

      // Separar pontos (usando apenas o primeiro de cada tipo)
      const entrada = tiposMap.get('ENTRADA');
      const saida = tiposMap.get('SAIDA');
      const intervaloIni = tiposMap.get('INTERVALO_INICIO');
      const intervaloFim = tiposMap.get('INTERVALO_FIM');
      const horaExtraInicio = tiposMap.get('HORA_EXTRA_INICIO');
      const horaExtraFim = tiposMap.get('HORA_EXTRA_FIM');

      // Se tem intervalo fim mas não tem início, adicionar aviso para o supervisor
      if (!intervaloIni && intervaloFim) {
        // Criar registro virtual apenas para exibição do aviso (não será usado no cálculo)
        const avisoVirtual = {
          ...intervaloFim,
          tipo: 'INTERVALO_INICIO',
          time: intervaloFim.time,
          timestamp: intervaloFim.timestamp,
          observacao: 'Insira o horário de início do intervalo',
          criadoPorId: null, // Marcar como virtual
          id: `virtual_aviso_${intervaloFim.id}_intervalo_ini`,
          isAviso: true, // Flag para identificar que é apenas um aviso
        };

        // Adicionar o aviso à lista de pontos para exibição
        list.push(avisoVirtual as any);
      }

      const row: DiaRow = {
        dia: day,
        semana: weekdayPtShort(finalDate),
        pontos: list,
        totalMinutos: 0,
      };

      // Mapeamento para as colunas (usando apenas o primeiro registro de cada tipo)
      if (entrada) {
        const entradaDate = new Date(entrada.time);
        row.normalInicio = fmt(entradaDate);
      }

      if (saida) {
        const saidaDate = new Date(saida.time);
        row.normalTermino = fmt(saidaDate);
      }

      // Intervalo: início e volta do intervalo
      if (intervaloIni) {
        const intervaloIniDate = new Date(intervaloIni.time);
        row.normalIntervalo = fmt(intervaloIniDate);
      }

      if (intervaloFim) {
        const intervaloFimDate = new Date(intervaloFim.time);
        row.normalVoltaIntervalo = fmt(intervaloFimDate);
      }

      // Horas extras: usar os tipos específicos HORA_EXTRA_INICIO e HORA_EXTRA_FIM
      if (horaExtraInicio) {
        const horaExtraInicioDate = new Date(horaExtraInicio.time);
        row.extraInicio = fmt(horaExtraInicioDate);
      }
      if (horaExtraFim) {
        const horaExtraFimDate = new Date(horaExtraFim.time);
        row.extraTermino = fmt(horaExtraFimDate);
      }

      // Calcular horas trabalhadas
      if (entrada && saida) {
        // Tempo total (entrada até saída)
        let tempoTotal = saida.time - entrada.time;

        // Subtrair intervalos (usando apenas o primeiro intervalo do dia)
        // IMPORTANTE: Só desconta intervalo se TANTO início quanto fim estiverem registrados
        // Se não tiver início, NÃO desconta nada - supervisor precisa adicionar manualmente
        if (intervaloIni && intervaloFim) {
          // Garantir que o fim do intervalo é depois do início
          if (intervaloFim.time > intervaloIni.time) {
            tempoTotal -= intervaloFim.time - intervaloIni.time;
          }
        }
        // Se não tem início do intervalo, NÃO desconta nada até que o supervisor adicione o horário correto

        minutosTrabalhados = Math.max(0, Math.round(tempoTotal / (1000 * 60)));

        // Adicionar horas extras se houver
        if (horaExtraInicio && horaExtraFim) {
          if (horaExtraFim.time > horaExtraInicio.time) {
            const minutosExtras = Math.round(
              (horaExtraFim.time - horaExtraInicio.time) / (1000 * 60)
            );
            minutosTrabalhados += minutosExtras;
          }
        }
      }

      row.totalMinutos = minutosTrabalhados;
      row.totalHoras = `${Math.floor(minutosTrabalhados / 60)}:${String(minutosTrabalhados % 60).padStart(2, '0')}`;

      return row;
    };

    // Processar todos os dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      const row = processDay(d);
      totalMinutosMes += row.totalMinutos || 0;
      totalHorasMes = Math.floor(totalMinutosMes / 60);
      table.push(row);
    }

    // Gerar protocolo (mesmo formato usado no PDF e JSON)
    const ymProtocolo = `${parsed.y}-${pad2(parsed.m)}`;
    const payloadProtocolo = `${func.id}.${func.unidadeId || unidadeId || ''}.${ymProtocolo}`;
    const hashProtocolo = createHash('sha256').update(payloadProtocolo).digest('hex');
    const shortHashProtocolo = hashProtocolo.substring(0, 12).toUpperCase();
    const protocolo = `KL-${shortHashProtocolo}`;

    // Verificar se deve retornar JSON ou PDF
    // Se recebeu funcionarioId mas não tem cpf E não foi solicitado PDF explicitamente, retornar JSON
    const formato = searchParams.get('formato') || 'json';
    if (funcionarioId && !cpfRaw && formato === 'json') {
      // Serializar BigInt recursivamente antes de retornar JSON
      const responseData = serializeBigInt({
        table,
        protocolo,
        funcionario: {
          id: func.id,
          nome: func.nome,
          cpf: func.cpf,
          diaFolga: func.diaFolga,
          grupo: func.grupo,
          unidade: func.unidade,
        },
        totalHorasMes,
        totalMinutosMes,
      });

      return NextResponse.json(responseData);
    }

    // Se recebeu cpf OU foi solicitado PDF explicitamente, sempre retornar PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4 pt

    // Função para converter hex para RGB (mesmo padrão do PDF de checklists)
    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
          }
        : { r: 0, g: 0.62, b: 0.89 }; // Default #009ee2
    };

    // Função para carregar fonte Figtree (mesmo padrão do PDF de checklists)
    const embedFigtreeFont = async (
      pdfDoc: PDFDocument
    ): Promise<{ regular: any; bold: any }> => {
      try {
        // Tentar carregar do diretório local
        const regularPath = join(
          process.cwd(),
          'public',
          'fonts',
          'Figtree-Regular.ttf'
        );
        const boldPath = join(
          process.cwd(),
          'public',
          'fonts',
          'Figtree-SemiBold.ttf'
        );

        if (existsSync(regularPath) && existsSync(boldPath)) {
          const regularBytes = readFileSync(regularPath);
          const boldBytes = readFileSync(boldPath);

          // Verificar se são arquivos TTF válidos (não HTML)
          if (regularBytes.length > 1000 && boldBytes.length > 1000) {
            const regularFont = await pdfDoc.embedFont(regularBytes);
            const boldFont = await pdfDoc.embedFont(boldBytes);
            return { regular: regularFont, bold: boldFont };
          }
        }
      } catch (localError) {
        console.warn('Erro ao carregar fonte Figtree local:', localError);
      }

      // Fallback: usar Helvetica
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      return { regular: regularFont, bold: boldFont };
    };

    // Carregar fonte Figtree
    const { regular: figtreeFont, bold: figtreeBoldFont } =
      await embedFigtreeFont(pdf);
    const font = figtreeFont;
    const bold = figtreeBoldFont;

    // Cores do sistema (mesmo padrão do PDF de checklists)
    const primaryColorHex = '#009ee2';
    const accentColorHex = '#0088c7';
    const primaryColorRgb = hexToRgb(primaryColorHex);
    const primaryColor = rgb(
      primaryColorRgb.r,
      primaryColorRgb.g,
      primaryColorRgb.b
    );
    const secondaryColor = rgb(0.1, 0.1, 0.1); // Cinza escuro
    const lightGray = rgb(0.9, 0.9, 0.9); // Cinza claro
    const white = rgb(1, 1, 1);

    // Carregar logo (mesmo padrão do PDF de checklists)
    let logoImage = null;
    try {
      // Tentar icon-512.png primeiro
      const logo512Path = join(process.cwd(), 'public', 'icon-512.png');
      const logo192Path = join(process.cwd(), 'public', 'icon-192.png');

      if (existsSync(logo512Path)) {
        const logoBytes = readFileSync(logo512Path);
        try {
          logoImage = await pdf.embedPng(logoBytes);
        } catch {
          try {
            logoImage = await pdf.embedJpg(logoBytes);
          } catch {
            console.warn('Formato de logo não suportado');
          }
        }
      } else if (existsSync(logo192Path)) {
        const logoBytes = readFileSync(logo192Path);
        try {
          logoImage = await pdf.embedPng(logoBytes);
        } catch {
          try {
            logoImage = await pdf.embedJpg(logoBytes);
          } catch {
            console.warn('Formato de logo não suportado');
          }
        }
      }
    } catch (error) {
      console.warn('Não foi possível carregar o logo:', error);
    }

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

    // Cabeçalho reorganizado (mesmo padrão do PDF de checklists)
    const headerLeft = 50; // Margem padrão
    const margin = 50;
    const contentWidth = 595.28 - 2 * margin;

    // Barra superior sutil PRIMEIRO (acima de tudo)
    page.drawLine({
      start: { x: margin, y: y - 3 },
      end: { x: margin + contentWidth, y: y - 3 },
      thickness: 2,
      color: primaryColor,
    });
    y -= 10;

    // Logo no canto superior esquerdo (abaixo da barra)
    const logoSize = 50;
    if (logoImage) {
      const logoWidth = (logoImage.width / logoImage.height) * logoSize;
      page.drawImage(logoImage, {
        x: headerLeft,
        y: y - logoSize,
        width: logoWidth,
        height: logoSize,
      });
      y -= logoSize + 10;
    }

    // Título principal (mesmo padrão do PDF de checklists)
    drawAt('FOLHA DE PONTO INDIVIDUAL', headerLeft, y, 12, false, primaryColor);
    y -= 18;

    // EMPRESA (mesmo padrão do PDF de checklists)
    drawAt('EMPRESA:', headerLeft, y, 9, false, secondaryColor);
    drawAt(
      `${func.grupo?.nome || '-'} - ${func.unidade?.nome || '-'}`,
      headerLeft + 70,
      y,
      9,
      false,
      secondaryColor
    );
    y -= 12;

    // Total de horas no mês na linha acima de Funcionário (mesmo tamanho de fonte)
    const totalHorasText = `${totalHorasMes}:${String(totalMinutosMes % 60).padStart(2, '0')} (${totalMinutosMes} minutos)`;
    drawAt('TOTAL DE HORAS NO MÊS:', headerLeft, y, 9, false, secondaryColor);
    drawAt(totalHorasText, headerLeft + 140, y, 9, false, secondaryColor);
    y -= 12;

    // FUNCIONÁRIO
    drawAt('FUNCIONÁRIO:', headerLeft, y, 9, false, secondaryColor);
    drawAt(func.nome, headerLeft + 90, y, 9, false, secondaryColor);
    y -= 12;

    // CPF embaixo de FUNCIONÁRIO (mesma coluna)
    drawAt('CPF:', headerLeft, y, 9, false, secondaryColor);
    drawAt(func.cpf || '-', headerLeft + 40, y, 9, false, secondaryColor);
    y -= 12;

    // Dia de Folga
    const diasSemana = [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ];
    const diaFolgaTexto =
      func.diaFolga !== null && func.diaFolga !== undefined
        ? diasSemana[func.diaFolga]
        : 'Não definido';
    drawAt('Dia de Folga:', headerLeft, y, 9, false, secondaryColor);
    drawAt(diaFolgaTexto, headerLeft + 90, y, 9, false, secondaryColor);
    y -= 12;

    // Período (mesmo tamanho das outras infos - 9)
    drawAt(
      `Período: ${pad2(1)}/${pad2(parsed.m)}/${parsed.y} a ${pad2(daysInMonth)}/${pad2(parsed.m)}/${parsed.y}`,
      headerLeft,
      y,
      9,
      false,
      secondaryColor
    );
    y -= 18;

    const left = 50; // Margem padrão (mesmo padrão do PDF de checklists)
    const right = 545;
    const rowH = 18; // Reduzido para caber mais linhas em uma página
    const cellPadX = 6;
    const cellPadY = 5;
    const cols = [
      { w: 50, h: 24, label: 'Dias' },
      {
        w: 180,
        h: 24,
        label: 'Normal',
        subs: ['Início', 'Intervalo', 'Volta', 'Término'],
      },
      { w: 100, label: 'Extra', subs: ['Início', 'Término'] },
      { w: 100, label: 'Total', subs: ['Horas'] },
      { w: 95, label: 'Observações' },
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

    const headerY = headerBottom + cellPadY + 3;
    x = left + cellPadX;
    drawAt('Dias', x, headerY, 9, true, white);
    x = left + cols[0].w + cellPadX;
    drawAt('Normal', x, headerY, 9, true, white);
    x = left + cols[0].w + cols[1].w + cellPadX;
    drawAt('Extra', x, headerY, 9, true, white);
    x = left + cols[0].w + cols[1].w + cols[2].w + cellPadX;
    drawAt('Total', x, headerY, 9, true, white);
    x = left + cols[0].w + cols[1].w + cols[2].w + cols[3].w + cellPadX;
    drawAt('Observações', x, headerY, 9, true, white);
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

    // Linha horizontal inferior do subcabeçalho
    line(left, subBottom, right, subBottom, 1, secondaryColor);

    // Linha vertical esquerda
    line(left, subTop, left, subBottom, 0.5, secondaryColor);

    // Linha após coluna "Dias"
    line(
      left + cols[0].w,
      subTop,
      left + cols[0].w,
      subBottom,
      0.5,
      secondaryColor
    );

    // Linhas verticais dentro de "Normal" (Início, Intervalo, Volta, Saída)
    line(normalStartX, subTop, normalStartX, subBottom, 0.5, secondaryColor);
    line(
      normalStartX + nW,
      subTop,
      normalStartX + nW,
      subBottom,
      0.5,
      secondaryColor
    );
    line(
      normalStartX + 2 * nW,
      subTop,
      normalStartX + 2 * nW,
      subBottom,
      0.5,
      secondaryColor
    );
    line(
      normalStartX + 3 * nW,
      subTop,
      normalStartX + 3 * nW,
      subBottom,
      0.5,
      secondaryColor
    );

    // Linha após coluna "Normal"
    line(
      normalStartX + normalWidth,
      subTop,
      normalStartX + normalWidth,
      subBottom,
      0.5,
      secondaryColor
    );

    // Linhas verticais dentro de "Extra" (Início, Saída)
    line(extraStartX, subTop, extraStartX, subBottom, 0.5, secondaryColor);
    line(
      extraStartX + eW,
      subTop,
      extraStartX + eW,
      subBottom,
      0.5,
      secondaryColor
    );

    // Linha após coluna "Extra"
    line(
      extraStartX + extraWidth,
      subTop,
      extraStartX + extraWidth,
      subBottom,
      0.5,
      secondaryColor
    );

    // Linha após coluna "Total"
    line(
      totalStartX + totalWidth,
      subTop,
      totalStartX + totalWidth,
      subBottom,
      0.5,
      secondaryColor
    );

    // Linha antes de "Observações" (após Total)
    const obsStartX = totalStartX + totalWidth;
    line(obsStartX, subTop, obsStartX, subBottom, 0.5, secondaryColor);

    // Linha vertical direita
    line(right, subTop, right, subBottom, 0.5, secondaryColor);

    const subHeaderY = subBottom + cellPadY + 1;
    drawAt(
      'Início',
      normalStartX + cellPadX,
      subHeaderY,
      8,
      true,
      secondaryColor
    );
    drawAt(
      'Intervalo',
      normalStartX + nW + cellPadX,
      subHeaderY,
      8,
      true,
      secondaryColor
    );
    drawAt(
      'Volta',
      normalStartX + 2 * nW + cellPadX,
      subHeaderY,
      8,
      true,
      secondaryColor
    );
    drawAt(
      'Saída',
      normalStartX + 3 * nW + cellPadX,
      subHeaderY,
      8,
      true,
      secondaryColor
    );

    drawAt(
      'Início',
      extraStartX + cellPadX,
      subHeaderY,
      8,
      true,
      secondaryColor
    );
    drawAt(
      'Saída',
      extraStartX + eW + cellPadX,
      subHeaderY,
      8,
      true,
      secondaryColor
    );
    drawAt(
      'Horas',
      totalStartX + cellPadX,
      subHeaderY,
      8,
      true,
      secondaryColor
    );
    y = subBottom;

    // Linhas dos dias com zebra striping
    for (let i = 0; i < table.length; i++) {
      const r = table[i];
      const rowTop = y;
      const rowBottom = y - rowH;
      // Aumentar limite mínimo para garantir espaço para o rodapé (precisa de ~100px)
      if (rowBottom < 100) break;

      // Zebra striping (linhas alternadas)
      const isEven = i % 2 === 0;
      if (isEven) {
        drawRect(left, rowBottom, right - left, rowH, white);
      } else {
        drawRect(left, rowBottom, right - left, rowH, rgb(0.98, 0.98, 0.98));
      }

      // Bordas horizontais
      line(left, rowBottom, right, rowBottom, 0.5, secondaryColor);

      // Bordas verticais
      line(left, rowTop, left, rowBottom, 0.5, secondaryColor);
      line(
        left + cols[0].w,
        rowTop,
        left + cols[0].w,
        rowBottom,
        0.5,
        secondaryColor
      );
      line(
        normalStartX + nW,
        rowTop,
        normalStartX + nW,
        rowBottom,
        0.5,
        secondaryColor
      );
      line(
        normalStartX + 2 * nW,
        rowTop,
        normalStartX + 2 * nW,
        rowBottom,
        0.5,
        secondaryColor
      );
      line(
        normalStartX + 3 * nW,
        rowTop,
        normalStartX + 3 * nW,
        rowBottom,
        0.5,
        secondaryColor
      );
      line(extraStartX, rowTop, extraStartX, rowBottom, 0.5, secondaryColor);
      line(
        extraStartX + eW,
        rowTop,
        extraStartX + eW,
        rowBottom,
        0.5,
        secondaryColor
      );
      line(
        extraStartX + extraWidth,
        rowTop,
        extraStartX + extraWidth,
        rowBottom,
        0.5,
        secondaryColor
      );
      line(
        totalStartX + totalWidth,
        rowTop,
        totalStartX + totalWidth,
        rowBottom,
        0.5,
        secondaryColor
      );
      // Linha antes de "Observações"
      const obsStartXRow = totalStartX + totalWidth;
      line(obsStartXRow, rowTop, obsStartXRow, rowBottom, 0.5, secondaryColor);
      line(right, rowTop, right, rowBottom, 0.5, secondaryColor);

      // Textos centralizados (melhor posicionamento vertical)
      const textY = rowBottom + cellPadY + 1;

      // Dia com destaque para fins de semana
      // Verificar se é fim de semana baseado no dia da semana
      const isWeekend = r.semana === 'Dom' || r.semana === 'Sáb';
      const dayColor = isWeekend ? rgb(0.8, 0.2, 0.2) : secondaryColor;

      // Formatar dia e semana: "01  Sáb" ou "15  Seg"
      const dayText = `${pad2(r.dia)}  ${r.semana}`;
      drawAt(dayText, left + cellPadX, textY, 8, true, dayColor);

      // Helper para centralizar texto
      const centerText = (
        t: string,
        xStart: number,
        width: number,
        color = secondaryColor
      ) => {
        const w = font.widthOfTextAtSize(t, 8);
        const xCenter = xStart + width / 2 - w / 2;
        drawAt(t, Math.max(xStart + cellPadX, xCenter), textY, 8, false, color);
      };

      // Verificar se há pontos adicionados manualmente (criadoPorId não null) ou editados (editadoPorId não null)
      const pontosManuais =
        r.pontos?.filter((p: any) => p.criadoPorId || p.editadoPorId) || [];
      const temPontosManuais = pontosManuais.length > 0;
      const corManual = rgb(0.8, 0.1, 0.1); // Vermelho para pontos manuais

      // Coletar observações de TODOS os pontos que têm observação (manuais ou editados)
      const observacoes: string[] = [];
      if (r.pontos && Array.isArray(r.pontos)) {
        r.pontos.forEach((p: any) => {
          // Verificar se o ponto tem observacao (pode ser null, undefined ou string vazia)
          const obs = p?.observacao;
          if (obs && typeof obs === 'string' && obs.trim().length > 0) {
            observacoes.push(obs.trim());
          }
        });
      }

      // Horários normais - destacar em vermelho se foram adicionados manualmente
      if (r.normalInicio) {
        const pontoEntrada = r.pontos?.find((p: any) => p.tipo === 'ENTRADA');
        const cor = pontoEntrada?.criadoPorId ? corManual : secondaryColor;
        centerText(r.normalInicio, normalStartX, nW, cor);
      }
      if (r.normalIntervalo) {
        const pontoIntervalo = r.pontos?.find(
          (p: any) => p.tipo === 'INTERVALO_INICIO'
        );
        const cor = pontoIntervalo?.criadoPorId ? corManual : secondaryColor;
        centerText(r.normalIntervalo, normalStartX + nW, nW, cor);
      }
      if (r.normalVoltaIntervalo) {
        const pontoVolta = r.pontos?.find(
          (p: any) => p.tipo === 'INTERVALO_FIM'
        );
        const cor = pontoVolta?.criadoPorId ? corManual : secondaryColor;
        centerText(r.normalVoltaIntervalo, normalStartX + 2 * nW, nW, cor);
      }
      if (r.normalTermino) {
        const pontoSaida = r.pontos?.find((p: any) => p.tipo === 'SAIDA');
        const cor = pontoSaida?.criadoPorId ? corManual : secondaryColor;
        centerText(r.normalTermino, normalStartX + 3 * nW, nW, cor);
      }

      // Horários extras
      if (r.extraInicio)
        centerText(r.extraInicio, extraStartX, eW, primaryColor);
      if (r.extraTermino)
        centerText(r.extraTermino, extraStartX + eW, eW, primaryColor);

      // Total de horas do dia (sempre exibir, mesmo se zero)
      const hoursColor =
        (r.totalMinutos ?? 0) > 0 ? primaryColor : secondaryColor;
      centerText(r.totalHoras || '0:00', totalStartX, totalWidth, hoursColor);

      // Observações - mostrar TODAS as observações (de pontos manuais ou editados)
      if (observacoes.length > 0) {
        const obsText = observacoes.join('; ');
        // Truncar se muito longo
        const maxObsWidth = cols[4].w - 2 * cellPadX;
        let obsDisplay = obsText;
        let obsWidth = font.widthOfTextAtSize(obsDisplay, 7);
        if (obsWidth > maxObsWidth) {
          // Tentar truncar
          while (obsWidth > maxObsWidth && obsDisplay.length > 0) {
            obsDisplay = obsDisplay.substring(0, obsDisplay.length - 1);
            obsWidth = font.widthOfTextAtSize(obsDisplay + '...', 7);
          }
          obsDisplay += '...';
        }
        // Desenhar observações em vermelho para destacar
        drawAt(obsDisplay, obsStartXRow + cellPadX, textY, 7, false, corManual);
      } else {
        // Se não há observações, deixar em branco ou mostrar traço
        drawAt('—', obsStartXRow + cellPadX, textY, 7, false, secondaryColor);
      }

      y = rowBottom;
    }

    // Rodapé com design melhorado - reduzir espaçamento para não ficar muito embaixo
    y -= 15;

    const issued = tzFormat(
      toZonedTime(new Date(), 'America/Sao_Paulo'),
      'dd/MM/yyyy HH:mm',
      {
        timeZone: 'America/Sao_Paulo',
      }
    );

    // Protocolo já foi gerado acima, usar a mesma variável
    const proto = protocolo;

    // Informações do rodapé
    const footerY = y - 5;

    // Nome e CPF do funcionário
    drawAt(`Funcionário: ${func.nome}`, 50, footerY, 9, true, secondaryColor);
    drawAt(
      `CPF: ${func.cpf || '-'}`,
      50,
      footerY - 11,
      9,
      false,
      secondaryColor
    );

    // Protocolo e data de emissão à direita
    drawAt(`Protocolo: ${proto}`, 400, footerY, 9, true, secondaryColor);
    drawAt(
      `Emitido em: ${issued}`,
      400,
      footerY - 11,
      9,
      false,
      secondaryColor
    );

    // Instrução sobre validação (mais abaixo para não sobrepor o CPF)
    y -= 25;
    drawAt(
      'Validado usando a foto presente no protocolo do sistema.',
      50,
      y,
      8,
      false,
      rgb(0.5, 0.5, 0.5)
    );

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="folha_${func.nome.replace(/\s+/g, '_')}_${month}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Erro ao processar folha de ponto:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar folha de ponto' },
      { status: 500 }
    );
  }
}
