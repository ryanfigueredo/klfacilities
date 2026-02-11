import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { ChecklistResposta, ChecklistPerguntaTemplate } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  generatePresignedDownloadUrl,
  getObjectBuffer,
} from '@/lib/s3';
import fs from 'fs';
import path from 'path';

// Importar fontkit (necessário para fontes customizadas)
let fontkitInstance: any = null;
try {
  // Usar require para importação dinâmica do fontkit (necessário para funcionar no servidor)
  fontkitInstance = require('@pdf-lib/fontkit');
} catch (error) {
  console.warn(
    'Fontkit não disponível, fontes customizadas não funcionarão:',
    error
  );
}

interface ChecklistRespostaCompleta extends ChecklistResposta {
  template: {
    id: string;
    titulo: string;
    descricao: string | null;
    grupos: Array<{
      id: string;
      titulo: string;
      descricao: string | null;
      ordem: number;
      perguntas: Array<{
        id: string;
        titulo: string;
        descricao: string | null;
        tipo: string;
        ordem: number;
        opcoes: string[];
      }>;
    }>;
  };
  unidade: {
    id: string;
    nome: string;
  };
  grupo: {
    id: string;
    nome: string;
  } | null;
  supervisor: {
    id: string;
    name: string;
    email: string;
  };
  gerenteAssinadoPor?: {
    id: string;
    name: string;
    email: string;
  } | null;
  respostas: Array<{
    id: string;
    pergunta: ChecklistPerguntaTemplate;
    valorTexto: string | null;
    valorBoolean: boolean | null;
    valorNumero: number | null;
    valorOpcao: string | null;
    fotoUrl: string | null;
    observacao: string | null;
    nota: number | null;
  }>;
}

// Função para obter branding
async function getBranding() {
  const DEFAULT_BRANDING = {
    primaryColor: '#009ee2',
    secondaryColor: '#e8f5ff',
    accentColor: '#0088c7',
    companyName: 'KL Facilities',
  };

  try {
    const branding = await prisma.brandingSettings.findUnique({
      where: { id: 'default' },
    });

    if (!branding) {
      return {
        ...DEFAULT_BRANDING,
        logoUrl: getDefaultLogoUrl(),
      };
    }

    const logoDataUrl =
      branding.loginLogoDataUrl || branding.sidebarLogoDataUrl;

    return {
      primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor:
        branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      accentColor: branding.accentColor || DEFAULT_BRANDING.accentColor,
      companyName: DEFAULT_BRANDING.companyName,
      logoUrl: logoDataUrl || getDefaultLogoUrl(),
    };
  } catch (error) {
    console.error('Erro ao buscar branding:', error);
    return {
      ...DEFAULT_BRANDING,
      logoUrl: getDefaultLogoUrl(),
    };
  }
}

