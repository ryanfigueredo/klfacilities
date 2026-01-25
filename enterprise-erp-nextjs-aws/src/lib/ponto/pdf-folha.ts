import {
  PDFDocument,
  PDFPage,
  PDFFont,
  PDFImage,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import { toZonedTime, format as tzFormat } from 'date-fns-tz';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export type DiaRow = {
  dia: number;
  semana: string;
  normalInicio?: string;
  normalTermino?: string;
  normalIntervalo?: string;
  normalVoltaIntervalo?: string;
  extraInicio?: string;
  extraTermino?: string;
  totalHoras?: string;
  totalMinutos: number;
  pontos: any[];
};

export type FuncionarioData = {
  id: string;
  nome: string;
  cpf: string | null;
  grupo?: { nome: string } | null;
  unidade?: { nome: string } | null;
  unidadeId?: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function weekdayPtShort(d: Date) {
  const map = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayOfWeek = d.getDay();
  return map[dayOfWeek] || '';
}

// Função para converter hex para RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0.62, b: 0.89 }; // Default #009ee2
}

// Função para carregar fonte Figtree
async function embedFigtreeFont(
  pdfDoc: PDFDocument
): Promise<{ regular: any; bold: any }> {
  try {
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

      if (regularBytes.length > 1000 && boldBytes.length > 1000) {
        const regularFont = await pdfDoc.embedFont(regularBytes);
        const boldFont = await pdfDoc.embedFont(boldBytes);
        return { regular: regularFont, bold: boldFont };
      }
    }
  } catch (localError) {
    console.warn('Erro ao carregar fonte Figtree local:', localError);
  }

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  return { regular: regularFont, bold: boldFont };
}

// Função para carregar logo
async function loadLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  try {
    const logo512Path = join(process.cwd(), 'public', 'icon-512.png');
    const logo192Path = join(process.cwd(), 'public', 'icon-192.png');

    if (existsSync(logo512Path)) {
      const logoBytes = readFileSync(logo512Path);
      try {
        return await pdfDoc.embedPng(logoBytes);
      } catch {
        try {
          return await pdfDoc.embedJpg(logoBytes);
        } catch {
          console.warn('Formato de logo não suportado');
        }
      }
    } else if (existsSync(logo192Path)) {
      const logoBytes = readFileSync(logo192Path);
      try {
        return await pdfDoc.embedPng(logoBytes);
      } catch {
        try {
          return await pdfDoc.embedJpg(logoBytes);
        } catch {
          console.warn('Formato de logo não suportado');
        }
      }
    }
  } catch (error) {
    console.warn('Não foi possível carregar o logo:', error);
  }
  return null;
}

/**
 * Adiciona uma página de folha de ponto ao PDF usando o mesmo formato do PDF individual
 */
