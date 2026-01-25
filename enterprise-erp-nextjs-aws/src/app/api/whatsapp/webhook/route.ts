import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionAPIService } from '@/lib/evolution-api-whatsapp';

export async function POST(request: NextRequest) {
  // ----------------------------------------------------
  // TRATAMENTO DA REQUISIÇÃO POST (MENSAGENS)
  // ----------------------------------------------------
  try {
    const body = await request.json();

    // Código para processar a mensagem do cliente (POST)
    console.log('📥 WEBHOOK EVENTO RECEBIDO:', JSON.stringify(body, null, 2));

    // Detectar formato Evolution API vs WhatsApp Business API
    const isEvolutionAPI = body.event === 'messages.upsert';

    if (isEvolutionAPI) {
      // Formato Evolution API
      console.log('🔷 Formato Evolution API detectado');
      console.log('📱 Instância:', body.instance);

      const data = body.data;
      const message = data?.key;
      const messageContent = data?.message;

      // Verificar se é uma mensagem recebida (não enviada por nós)
      if (message?.fromMe) {
        console.log(' Mensagem enviada por nós, ignorando');
        return NextResponse.json({ status: 'EVENT_RECEIVED' });
      }

      // Extrair texto da mensagem
      let text = '';
      if (messageContent?.conversation) {
        text = messageContent.conversation;
      } else if (messageContent?.extendedTextMessage?.text) {
        text = messageContent.extendedTextMessage.text;
      }

      if (text) {
        const textUpper = text.toUpperCase().trim();
        const from = message.remoteJid?.replace('@s.whatsapp.net', '');

        console.log('📱 Mensagem recebida:', textUpper);
        console.log('📞 De:', from);

        // Processar comando
        await processarComando(textUpper, from, body.instance);
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }

    // Log específico para eventos de status de mensagem (se disponível)
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const statuses = body.entry[0].changes[0].value.statuses;
      console.log('STATUS DAS MENSAGENS:', JSON.stringify(statuses, null, 2));

      statuses.forEach((status: any) => {
        console.log(`Mensagem ID: ${status.id}`);
        console.log(`Status: ${status.status}`);
        console.log(`Destinatário: ${status.recipient_id}`);
        console.log(`Timestamp: ${status.timestamp}`);

        if (status.errors) {
          console.log(
            'ERROS ENCONTRADOS:',
            JSON.stringify(status.errors, null, 2)
          );
          status.errors.forEach((error: any) => {
            console.log(`Código do erro: ${error.code}`);
            console.log(`Título: ${error.title}`);
            console.log(`Mensagem: ${error.message}`);
            if (error.error_data) {
              console.log(
                `Detalhes: ${JSON.stringify(error.error_data, null, 2)}`
              );
            }
          });
        } else {
          console.log('Mensagem entregue com sucesso!');
        }
      });
    } else {
      console.log(
        'Nenhum evento de status recebido (normal se não configurado no webhook)'
      );
    }

    // Log específico para mensagens recebidas
    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messages = body.entry[0].changes[0].value.messages;
      console.log('MENSAGENS RECEBIDAS:', JSON.stringify(messages, null, 2));

      messages.forEach((message: any) => {
        console.log(`Mensagem ID: ${message.id}`);
        console.log(`De: ${message.from}`);
        console.log(`Tipo: ${message.type}`);
        console.log(`Timestamp: ${message.timestamp}`);

        if (message.interactive?.button_reply) {
          console.log(
            'BOTÃO CLICADO:',
            JSON.stringify(message.interactive.button_reply, null, 2)
          );
        }

        if (message.text) {
          console.log('TEXTO:', message.text.body);
        }
      });
    }

    // Verificar se é uma mensagem de texto com comando de conclusão
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text) {
      const message = body.entry[0].changes[0].value.messages[0];
      const text = message.text.body.toUpperCase().trim();
      const from = message.from;

      console.log('Mensagem de texto recebida:', text);
      console.log('De:', from);

      // Processar comando para WhatsApp Business API
      await processarComando(text, from);
    }

    // Verificar se é uma mensagem de botão (mantido para compatibilidade)
    if (
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive
        ?.button_reply
    ) {
      const buttonReply =
        body.entry[0].changes[0].value.messages[0].interactive.button_reply;
      const buttonId = buttonReply.id;
      const from = body.entry[0].changes[0].value.messages[0].from;

      // Verificar se é um botão de conclusão
      if (buttonId.startsWith('concluir_')) {
        const ticketId = buttonId.replace('concluir_', '');

        // Buscar o ticket
        const ticket = await prisma.ticketChecklist.findUnique({
          where: { id: ticketId },
          include: {
            checklist: {
              include: {
                unidade: true,
              },
            },
          },
        });

        if (ticket && ticket.status === 'PENDENTE') {
          // Atualizar ticket como concluído
          await prisma.ticketChecklist.update({
            where: { id: ticketId },
            data: {
              status: 'CONCLUIDO',
              concluidoEm: new Date(),
              concluidoPor: `WhatsApp: ${from}`,
            },
          });

          // Enviar confirmação
          await sendConfirmationMessage(from, ticket.checklist.unidade.nome);
        }
      }
    }

    // A Meta espera um status 200, mesmo que você não faça nada com o evento
    return NextResponse.json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function processarComando(
  text: string,
  from: string,
  instanceName?: string
) {
  // Aceitar vários comandos simples: OK, CONCLUIR, FEITO, PRONTO
  const comandosAceitos = ['OK', 'CONCLUIR', 'FEITO', 'PRONTO', 'CONCLUÍDO'];
  const isComandoSimples = comandosAceitos.includes(text);
  const isComandoComId = text.startsWith('CONCLUIR ');

  if (isComandoSimples || isComandoComId) {
    let ticketId = null;

    if (isComandoComId) {
      // Comando com ID: "CONCLUIR xyz123"
      ticketId = text.replace('CONCLUIR ', '').trim();
      console.log('Processando comando CONCLUIR com ID:', ticketId);
    } else {
      // Comando simples: "OK", "FEITO", etc
      // Buscar o ticket mais recente PENDENTE deste número
      console.log('Processando comando simples:', text);

      const ticketRecente = await prisma.ticketChecklist.findFirst({
        where: {
          status: 'PENDENTE',
          checklist: {
            unidade: {
              OR: [
                {
                  whatsappLider: {
                    contains: from.replace(/\D/g, '').slice(-11),
                  },
                },
                {
                  whatsappSupervisor: {
                    contains: from.replace(/\D/g, '').slice(-11),
                  },
                },
              ],
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          checklist: {
            include: {
              unidade: true,
            },
          },
        },
      });

      if (ticketRecente) {
        ticketId = ticketRecente.id;
        console.log(' Ticket pendente encontrado:', ticketId);
      } else {
        console.log(' Nenhum ticket pendente encontrado para este número');
        // Enviar mensagem informando que não há tickets pendentes
        await sendNoTicketMessage(from, instanceName);
        return;
      }
    }

    // Buscar o ticket para confirmar
    const ticket = await prisma.ticketChecklist.findUnique({
      where: { id: ticketId },
      include: {
        checklist: {
          include: {
            unidade: true,
          },
        },
      },
    });

    if (ticket && ticket.status === 'PENDENTE') {
      console.log(' Ticket encontrado, marcando como concluído');

      // Atualizar ticket como concluído
      await prisma.ticketChecklist.update({
        where: { id: ticketId },
        data: {
          status: 'CONCLUIDO',
          concluidoEm: new Date(),
          concluidoPor: `WhatsApp: ${from}`,
        },
      });

      // Enviar confirmação
      await sendConfirmationMessage(
        from,
        ticket.checklist.unidade.nome,
        instanceName
      );
    } else {
      console.log(' Ticket não encontrado ou já concluído');
    }
  }
}

export async function GET(request: NextRequest) {
  // 🚨 1. USE O MESMO VALOR AQUI E NO PAINEL DA META
  const VERIFY_TOKEN = 'kl_webhook_2025';

  // ----------------------------------------------------
  // TRATAMENTO DA REQUISIÇÃO GET (VERIFICAÇÃO)
  // ----------------------------------------------------
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // 2. Verifica se os parâmetros existem e se o token é válido
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook Verificado com sucesso!');
    // 3. Responde com o CHALLENGE
    return new NextResponse(challenge);
  } else {
    // Token inválido ou modo incorreto
    console.error('Falha na Verificação do Webhook: Token ou Modo Inválido.');
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
}

async function sendConfirmationMessage(
  to: string,
  unidadeNome: string,
  instanceName?: string
) {
  const message = ` *Solicitação Concluída*\n\nObrigado! A solicitação da unidade *${unidadeNome}* foi marcada como concluída.\n\nA equipe foi notificada.`;

  try {
    const result = await evolutionAPIService.sendMessage(
      to,
      message,
      instanceName
    );
    if (!result.success) {
      console.error('Erro ao enviar confirmação WhatsApp:', result.error);
    }
  } catch (error) {
    console.error('Erro ao enviar confirmação:', error);
  }
}

async function sendNoTicketMessage(to: string, instanceName?: string) {
  const message = `ℹ️ *Nenhuma solicitação pendente*\n\nNão há solicitações pendentes no momento.\n\nSe você recebeu uma notificação, ela já pode ter sido concluída por outro responsável.`;

  try {
    const result = await evolutionAPIService.sendMessage(
      to,
      message,
      instanceName
    );
    if (!result.success) {
      console.error('Erro ao enviar mensagem de aviso WhatsApp:', result.error);
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem de aviso:', error);
  }
}