function getDefaultLogoUrl(): string {
  const useS3 = process.env.NEXT_PUBLIC_USE_S3_ASSETS === 'true';
  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
  const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'kl-checklist';
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
  const usePublicBucket = process.env.NEXT_PUBLIC_S3_PUBLIC_BUCKET === 'true';

  if (useS3 && cloudfrontUrl) {
    return `${cloudfrontUrl}/assets/logo-kl-light.png`;
  }

  if (useS3 && usePublicBucket) {
    return `https://${bucket}.s3.${region}.amazonaws.com/assets/logo-kl-light.png`;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://klfacilities.com.br';
  return `${baseUrl}/logo-kl-light.png`;
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

// Função para carregar fonte Figtree do Google Fonts
async function embedFigtreeFont(
  pdfDoc: PDFDocument
): Promise<{ regular: any; bold: any }> {
  try {
    // Tentar carregar Figtree TTF diretamente do Google Fonts
    // URL direta para o arquivo TTF da fonte Figtree Regular
    const regularUrl =
      'https://github.com/google/fonts/raw/main/ofl/figtree/Figtree-Regular.ttf';
    const boldUrl =
      'https://github.com/google/fonts/raw/main/ofl/figtree/Figtree-SemiBold.ttf';

    try {
      const regularResponse = await fetch(regularUrl);
      const boldResponse = await fetch(boldUrl);

      if (regularResponse.ok && boldResponse.ok) {
        const regularBytes = await regularResponse.arrayBuffer();
        const boldBytes = await boldResponse.arrayBuffer();

        const regularFont = await pdfDoc.embedFont(Buffer.from(regularBytes));
        const boldFont = await pdfDoc.embedFont(Buffer.from(boldBytes));

        return { regular: regularFont, bold: boldFont };
      }
    } catch (fetchError) {
      console.warn('Erro ao baixar fonte Figtree do GitHub:', fetchError);
    }

    // Fallback: tentar carregar do diretório local se existir
    try {
      const regularPath = path.join(
        process.cwd(),
        'public',
        'fonts',
        'Figtree-Regular.ttf'
      );
      const boldPath = path.join(
        process.cwd(),
        'public',
        'fonts',
        'Figtree-SemiBold.ttf'
      );

      if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
        const regularBytes = fs.readFileSync(regularPath);
        const boldBytes = fs.readFileSync(boldPath);

        const regularFont = await pdfDoc.embedFont(regularBytes);
        const boldFont = await pdfDoc.embedFont(boldBytes);

        return { regular: regularFont, bold: boldFont };
      }
    } catch (localError) {
      console.warn('Erro ao carregar fonte Figtree local:', localError);
    }

    // Fallback final: usar Helvetica
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    return { regular: regularFont, bold: boldFont };
  } catch (error) {
    console.warn(
      'Não foi possível carregar fonte Figtree, usando Helvetica:',
      error
    );
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    return { regular: regularFont, bold: boldFont };
  }
}

// Função para baixar e embedar imagem
async function embedImageFromUrl(
  pdfDoc: PDFDocument,
  imageUrl: string
): Promise<any> {
  try {
    if (imageUrl.startsWith('s3://')) {
      console.warn('URLs s3:// não suportadas diretamente');
      return null;
    }

    // Se for data URL (base64), processar diretamente
    if (imageUrl.startsWith('data:image/')) {
      try {
        // Extrair o tipo MIME e os dados base64
        const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length < 3) {
          console.warn('Data URL inválida - formato não reconhecido');
          return null;
        }

        const mimeType = matches[1].toLowerCase();
        const base64Data = matches[2];

        if (!base64Data) {
          console.warn('Data URL inválida - sem dados base64');
          return null;
        }

        const buffer = Buffer.from(base64Data, 'base64');

        // Tentar embedar baseado no tipo MIME
        if (mimeType === 'png' || mimeType === 'apng') {
          return await pdfDoc.embedPng(buffer);
        } else if (mimeType === 'jpeg' || mimeType === 'jpg') {
          return await pdfDoc.embedJpg(buffer);
        } else {
          // Tentar PNG primeiro, depois JPG
          try {
            return await pdfDoc.embedPng(buffer);
          } catch {
            try {
              return await pdfDoc.embedJpg(buffer);
            } catch {
              console.warn(
                `Formato de imagem não suportado (data URL): ${mimeType}`
              );
              return null;
            }
          }
        }
      } catch (error) {
        console.warn('Erro ao processar data URL:', error);
        return null;
      }
    }

    // Se for URL do S3, baixar via SDK (evita fetch em bucket privado e falha de presigned)
    if (imageUrl.includes('amazonaws.com') && !imageUrl.includes('?')) {
      try {
        const urlObj = new URL(imageUrl);
        const key = urlObj.pathname.startsWith('/')
          ? urlObj.pathname.substring(1)
          : urlObj.pathname;
        // bucket.s3.region.amazonaws.com -> bucket
        const hostParts = urlObj.hostname.split('.');
        const bucket =
          hostParts.length >= 4 && hostParts[1] === 's3'
            ? hostParts[0]
            : undefined;
        if (key) {
          const buffer = await getObjectBuffer(key, bucket);
          if (buffer && buffer.length > 0) {
            const lower = (key || '').toLowerCase();
            try {
              if (lower.endsWith('.png')) {
                return await pdfDoc.embedPng(buffer);
              }
              if (
                lower.endsWith('.jpg') ||
                lower.endsWith('.jpeg') ||
                lower.endsWith('.jpe')
              ) {
                return await pdfDoc.embedJpg(buffer);
              }
              try {
                return await pdfDoc.embedPng(buffer);
              } catch {
                return await pdfDoc.embedJpg(buffer);
              }
            } catch (embedError) {
              console.warn('[PDF] Erro ao embedar imagem S3:', embedError);
            }
          }
        }
      } catch (urlError) {
        console.warn('[PDF] Erro ao baixar imagem do S3:', urlError);
      }
    }

    // Se for URL do CloudFront, o pathname costuma ser o mesmo que a key no S3
    if (imageUrl.includes('cloudfront.net')) {
      try {
        const urlObj = new URL(imageUrl);
        const key = urlObj.pathname.startsWith('/')
          ? urlObj.pathname.substring(1)
          : urlObj.pathname;
        if (key) {
          const buffer = await getObjectBuffer(key);
          if (buffer && buffer.length > 0) {
            const lower = key.toLowerCase();
            try {
              if (lower.endsWith('.png')) {
                return await pdfDoc.embedPng(buffer);
              }
              if (
                lower.endsWith('.jpg') ||
                lower.endsWith('.jpeg') ||
                lower.endsWith('.jpe')
              ) {
                return await pdfDoc.embedJpg(buffer);
              }
              try {
                return await pdfDoc.embedPng(buffer);
              } catch {
                return await pdfDoc.embedJpg(buffer);
              }
            } catch (embedError) {
              console.warn('[PDF] Erro ao embedar imagem CloudFront:', embedError);
            }
          }
        }
      } catch (urlError) {
        console.warn('[PDF] Erro ao baixar imagem do CloudFront:', urlError);
      }
    }

    // URLs HTTP(S): usar presigned se for S3 ou fetch direto
    let finalUrl = imageUrl;
    const s3Bucket =
      process.env.AWS_S3_BUCKET ||
      process.env.NEXT_PUBLIC_AWS_S3_BUCKET ||
      'kl-checklist';

    if (imageUrl.includes('amazonaws.com') && !imageUrl.includes('?')) {
      try {
        const urlObj = new URL(imageUrl);
        const key = urlObj.pathname.startsWith('/')
          ? urlObj.pathname.substring(1)
          : urlObj.pathname;
        const hostParts = urlObj.hostname.split('.');
        const bucket =
          hostParts.length >= 4 && hostParts[1] === 's3' ? hostParts[0] : undefined;
        if (key) {
          try {
            finalUrl = await generatePresignedDownloadUrl(key, 3600, bucket);
          } catch (presignError) {
            console.warn(
              '[PDF] Erro ao gerar presigned URL, tentando URL original:',
              presignError
            );
          }
        }
      } catch (urlError) {
        console.warn('[PDF] Erro ao processar URL S3:', urlError);
      }
    } else if (
      imageUrl.includes('s3.') &&
      imageUrl.includes(s3Bucket) &&
      !imageUrl.includes('?')
    ) {
      try {
        const urlObj = new URL(imageUrl);
        const key = urlObj.pathname.startsWith('/')
          ? urlObj.pathname.substring(1)
          : urlObj.pathname;
        if (key) {
          try {
            finalUrl = await generatePresignedDownloadUrl(key, 3600);
          } catch (presignError) {
            console.warn(
              '[PDF] Erro ao gerar presigned URL (s3Bucket):',
              presignError
            );
          }
        }
      } catch (urlError) {
        console.warn('[PDF] Erro ao processar URL do S3:', urlError);
      }
    }

    // URL relativa (ex: /api/...): resolver com base da aplicação
    if (
      (finalUrl.startsWith('/') || finalUrl.startsWith('.')) &&
      process.env.NEXT_PUBLIC_APP_URL
    ) {
      const base = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
      finalUrl = finalUrl.startsWith('/') ? `${base}${finalUrl}` : `${base}/${finalUrl}`;
    }

    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'image/png,image/jpeg,image/*,*/*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.warn(
        `[PDF] Erro ao buscar imagem: ${response.status} - ${response.statusText} - URL: ${finalUrl.substring(0, 100)}`
      );
      return null;
    }

    // Verificar content-type
    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verificar se o buffer não está vazio
    if (buffer.length === 0) {
      console.warn('Imagem retornou buffer vazio');
      return null;
    }

    // Tentar embedar baseado no content-type ou tentar ambos os formatos
    try {
      if (contentType.includes('png')) {
        return await pdfDoc.embedPng(buffer);
      } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        return await pdfDoc.embedJpg(buffer);
      } else {
        // Tentar PNG primeiro, depois JPG
        try {
          return await pdfDoc.embedPng(buffer);
        } catch {
          try {
            return await pdfDoc.embedJpg(buffer);
          } catch {
            console.warn(
              `Formato de imagem não suportado: ${contentType || 'desconhecido'}`
            );
            return null;
          }
        }
      }
    } catch (embedError) {
      console.warn('Erro ao embedar imagem:', embedError);
      return null;
    }
  } catch (error) {
    console.warn('Erro ao carregar imagem:', error);
    return null;
  }
}