export async function addFolhaPageToPDF(
  pdfDoc: PDFDocument,
  funcionario: FuncionarioData,
  table: DiaRow[],
  month: string,
  totalHorasMes: number,
  totalMinutosMes: number,
  unidadeId?: string
): Promise<void> {
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 pt

  // Carregar fontes e logo
  const { regular: font, bold: boldFont } = await embedFigtreeFont(pdfDoc);
  const logoImage = await loadLogo(pdfDoc);

  // Cores
  const primaryColorHex = '#009ee2';
  const primaryColorRgb = hexToRgb(primaryColorHex);
  const primaryColor = rgb(
    primaryColorRgb.r,
    primaryColorRgb.g,
    primaryColorRgb.b
  );
  const secondaryColor = rgb(0.1, 0.1, 0.1);
  const lightGray = rgb(0.9, 0.9, 0.9);
  const white = rgb(1, 1, 1);

  // Parsing do mês
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  let yPos = 800;

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
      font: b ? boldFont : font,
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

  // Cabeçalho
  const headerLeft = 50;
  const margin = 50;
  const contentWidth = 595.28 - 2 * margin;

  // Barra superior
  page.drawLine({
    start: { x: margin, y: yPos - 3 },
    end: { x: margin + contentWidth, y: yPos - 3 },
    thickness: 2,
    color: primaryColor,
  });
  yPos -= 10;

  // Logo
  const logoSize = 50;
  if (logoImage) {
    const logoWidth = (logoImage.width / logoImage.height) * logoSize;
    page.drawImage(logoImage, {
      x: headerLeft,
      y: yPos - logoSize,
      width: logoWidth,
      height: logoSize,
    });
    yPos -= logoSize + 10;
  }

  // Título
  drawAt(
    'FOLHA DE PONTO INDIVIDUAL',
    headerLeft,
    yPos,
    12,
    false,
    primaryColor
  );
  yPos -= 18;

  // EMPRESA
  drawAt('EMPRESA:', headerLeft, yPos, 9, false, secondaryColor);
  drawAt(
    `${funcionario.grupo?.nome || '-'} - ${funcionario.unidade?.nome || '-'}`,
    headerLeft + 70,
    yPos,
    9,
    false,
    secondaryColor
  );
  yPos -= 12;

  // Total de horas
  const totalHorasText = `${totalHorasMes}:${String(totalMinutosMes % 60).padStart(2, '0')} (${totalMinutosMes} minutos)`;
  drawAt('TOTAL DE HORAS NO MÊS:', headerLeft, yPos, 9, false, secondaryColor);
  drawAt(totalHorasText, headerLeft + 140, yPos, 9, false, secondaryColor);
  yPos -= 12;

  // FUNCIONÁRIO
  drawAt('FUNCIONÁRIO:', headerLeft, yPos, 9, false, secondaryColor);
  drawAt(funcionario.nome, headerLeft + 90, yPos, 9, false, secondaryColor);
  yPos -= 12;

  // CPF
  drawAt('CPF:', headerLeft, yPos, 9, false, secondaryColor);
  drawAt(
    funcionario.cpf || '-',
    headerLeft + 40,
    yPos,
    9,
    false,
    secondaryColor
  );
  yPos -= 12;

  // Período
  drawAt(
    `Período: ${pad2(1)}/${pad2(m)}/${y} a ${pad2(daysInMonth)}/${pad2(m)}/${y}`,
    headerLeft,
    yPos,
    9,
    false,
    secondaryColor
  );
  yPos -= 18;

  // Tabela
  const left = 50;
  const right = 545;
  const rowH = 18;
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
  let headerTop = yPos;
  let headerBottom = yPos - rowH;

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
  yPos = headerBottom;

  const normalStartX = left + cols[0].w;
  const normalWidth = cols[1].w;
  const nW = normalWidth / 4;
  const extraStartX = normalStartX + normalWidth;
  const extraWidth = cols[2].w;
  const eW = extraWidth / 2;
  const totalStartX = extraStartX + extraWidth;
  const totalWidth = cols[3].w;

  const subTop = yPos;
  const subBottom = yPos - rowH;

  drawRect(left, subBottom, right - left, rowH, lightGray);

  line(left, subBottom, right, subBottom, 1, secondaryColor);
  line(left, subTop, left, subBottom, 0.5, secondaryColor);
  line(
    left + cols[0].w,
    subTop,
    left + cols[0].w,
    subBottom,
    0.5,
    secondaryColor
  );
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
  line(
    normalStartX + normalWidth,
    subTop,
    normalStartX + normalWidth,
    subBottom,
    0.5,
    secondaryColor
  );
  line(extraStartX, subTop, extraStartX, subBottom, 0.5, secondaryColor);
  line(
    extraStartX + eW,
    subTop,
    extraStartX + eW,
    subBottom,
    0.5,
    secondaryColor
  );
  line(
    extraStartX + extraWidth,
    subTop,
    extraStartX + extraWidth,
    subBottom,
    0.5,
    secondaryColor
  );
  line(
    totalStartX + totalWidth,
    subTop,
    totalStartX + totalWidth,
    subBottom,
    0.5,
    secondaryColor
  );
  const obsStartX = totalStartX + totalWidth;
  line(obsStartX, subTop, obsStartX, subBottom, 0.5, secondaryColor);
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
  drawAt('Início', extraStartX + cellPadX, subHeaderY, 8, true, secondaryColor);
  drawAt(
    'Saída',
    extraStartX + eW + cellPadX,
    subHeaderY,
    8,
    true,
    secondaryColor
  );
  drawAt('Horas', totalStartX + cellPadX, subHeaderY, 8, true, secondaryColor);
  yPos = subBottom;

  // Linhas dos dias
  for (let i = 0; i < table.length; i++) {
    const r = table[i];
    const rowTop = yPos;
    const rowBottom = yPos - rowH;
    // Aumentar limite mínimo para garantir espaço para o rodapé (precisa de ~100px)
    if (rowBottom < 100) break;

    const isEven = i % 2 === 0;
    if (isEven) {
      drawRect(left, rowBottom, right - left, rowH, white);
    } else {
      drawRect(left, rowBottom, right - left, rowH, rgb(0.98, 0.98, 0.98));
    }

    line(left, rowBottom, right, rowBottom, 0.5, secondaryColor);
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
    const obsStartXRow = totalStartX + totalWidth;
    line(obsStartXRow, rowTop, obsStartXRow, rowBottom, 0.5, secondaryColor);
    line(right, rowTop, right, rowBottom, 0.5, secondaryColor);

    const textY = rowBottom + cellPadY + 1;

    const isWeekend = r.semana === 'Dom' || r.semana === 'Sáb';
    const dayColor = isWeekend ? rgb(0.8, 0.2, 0.2) : secondaryColor;

    const dayText = `${pad2(r.dia)}  ${r.semana}`;
    drawAt(dayText, left + cellPadX, textY, 8, true, dayColor);

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

    if (r.normalInicio) centerText(r.normalInicio, normalStartX, nW);
    if (r.normalIntervalo) centerText(r.normalIntervalo, normalStartX + nW, nW);
    if (r.normalVoltaIntervalo)
      centerText(r.normalVoltaIntervalo, normalStartX + 2 * nW, nW);
    if (r.normalTermino) centerText(r.normalTermino, normalStartX + 3 * nW, nW);
    if (r.extraInicio) centerText(r.extraInicio, extraStartX, eW, primaryColor);
    if (r.extraTermino)
      centerText(r.extraTermino, extraStartX + eW, eW, primaryColor);

    const hoursColor =
      (r.totalMinutos ?? 0) > 0 ? primaryColor : secondaryColor;
    centerText(r.totalHoras || '0:00', totalStartX, totalWidth, hoursColor);

    yPos = rowBottom;
  }

  // Rodapé - reduzir espaçamento para não ficar muito embaixo
  yPos -= 15;

  const issued = tzFormat(
    toZonedTime(new Date(), 'America/Sao_Paulo'),
    'dd/MM/yyyy HH:mm',
    { timeZone: 'America/Sao_Paulo' }
  );

  const ym = `${y}-${pad2(m)}`;
  const payload = `${funcionario.id}.${funcionario.unidadeId || unidadeId || ''}.${ym}`;
  const hash = createHash('sha256').update(payload).digest('hex');
  const shortHash = hash.substring(0, 12).toUpperCase();
  const proto = `KL-${shortHash}`;

  const footerY = yPos - 5;
  drawAt(
    `Funcionário: ${funcionario.nome}`,
    50,
    footerY,
    9,
    true,
    secondaryColor
  );
  drawAt(
    `CPF: ${funcionario.cpf || '-'}`,
    50,
    footerY - 11,
    9,
    false,
    secondaryColor
  );
  drawAt(`Protocolo: ${proto}`, 400, footerY, 9, true, secondaryColor);
  drawAt(`Emitido em: ${issued}`, 400, footerY - 11, 9, false, secondaryColor);

  yPos -= 25;
  drawAt(
    'Validado usando a foto presente no protocolo do sistema.',
    50,
    yPos,
    8,
    false,
    rgb(0.5, 0.5, 0.5)
  );
}
