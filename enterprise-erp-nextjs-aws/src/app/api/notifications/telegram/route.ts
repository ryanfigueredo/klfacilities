import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checklistId, unidadeId } = body;

    if (!checklistId || !unidadeId) {
      return NextResponse.json(
        { error: 'checklistId e unidadeId são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar dados do checklist e unidade
    const checklist = await prisma.checklistDigital.findUnique({
      where: { id: checklistId },
      include: {
        unidade: true,
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist não encontrado' },
        { status: 404 }
      );
    }

    // Preparar mensagem
    let messageText = '';
    let emoji = '';

    switch (checklist.tipo) {
      case 'LIMPEZA':
        emoji = '🧹';
        messageText = `*Solicitação de Limpeza*\n\n`;
        messageText += `📍 *Unidade:* ${checklist.unidade.nome}\n`;
        messageText += `📅 *Data:* ${new Date(checklist.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;

        if (checklist.servicosLimpeza.includes('LIMPEZA')) {
          messageText += `• Limpeza geral\n`;
        }
        if (checklist.servicosLimpeza.includes('RETIRADA_LIXO')) {
          messageText += `• Retirada de lixo\n`;
        }
        break;

      case 'INSUMOS':
        emoji = '🧴';
        messageText = `*Solicitação de Insumos*\n\n`;
        messageText += `📍 *Unidade:* ${checklist.unidade.nome}\n`;
        messageText += `📅 *Data:* ${new Date(checklist.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;
        messageText += `*Insumos solicitados:*\n`;

        checklist.insumosSolicitados.forEach(insumo => {
          const labels = {
            ALCOOL_HIGIENIZACAO: 'Álcool higienização',
            PAPEL_HIGIENICO: 'Papel higiênico',
            PAPEL_TOALHA: 'Papel toalha',
            SABONETE: 'Sabonete',
          };
          messageText += `• ${labels[insumo as keyof typeof labels] || insumo}\n`;
        });
        break;

      case 'SATISFACAO':
        emoji = '⭐';
        messageText = `*Pesquisa de Satisfação*\n\n`;
        messageText += `📍 *Unidade:* ${checklist.unidade.nome}\n`;
        messageText += `📅 *Data:* ${new Date(checklist.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;

        if (checklist.avaliacaoLimpeza) {
          const labels = {
            MUITO_RUIM: 'Muito ruim',
            RUIM: 'Ruim',
            REGULAR: 'Regular',
            BOM: 'Bom',
            MUITO_BOM: 'Muito bom',
          };
          messageText += ` *Avaliação:* ${labels[checklist.avaliacaoLimpeza as keyof typeof labels]}\n\n`;
        }
        break;
    }

    if (checklist.comentarios) {
      messageText += `\n💬 *Comentário:* ${checklist.comentarios}`;
    }

    // Enviar via Telegram (alternativa mais simples)
    const telegramSent = await sendTelegramMessage(messageText, emoji);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Notificação enviada via Telegram',
        telegramSent,
      },
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function sendTelegramMessage(message: string, emoji: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram não configurado - simulando envio');
    return true;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `${emoji} ${message}`,
          parse_mode: 'Markdown',
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar Telegram:', error);
    return false;
  }
}