// Função para quebrar texto em múltiplas linhas
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: any
): string[] {
  // Remover apenas quebras de linha, mantendo caracteres especiais (acentos, etc)
  const cleanText = text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
  const words = cleanText.split(' ').filter(w => w.length > 0);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Tentar medir o texto, se falhar por causa de caracteres especiais, usar aproximação
    let width: number;
    try {
      width = font.widthOfTextAtSize(testLine, fontSize);
    } catch (error) {
      // Se falhar, usar aproximação baseada no comprimento
      width = testLine.length * fontSize * 0.6;
    }

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Função para obter cor da nota
function getNotaColor(nota: number): { r: number; g: number; b: number } {
  if (nota >= 4.5) return { r: 0.27, g: 0.76, b: 0.31 }; // Verde claro (5) - Ótimo
  if (nota >= 3.5) return { r: 0.13, g: 0.59, b: 0.13 }; // Verde (4) - Bom
  if (nota >= 2.5) return { r: 1, g: 0.84, b: 0 }; // Amarelo (3) - Regular
  if (nota >= 1.5) return { r: 1, g: 0.65, b: 0 }; // Laranja (2) - Ruim
  return { r: 0.96, g: 0.26, b: 0.21 }; // Vermelho (1) - Péssimo
}

// Função para obter label da nota
function getNotaLabel(nota: number): string {
  if (nota >= 4.5) return 'Ótimo';
  if (nota >= 3.5) return 'Bom';
  if (nota >= 2.5) return 'Regular';
  if (nota >= 1.5) return 'Ruim';
  return 'Péssimo';
}

// Função para desenhar medidor visual de pontuação
function drawPontuacaoMedidor(
  page: any,
  x: number,
  y: number,
  width: number,
  pontuacao: number,
  font: any
) {
  const height = 8;
  const segmentWidth = width / 5; // 5 segmentos (1-5)

  // Cores dos segmentos
  const cores = [
    rgb(0.96, 0.26, 0.21), // Vermelho (1)
    rgb(1, 0.65, 0), // Laranja (2)
    rgb(1, 0.84, 0), // Amarelo (3)
    rgb(0.13, 0.59, 0.13), // Verde (4)
    rgb(0.27, 0.76, 0.31), // Verde claro (5)
  ];

  // Desenhar segmentos coloridos
  for (let i = 0; i < 5; i++) {
    page.drawRectangle({
      x: x + i * segmentWidth,
      y: y,
      width: segmentWidth,
      height: height,
      color: cores[i],
    });
  }

  // Desenhar ponteiro (linha vertical) na posição da pontuação
  const pointerX = x + (pontuacao / 100) * width;
  const pointerHeight = 6;

  // Linha vertical como ponteiro
  page.drawLine({
    start: { x: pointerX, y: y - pointerHeight },
    end: { x: pointerX, y: y + height },
    thickness: 2,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Círculo pequeno no topo do ponteiro
  page.drawEllipse({
    x: pointerX,
    y: y + height + 2,
    xScale: 2,
    yScale: 2,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Valor da pontuação acima do medidor
  const pontuacaoTexto = `${pontuacao.toFixed(2)}%`;
  const textoWidth = font.widthOfTextAtSize(pontuacaoTexto, 8);
  page.drawText(pontuacaoTexto, {
    x: pointerX - textoWidth / 2,
    y: y + height + 8,
    size: 8,
    font: font,
    color: rgb(0, 0, 0),
  });
}

export async function generateChecklistPDF(
  resposta: ChecklistRespostaCompleta
): Promise<Buffer> {
  try {
    const branding = await getBranding();
    const primaryColor = hexToRgb(branding.primaryColor);
    const accentColor = hexToRgb(branding.accentColor);

    const pdfDoc = await PDFDocument.create();
    // Registrar fontkit para permitir uso de fontes customizadas (se disponível)
    if (fontkitInstance) {
      try {
        pdfDoc.registerFontkit(fontkitInstance);
      } catch (error) {
        console.warn('Erro ao registrar fontkit, usando fontes padrão:', error);
      }
    }
    const pageSize: [number, number] = [595, 842]; // A4 vertical
    const page = pdfDoc.addPage(pageSize);
    const { width, height } = page.getSize();
    const margin = 50;
    const contentWidth = width - 2 * margin;

    // Carregar fonte Figtree (mesma do sistema)
    const { regular: figtreeFont, bold: figtreeBoldFont } =
      await embedFigtreeFont(pdfDoc);
    const regularFont = figtreeFont;
    const boldFont = figtreeBoldFont;

    // Carregar logo
    let logoImage;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'icon-192.png');
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        try {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } catch {
          try {
            logoImage = await pdfDoc.embedJpg(logoBytes);
          } catch {
            console.warn('Formato de logo não suportado');
          }
        }
      } else if (branding.logoUrl) {
        logoImage = await embedImageFromUrl(pdfDoc, branding.logoUrl);
      }
    } catch (error) {
      console.warn('Não foi possível carregar o logo:', error);
    }

    let yPos = height - margin;
    let currentPage = page;

    // Barra superior sutil
    currentPage.drawLine({
      start: { x: margin, y: yPos - 3 },
      end: { x: margin + contentWidth, y: yPos - 3 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });
    yPos -= 10;

    // Calcular pontuação média
    const notasComValor = resposta.respostas
      .filter(r => r.nota !== null && r.nota !== undefined)
      .map(r => r.nota as number);
    const pontuacaoMedia =
      notasComValor.length > 0
        ? notasComValor.reduce((acc, nota) => acc + nota, 0) /
          notasComValor.length
        : 0;
    const pontuacaoMediaFormatada = pontuacaoMedia.toFixed(2);
    const pontuacaoMediaColor = getNotaColor(pontuacaoMedia);
    const pontuacaoMediaLabel = getNotaLabel(pontuacaoMedia);

    // Logo acima do título
    const logoSize = 50;
    const logoX = margin;
    let logoY = yPos;
    if (logoImage) {
      const logoWidth = (logoImage.width / logoImage.height) * logoSize;
      currentPage.drawImage(logoImage, {
        x: logoX,
        y: logoY - logoSize,
        width: logoWidth,
        height: logoSize,
      });
      logoY -= logoSize + 8; // Espaço após logo
    }

    // Header compacto - título pequeno
    const tituloX = margin;
    currentPage.drawText('Relatório de Conformidade', {
      x: tituloX,
      y: logoY - 5,
      size: 12,
      font: regularFont,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    yPos = logoY - 20;

    // Layout compacto com informações abaixo do título
    const infoStartX = margin;
    const infoWidth = contentWidth;

    // Layout reorganizado: Coluna 1: Unidade/Grupo | Coluna 2: Medidor/Data
    const colWidth = infoWidth / 2;
    const col1X = infoStartX;
    const col2X = infoStartX + colWidth;
    const linha1Y = yPos - 5;
    const linha2Y = yPos - 35; // Mais espaço para o medidor

    // Coluna 1 - Linha 1: Unidade
    currentPage.drawText('Unidade', {
      x: col1X,
      y: linha1Y + 8,
      size: 6,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    currentPage.drawText(resposta.unidade.nome, {
      x: col1X,
      y: linha1Y,
      size: 8,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Coluna 1 - Linha 2: Grupo
    if (resposta.grupo) {
      currentPage.drawText('Grupo', {
        x: col1X,
        y: linha2Y + 8,
        size: 6,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });
      currentPage.drawText(resposta.grupo.nome, {
        x: col1X,
        y: linha2Y,
        size: 8,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    // Coluna 2 - Linha 1: Medidor de Pontuação
    if (pontuacaoMedia > 0) {
      currentPage.drawText('Pontuação', {
        x: col2X,
        y: linha1Y + 8,
        size: 6,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Converter pontuação (1-5) para porcentagem (0-100)
      const pontuacaoPercentual = (pontuacaoMedia / 5) * 100;

      // Desenhar medidor visual
      const medidorWidth = colWidth - 10;
      const medidorX = col2X;
      const medidorY = linha1Y - 5;

      drawPontuacaoMedidor(
        currentPage,
        medidorX,
        medidorY,
        medidorWidth,
        pontuacaoPercentual,
        regularFont
      );
    }

    // Coluna 2 - Linha 2: Data (embaixo do medidor)
    const dataFormatada = new Date(
      resposta.submittedAt || resposta.createdAt
    ).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
    currentPage.drawText('Data', {
      x: col2X,
      y: linha2Y + 8,
      size: 6,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    currentPage.drawText(dataFormatada, {
      x: col2X,
      y: linha2Y,
      size: 8,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    yPos -= logoSize + 5;

    // Linha inferior decorativa
    currentPage.drawLine({
      start: { x: margin, y: yPos },
      end: { x: margin + contentWidth, y: yPos },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });
    yPos -= 15;

    // Título do template - menor
    currentPage.drawText(resposta.template.titulo, {
      x: margin,
      y: yPos,
      size: 14,
      font: regularFont,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });
    yPos -= 16;

    // Descrição do template
    if (resposta.template.descricao) {
      const descLines = wrapText(
        resposta.template.descricao,
        contentWidth,
        10,
        regularFont
      );
      for (const line of descLines) {
        currentPage.drawText(line, {
          x: margin,
          y: yPos,
          size: 10,
          font: regularFont,
          color: rgb(0, 0, 0),
        });
        yPos -= 12;
      }
      yPos -= 5;
    }

    // Informações do supervisor
    currentPage.drawText(
      `Supervisor: ${resposta.supervisor.name} (${resposta.supervisor.email})`,
      {
        x: margin,
        y: yPos,
        size: 10,
        font: regularFont,
        color: rgb(0, 0, 0),
      }
    );
    yPos -= 12;

    if (resposta.protocolo) {
      currentPage.drawText(`Protocolo: ${resposta.protocolo}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
      yPos -= 12;
    }

    yPos -= 10;

    // Grupos e perguntas
    for (const grupo of resposta.template.grupos.sort(
      (a, b) => a.ordem - b.ordem
    )) {
      // Verificar se precisa de nova página
      if (yPos < margin + 100) {
        currentPage = pdfDoc.addPage(pageSize);
        yPos = height - margin;
      }

      // Espaçamento antes do grupo
      yPos -= 15;

      // Linha suave de separação antes do grupo
      currentPage.drawLine({
        start: { x: margin, y: yPos },
        end: { x: margin + contentWidth, y: yPos },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      });
      yPos -= 12;

      // Título do grupo - estilo moderno
      currentPage.drawText(grupo.titulo, {
        x: margin,
        y: yPos,
        size: 13,
        font: regularFont,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
      });
      yPos -= 18;

      // Descrição do grupo - estilo moderno
      if (grupo.descricao) {
        const descLines = wrapText(
          grupo.descricao,
          contentWidth - 20,
          8,
          regularFont
        );
        for (const line of descLines) {
          if (yPos < margin + 50) {
            currentPage = pdfDoc.addPage(pageSize);
            yPos = height - margin;
          }
          currentPage.drawText(line, {
            x: margin + 15,
            y: yPos,
            size: 8,
            font: regularFont,
            color: rgb(0.5, 0.5, 0.5),
          });
          yPos -= 10;
        }
        yPos -= 5;
      }

      const perguntasGrupo = grupo.perguntas.sort((a, b) => a.ordem - b.ordem);

      for (const pergunta of perguntasGrupo) {
        const respostaPergunta = resposta.respostas.find(
          r => r.pergunta.id === pergunta.id
        );

        // Verificar se precisa de nova página
        if (yPos < margin + 80) {
          currentPage = pdfDoc.addPage(pageSize);
          yPos = height - margin;
        }

        // Espaçamento antes da pergunta
        yPos -= 10;

        // Linha suave de separação entre perguntas - mais visível
        currentPage.drawLine({
          start: { x: margin + 15, y: yPos },
          end: { x: margin + contentWidth - 15, y: yPos },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });
        yPos -= 10;

        // Layout em duas colunas: pergunta à esquerda, pontuação à direita
        const perguntaColWidth = contentWidth - 80; // Espaço para coluna de pontuação
        const pontuacaoColX = margin + perguntaColWidth + 10;

        // Título da pergunta
        const perguntaText = `${pergunta.ordem}. ${pergunta.titulo}`;
        const perguntaLines = wrapText(
          perguntaText,
          perguntaColWidth - 20,
          9,
          regularFont
        );
        let perguntaStartY = yPos;
        for (const line of perguntaLines) {
          currentPage.drawText(line, {
            x: margin + 15,
            y: yPos,
            size: 9,
            font: regularFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          yPos -= 11;
        }

        // Pontuação na coluna direita (alinhada ao topo da pergunta) - apenas bolinha colorida
        if (
          respostaPergunta &&
          respostaPergunta.nota !== null &&
          respostaPergunta.nota !== undefined
        ) {
          const notaColor = getNotaColor(respostaPergunta.nota);

          // Apenas círculo colorido, sem texto ou label
          currentPage.drawEllipse({
            x: pontuacaoColX,
            y: perguntaStartY - 2,
            xScale: 4,
            yScale: 4,
            color: rgb(notaColor.r, notaColor.g, notaColor.b),
          });
        }

        // Descrição da pergunta com indentação
        if (pergunta.descricao) {
          const descLines = wrapText(
            pergunta.descricao,
            contentWidth - 30,
            8,
            regularFont
          );
          for (const line of descLines) {
            currentPage.drawText(line, {
              x: margin + 25,
              y: yPos,
              size: 8,
              font: regularFont,
              color: rgb(0.5, 0.5, 0.5),
            });
            yPos -= 10;
          }
        }

        // Resposta - mostrar todas as perguntas, mesmo sem resposta
        if (respostaPergunta) {
          if (pergunta.tipo === 'BOOLEANO') {
            const valor = respostaPergunta.valorBoolean
              ? '[OK] CONFORME'
              : '[X] NAO CONFORME';
            const cor = respostaPergunta.valorBoolean
              ? rgb(0.13, 0.77, 0.37) // green
              : rgb(0.94, 0.27, 0.27); // red

            currentPage.drawText(`Resposta: ${valor}`, {
              x: margin + 25,
              y: yPos,
              size: 9,
              font: regularFont,
              color: cor,
            });
            yPos -= 14;
          } else if (pergunta.tipo === 'TEXTO') {
            const texto = respostaPergunta.valorTexto || 'Não informado';
            const conformeLabel =
              respostaPergunta.valorBoolean === true ? 'Conforme. ' : '';
            const textoLines = wrapText(
              `Resposta: ${conformeLabel}${texto}`,
              contentWidth - 30,
              9,
              regularFont
            );
            for (const line of textoLines) {
              currentPage.drawText(line, {
                x: margin + 25,
                y: yPos,
                size: 9,
                font: regularFont,
                color: rgb(0, 0, 0),
              });
              yPos -= 11;
            }
          } else if (pergunta.tipo === 'NUMERICO') {
            const numero = respostaPergunta.valorNumero ?? 'Não informado';
            currentPage.drawText(`Resposta: ${numero}`, {
              x: margin + 25,
              y: yPos,
              size: 9,
              font: regularFont,
              color: rgb(0, 0, 0),
            });
            yPos -= 14;
          } else if (pergunta.tipo === 'SELECAO') {
            const opcao = respostaPergunta.valorOpcao || 'Não informado';
            currentPage.drawText(`Resposta: ${opcao}`, {
              x: margin + 25,
              y: yPos,
              size: 9,
              font: regularFont,
              color: rgb(0, 0, 0),
            });
            yPos -= 14;
          } else if (pergunta.tipo === 'FOTO' && !respostaPergunta.fotoUrl) {
            currentPage.drawText('Resposta: Foto não anexada', {
              x: margin + 25,
              y: yPos,
              size: 9,
              font: regularFont,
              color: rgb(0.5, 0.5, 0.5),
            });
            yPos -= 14;
          }
        } else {
          // Pergunta não respondida
          currentPage.drawText('Resposta: Não respondida', {
            x: margin + 25,
            y: yPos,
            size: 9,
            font: regularFont,
            color: rgb(0.7, 0.7, 0.7),
          });
          yPos -= 14;
        }

        // Observação se houver (apenas se tiver resposta)
        if (respostaPergunta && respostaPergunta.observacao) {
          let observacaoTexto = respostaPergunta.observacao;

          // Se for "Não Conforme", verificar formato da observação
          if (
            pergunta.tipo === 'BOOLEANO' &&
            respostaPergunta.valorBoolean === false
          ) {
            // Verificar se já está no formato "Motivo: ... O que foi feito para resolver: ..."
            if (
              observacaoTexto.includes('Motivo:') &&
              observacaoTexto.includes('O que foi feito para resolver:')
            ) {
              // Já está formatado, usar direto
            } else {
              // Tentar parsear JSON
              try {
                const parsed = JSON.parse(respostaPergunta.observacao);
                if (parsed.motivo && parsed.resolucao) {
                  observacaoTexto = `Motivo: ${parsed.motivo}\n\nO que foi feito para resolver: ${parsed.resolucao}`;
                }
              } catch {
                // Se não for JSON, usar o texto direto
              }
            }
          }

          // Título da observação
          currentPage.drawText('Observação:', {
            x: margin + 25,
            y: yPos,
            size: 8,
            font: boldFont,
            color: rgb(0.2, 0.2, 0.2),
          });
          yPos -= 12;

          // Dividir em linhas preservando quebras de linha
          const linhasObservacao = observacaoTexto.split('\n');
          for (const linha of linhasObservacao) {
            if (linha.trim()) {
              const obsLines = wrapText(
                linha.trim(),
                contentWidth - 30,
                8,
                regularFont
              );
              for (const line of obsLines) {
                currentPage.drawText(line, {
                  x: margin + 25,
                  y: yPos,
                  size: 8,
                  font: regularFont,
                  color: rgb(0.2, 0.2, 0.2),
                });
                yPos -= 10;
              }
            } else {
              // Linha vazia - pular um pouco
              yPos -= 5;
            }
          }
        }

        // Fotos (FOTO principal ou anexos em qualquer tipo): sempre que houver fotoUrl
        if (respostaPergunta && respostaPergunta.fotoUrl) {
          let fotoUrls: string[] = [];
          try {
            const parsed = JSON.parse(respostaPergunta.fotoUrl);
            if (Array.isArray(parsed)) {
              fotoUrls = parsed;
            } else {
              fotoUrls = [respostaPergunta.fotoUrl];
            }
          } catch {
            fotoUrls = [respostaPergunta.fotoUrl];
          }

          if (fotoUrls.length > 0) {
            // Legenda da pergunta
            const legendaText = `${pergunta.ordem}. ${pergunta.titulo}${fotoUrls.length > 1 ? ` (${fotoUrls.length} fotos)` : ''}`;
            const legendaLines = wrapText(
              legendaText,
              contentWidth - 30,
              8,
              regularFont
            );

            // Verificar se precisa de nova página antes de começar as fotos
            const fotoHeight = 120; // Altura reduzida para caber lado a lado
            const fotoWidth = (contentWidth - 40) / 2; // Largura para 2 colunas (com espaçamento)
            const espacoPorLinha = fotoHeight + 30; // Altura da foto + legenda + espaçamento
            const linhasNecessarias = Math.ceil(fotoUrls.length / 2);
            const espacoTotal =
              legendaLines.length * 10 +
              linhasNecessarias * espacoPorLinha +
              10;

            if (yPos - espacoTotal < margin) {
              currentPage = pdfDoc.addPage(pageSize);
              yPos = height - margin;
            }

            // Desenhar legenda
            for (const line of legendaLines) {
              currentPage.drawText(line, {
                x: margin + 25,
                y: yPos,
                size: 8,
                font: boldFont,
                color: rgb(0.2, 0.2, 0.2),
              });
              yPos -= 10;
            }
            yPos -= 5;

            // Organizar fotos em grid de 2 colunas
            const colunas = 2;
            const espacoEntreColunas = 10;
            const larguraFoto =
              (contentWidth - 30 - espacoEntreColunas) / colunas;
            const alturaFoto = 120;
            const espacoEntreLinhas = 15;

            for (let i = 0; i < fotoUrls.length; i++) {
              const fotoUrl = fotoUrls[i];
              if (!fotoUrl || typeof fotoUrl !== 'string') continue;

              const coluna = i % colunas;
              const linha = Math.floor(i / colunas);

              // Se mudou de linha, ajustar yPos ANTES de desenhar
              if (coluna === 0 && linha > 0) {
                yPos -= alturaFoto + espacoEntreLinhas; // Espaço para próxima linha
                if (yPos - alturaFoto < margin) {
                  currentPage = pdfDoc.addPage(pageSize);
                  yPos = height - margin;
                }
              }

              const xPos =
                margin + 25 + coluna * (larguraFoto + espacoEntreColunas);
              const yPosFoto = yPos - alturaFoto; // Posição Y da foto (canto superior esquerdo)

              try {
                const fotoImage = await embedImageFromUrl(pdfDoc, fotoUrl);
                if (fotoImage) {
                  // Calcular dimensões mantendo proporção
                  let imgWidth = fotoImage.width;
                  let imgHeight = fotoImage.height;
                  const ratio = Math.min(
                    larguraFoto / imgWidth,
                    alturaFoto / imgHeight
                  );
                  imgWidth = imgWidth * ratio;
                  imgHeight = imgHeight * ratio;

                  // Centralizar na célula se a imagem for menor
                  const xOffset = (larguraFoto - imgWidth) / 2;
                  const yOffset = (alturaFoto - imgHeight) / 2;

                  // Desenhar imagem
                  currentPage.drawImage(fotoImage, {
                    x: xPos + xOffset,
                    y: yPosFoto + yOffset,
                    width: imgWidth,
                    height: imgHeight,
                  });

                  // Número da foto (se houver múltiplas)
                  if (fotoUrls.length > 1) {
                    currentPage.drawRectangle({
                      x: xPos + 5,
                      y: yPosFoto + alturaFoto - 20,
                      width: 20,
                      height: 15,
                      color: rgb(0, 0, 0),
                      opacity: 0.7,
                    });
                    currentPage.drawText(`${i + 1}`, {
                      x: xPos + 8,
                      y: yPosFoto + alturaFoto - 18,
                      size: 8,
                      font: boldFont,
                      color: rgb(1, 1, 1),
                    });
                  }
                }
              } catch (error) {
                console.warn(
                  `Erro ao carregar foto ${i + 1} (${pergunta.titulo}):`,
                  error
                );
                // Desenhar placeholder de erro
                currentPage.drawText(`Erro ao carregar foto ${i + 1}`, {
                  x: xPos,
                  y: yPosFoto + alturaFoto / 2,
                  size: 7,
                  font: regularFont,
                  color: rgb(0.7, 0.7, 0.7),
                });
              }
            }

            // Ajustar yPos após todas as fotos (apenas na última linha)
            if (fotoUrls.length > 0) {
              yPos -= alturaFoto + 10; // Espaço após a última linha de fotos
            }
          }
        }

        // Espaçamento após a resposta (a linha virá antes da próxima pergunta)
        yPos -= 5;
      }

      yPos -= 10;
    }

    // Observações gerais
    if (resposta.observacoes) {
      if (yPos < margin + 100) {
        currentPage = pdfDoc.addPage(pageSize);
        yPos = height - margin;
      }

      yPos -= 15;
      currentPage.drawText('Observações Gerais:', {
        x: margin,
        y: yPos,
        size: 12,
        font: boldFont,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
      });
      yPos -= 15;

      const obsLines = wrapText(
        resposta.observacoes,
        contentWidth,
        10,
        regularFont
      );
      for (const line of obsLines) {
        if (yPos < margin + 50) {
          currentPage = pdfDoc.addPage(pageSize);
          yPos = height - margin;
        }
        currentPage.drawText(line, {
          x: margin,
          y: yPos,
          size: 10,
          font: regularFont,
          color: rgb(0, 0, 0),
        });
        yPos -= 12;
      }
    }

    // Assinaturas
    if (yPos < margin + 150) {
      currentPage = pdfDoc.addPage(pageSize);
      yPos = height - margin;
    }

    yPos -= 30;
    currentPage.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    yPos -= 20;
    currentPage.drawText('ASSINATURAS', {
      x: margin,
      y: yPos,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 30;

    // Assinatura do Supervisor
    currentPage.drawText('Supervisor', {
      x: margin,
      y: yPos,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 15;

    const signatureHeight = 60;
    const signatureLineWidth = contentWidth;

    if (resposta.assinaturaFotoUrl) {
      try {
        const supervisorImage = await embedImageFromUrl(
          pdfDoc,
          resposta.assinaturaFotoUrl
        );
        if (supervisorImage) {
          const imgWidth = Math.min(
            signatureLineWidth - 10,
            (supervisorImage.width / supervisorImage.height) * signatureHeight
          );
          const imgHeight =
            (supervisorImage.height / supervisorImage.width) * imgWidth;
          currentPage.drawImage(supervisorImage, {
            x: margin,
            y: yPos - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });
        }
      } catch (error) {
        console.warn(
          'Erro ao carregar foto de assinatura do supervisor:',
          error
        );
      }
    } else {
      currentPage.drawText('Assinatura não disponível', {
        x: margin,
        y: yPos - 12,
        size: 9,
        font: regularFont,
        color: rgb(0.45, 0.45, 0.45),
      });
    }

    currentPage.drawLine({
      start: { x: margin, y: yPos - signatureHeight - 5 },
      end: { x: margin + signatureLineWidth, y: yPos - signatureHeight - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(resposta.supervisor.name, {
      x: margin,
      y: yPos - signatureHeight - 20,
      size: 9,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    yPos -= signatureHeight + 40;

    // Assinatura do Gerente (sempre desenhar seção; imagem quando houver URL)
    if (yPos < margin + 150) {
      currentPage = pdfDoc.addPage(pageSize);
      yPos = height - margin - 30;
    }

    currentPage.drawText('Gerente', {
      x: margin,
      y: yPos,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 15;

    if (resposta.gerenteAssinaturaFotoUrl) {
      try {
        const gerenteImage = await embedImageFromUrl(
          pdfDoc,
          resposta.gerenteAssinaturaFotoUrl
        );
        if (gerenteImage) {
          const imgWidth = Math.min(
            signatureLineWidth - 10,
            (gerenteImage.width / gerenteImage.height) * signatureHeight
          );
          const imgHeight =
            (gerenteImage.height / gerenteImage.width) * imgWidth;

          currentPage.drawImage(gerenteImage, {
            x: margin,
            y: yPos - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });

          yPos -= imgHeight + 5;
        }
      } catch (error) {
        console.warn(
          '[PDF] Erro ao carregar imagem da assinatura do gerente:',
          error
        );
      }
    } else {
      currentPage.drawText('Assinatura do gerente pendente', {
        x: margin,
        y: yPos - 12,
        size: 9,
        font: regularFont,
        color: rgb(0.45, 0.45, 0.45),
      });
    }

    // Linha e nome do gerente (sempre)
    currentPage.drawLine({
      start: { x: margin, y: yPos - signatureHeight - 5 },
      end: { x: margin + signatureLineWidth, y: yPos - signatureHeight - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    if (resposta.gerenteAssinadoPor) {
      currentPage.drawText(resposta.gerenteAssinadoPor.name, {
        x: margin,
        y: yPos - signatureHeight - 20,
        size: 9,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    // Rodapé em todas as páginas
    const pages = pdfDoc.getPages();
    const footerY = margin;
    const footerText = `${branding.companyName} - Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

    pages.forEach((page, index) => {
      // Barra inferior
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: 40,
        color: rgb(0.95, 0.95, 0.95),
      });

      page.drawText(footerText, {
        x: margin,
        y: footerY + 15,
        size: 8,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      page.drawText(`Página ${index + 1}`, {
        x: width - margin - 50,
        y: footerY + 15,
        size: 8,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
}
