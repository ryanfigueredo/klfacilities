import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionAPIService } from '@/lib/evolution-api-whatsapp';

interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'interactive';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button';
    body: {
      text: string;
    };
    action: {
      buttons: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
    };
  };
}

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

    if (
      !checklist.unidade.whatsappLider &&
      !checklist.unidade.whatsappSupervisor
    ) {
      return NextResponse.json(
        {
          error:
            'WhatsApp do líder ou supervisor não configurado para esta unidade',
        },
        { status: 400 }
      );
    }

    // Criar ticket
    const ticket = await prisma.ticketChecklist.create({
      data: {
        checklistId,
        unidadeId,
        status: 'PENDENTE',
      },
    });

    // Preparar mensagem baseada no tipo de checklist
    let messageText = '';
    let buttonTitle = '';

    switch (checklist.tipo) {
      case 'LIMPEZA':
        messageText = `🧹 *Solicitação de Limpeza*\n\n`;
        messageText += `📍 *Unidade:* ${checklist.unidade.nome}\n`;
        messageText += `📅 *Data:* ${new Date(checklist.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;

        if (checklist.servicosLimpeza.includes('LIMPEZA')) {
          messageText += `• Limpeza geral\n`;
        }
        if (checklist.servicosLimpeza.includes('RETIRADA_LIXO')) {
          messageText += `• Retirada de lixo\n`;
        }

        if (checklist.comentarios) {
          messageText += `\n💬 *Comentário:* ${checklist.comentarios}`;
        }

        buttonTitle = 'Concluir Limpeza';
        break;

      case 'INSUMOS':
        messageText = `🧴 *Solicitação de Insumos*\n\n`;
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

        if (checklist.comentarios) {
          messageText += `\n💬 *Comentário:* ${checklist.comentarios}`;
        }

        buttonTitle = 'Concluir Reposição';
        break;

      default:
        // SATISFACAO não envia WhatsApp - apenas fica no dashboard
        return NextResponse.json(
          { error: 'Tipo de checklist não suportado para WhatsApp' },
          { status: 400 }
        );
    }

    // Enviar mensagens WhatsApp para todos os contatos configurados
    const contacts = [];
    if (checklist.unidade.whatsappLider) {
      contacts.push({
        phone: checklist.unidade.whatsappLider.replace(/\D/g, ''),
        role: 'Líder',
      });
    }
    if (checklist.unidade.whatsappSupervisor) {
      contacts.push({
        phone: checklist.unidade.whatsappSupervisor.replace(/\D/g, ''),
        role: 'Supervisor',
      });
    }

    const results = [];
    let successCount = 0;

    for (const contact of contacts) {
      // Enviar via WAHA com mensagem simples (WEBJS não suporta botões)
      const messageBody = `${messageText}\n\n👤 *${contact.role}*\n\n💬 *Para concluir, responda:*\n OK`;

      const evolutionResponse = await evolutionAPIService.sendMessage(
        contact.phone,
        messageBody
      );
      results.push({ contact, response: evolutionResponse });

      if (evolutionResponse.success) {
        successCount++;
      }

      // Delay de 3 segundos entre mensagens para evitar rate limit
      if (contacts.indexOf(contact) < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    if (successCount > 0) {
      // Atualizar ticket com IDs das mensagens
      const messageIds = results
        .filter(r => r.response.success)
        .map(r => r.response.messageId)
        .join(',');

      await prisma.ticketChecklist.update({
        where: { id: ticket.id },
        data: {
          whatsappMessageId: messageIds,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          ticketId: ticket.id,
          messageIds,
          sentTo: results
            .filter(r => r.response.success)
            .map(r => r.contact.role),
          totalSent: successCount,
        },
      });
    } else {
      // Se falhou, marcar ticket como cancelado
      await prisma.ticketChecklist.update({
        where: { id: ticket.id },
        data: {
          status: 'CANCELADO',
        },
      });

      return NextResponse.json(
        { error: 'Erro ao enviar mensagens WhatsApp' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao enviar notificação WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Legacy function removed - now using whatsappService from @/lib/whatsapp
