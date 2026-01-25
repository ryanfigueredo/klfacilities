import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';
import { sendChamadoCriadoEmail } from '@/lib/email';
import { evolutionAPIService } from '@/lib/evolution-api-whatsapp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const titulo = formData.get('titulo')?.toString();
    const categoriaUrgenciaId = formData.get('categoriaUrgenciaId')?.toString();
    const descricao = formData.get('descricao')?.toString();
    const grupoId = formData.get('grupoId')?.toString();
    const unidadeId = formData.get('unidadeId')?.toString();
    const imagem = formData.get('imagem') as File | null;

    // Validações
    if (!email || !descricao || !grupoId || !unidadeId || !categoriaUrgenciaId) {
      return NextResponse.json(
        { error: 'Email, categoria, descrição, grupo e unidade são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar que a categoria de urgência existe e está ativa
    const categoriaUrgencia = await prisma.categoriaUrgenciaChamado.findUnique({
      where: { id: categoriaUrgenciaId },
    });

    if (!categoriaUrgencia || !categoriaUrgencia.ativo) {
      return NextResponse.json(
        { error: 'Categoria inválida ou inativa' },
        { status: 400 }
      );
    }

    // Verificar se email está cadastrado como cliente final
    let clienteFinal;
    try {
      clienteFinal = await prisma.clienteFinal.findUnique({
        where: { email },
        include: {
          grupos: {
            include: {
              grupo: {
                select: {
                  id: true,
                  nome: true,
                },
              },
            },
          },
          unidade: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      });
    } catch (dbError) {
      console.error('Erro ao buscar cliente final:', dbError);
      return NextResponse.json(
        {
          error: 'Erro ao verificar email. Tente novamente mais tarde.',
        },
        { status: 500 }
      );
    }

    if (!clienteFinal) {
      return NextResponse.json(
        {
          error:
            'Email não cadastrado. Entre em contato com a administração.',
        },
        { status: 403 }
      );
    }

    if (!clienteFinal.ativo) {
      return NextResponse.json(
        {
          error:
            'Email cadastrado está inativo. Entre em contato com a administração.',
        },
        { status: 403 }
      );
    }

    // Processar imagem se fornecida
    let imagemUrl: string | null = null;
    if (imagem && imagem.size > 0) {
      try {
        const arrayBuffer = await imagem.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imagemUrl = await uploadBufferToS3({
          buffer,
          originalName: imagem.name,
          contentType: imagem.type || 'image/jpeg',
          prefix: 'chamados',
        });
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        return NextResponse.json(
          { error: 'Erro ao fazer upload da imagem' },
          { status: 500 }
        );
      }
    }

    // Validar que grupo e unidade existem e estão vinculados
    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      select: { id: true, nome: true },
    });

    if (!grupo) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 400 }
      );
    }

    const unidade = await prisma.unidade.findUnique({
      where: { id: unidadeId },
      select: { id: true, nome: true },
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 400 }
      );
    }

    // Verificar se unidade está vinculada ao grupo
    const mapeamento = await prisma.mapeamentoGrupoUnidadeResponsavel.findFirst({
      where: {
        grupoId,
        unidadeId,
        ativo: true,
      },
    });

    if (!mapeamento) {
      return NextResponse.json(
        {
          error:
            'Unidade não está vinculada ao grupo selecionado. Por favor, selecione uma unidade válida.',
        },
        { status: 400 }
      );
    }

    // Validar que o grupo e unidade escolhidos correspondem ao cliente final
    const gruposCliente = clienteFinal.grupos?.map(cfg => cfg.grupo.id) || [];
    
    // Se o cliente tem grupos vinculados, verificar se o grupo selecionado está na lista
    if (gruposCliente.length > 0 && !gruposCliente.includes(grupoId)) {
      return NextResponse.json(
        {
          error:
            'Grupo selecionado não corresponde ao seu cadastro. Você só pode abrir chamados para os grupos vinculados ao seu email.',
        },
        { status: 403 }
      );
    }

    // Se o cliente tem unidade específica vinculada, verificar se corresponde
    if (clienteFinal.unidadeId && clienteFinal.unidadeId !== unidadeId) {
      return NextResponse.json(
        {
          error:
            'Unidade selecionada não corresponde ao seu cadastro. Você só pode abrir chamados para a unidade vinculada ao seu email.',
        },
        { status: 403 }
      );
    }

    // Se o cliente tem grupos mas não tem unidade específica, verificar se a unidade pertence a algum dos grupos
    if (gruposCliente.length > 0 && !clienteFinal.unidadeId) {
      const unidadePertenceAAlgumGrupo = await prisma.mapeamentoGrupoUnidadeResponsavel.findFirst({
        where: {
          grupoId: { in: gruposCliente },
          unidadeId: unidadeId,
          ativo: true,
        },
      });

      if (!unidadePertenceAAlgumGrupo) {
        return NextResponse.json(
          {
            error:
              'Unidade selecionada não pertence a nenhum dos grupos vinculados ao seu email.',
          },
          { status: 403 }
        );
      }
    }

    // Criar incidente (sem usuário público - chamado anônimo)
    const incidente = await prisma.incidente.create({
      data: {
        titulo: titulo || categoriaUrgencia.nome || 'Chamado',
        categoria: null, // Campo legado, não usado mais
        categoriaUrgenciaId: categoriaUrgenciaId,
        descricao,
        grupoId,
        unidadeId,
        imagemUrl,
        criadoPorId: null,
        clienteFinalId: clienteFinal.id,
      },
      include: {
        grupo: {
          select: {
            nome: true,
          },
        },
        unidade: {
          select: {
            nome: true,
          },
        },
      },
    });

    // Buscar supervisor responsável pelo grupo/unidade
    let supervisorWhatsapp: string | null = null;
    let supervisorNome: string | null = null;
    
    try {
      // Primeiro, tentar buscar pelo SupervisorScope (vinculação direta)
      // Buscar por grupo E unidade primeiro (mais específico)
      let supervisorScope = await prisma.supervisorScope.findFirst({
        where: {
          grupoId: grupoId,
          unidadeId: unidadeId,
        },
        include: {
          supervisor: {
            select: {
              id: true,
              name: true,
              whatsapp: true,
            },
          },
        },
      });

      // Se não encontrar, buscar apenas por unidade
      if (!supervisorScope) {
        supervisorScope = await prisma.supervisorScope.findFirst({
          where: {
            unidadeId: unidadeId,
            grupoId: null,
          },
          include: {
            supervisor: {
              select: {
                id: true,
                name: true,
                whatsapp: true,
              },
            },
          },
        });
      }

      // Se ainda não encontrar, buscar apenas por grupo
      if (!supervisorScope) {
        supervisorScope = await prisma.supervisorScope.findFirst({
          where: {
            grupoId: grupoId,
            unidadeId: null,
          },
          include: {
            supervisor: {
              select: {
                id: true,
                name: true,
                whatsapp: true,
              },
            },
          },
        });
      }

      if (supervisorScope?.supervisor?.whatsapp) {
        supervisorWhatsapp = supervisorScope.supervisor.whatsapp;
        supervisorNome = supervisorScope.supervisor.name;
      } else {
        // Se não encontrar no SupervisorScope, buscar pelo whatsappSupervisor da Unidade
        const unidadeCompleta = await prisma.unidade.findUnique({
          where: { id: unidadeId },
          select: {
            whatsappSupervisor: true,
            emailSupervisor: true,
          },
        });

        if (unidadeCompleta?.whatsappSupervisor) {
          supervisorWhatsapp = unidadeCompleta.whatsappSupervisor;
        }
      }
    } catch (supervisorError) {
      console.error('Erro ao buscar supervisor:', supervisorError);
      // Continuar mesmo se não encontrar supervisor
    }

    // Enviar email de notificação para o cliente final
    try {
      await sendChamadoCriadoEmail({
        email: clienteFinal.email,
        nome: clienteFinal.nome,
        titulo: titulo || categoriaUrgencia.nome || 'Chamado',
        categoria: categoriaUrgencia.nome,
        urgencia: null, // Campo legado, não usado mais
        descricao,
        grupo: grupo.nome,
        unidade: unidade.nome,
        imagemUrl,
        incidenteId: incidente.id,
      });
    } catch (emailError) {
      console.error('Erro ao enviar email de notificação:', emailError);
      // Não falhar o processo se o email não for enviado
    }

    // Enviar email para MASTER e OPERACIONAL
    try {
      const usuariosNotificar = await prisma.user.findMany({
        where: {
          role: {
            in: ['MASTER', 'OPERACIONAL'],
          },
        },
        select: {
          email: true,
          name: true,
          role: true,
        },
      });

      // Filtrar usuários com email válido
      const usuariosComEmail = usuariosNotificar.filter(u => u.email);

      if (usuariosComEmail.length > 0) {
        const { getResend, getFromEmail } = await import('@/lib/email');
        const resend = getResend();
        const fromEmail = getFromEmail();
        
        if (resend) {
          // Buscar branding
          const branding = await prisma.brandingSettings.findUnique({
            where: { id: 'default' },
          });
          
          const primaryColor = branding?.primaryColor || '#009ee2';
          const secondaryColor = branding?.secondaryColor || '#e8f5ff';
          const accentColor = branding?.accentColor || '#0088c7';
          const logoUrl = branding?.loginLogoDataUrl || branding?.sidebarLogoDataUrl || null;

          const { getUrgenciaLabel } = await import('@/lib/urgencia-helper');
          const urgenciaTexto = categoriaUrgencia.urgenciaNivel === 'CRITICA' ? 'CRÍTICA' 
            : categoriaUrgencia.urgenciaNivel === 'ALTA' ? 'ALTA URGÊNCIA'
            : categoriaUrgencia.urgenciaNivel === 'NORMAL' ? 'URGENTE'
            : 'NORMAL';

          const baseUrl = process.env.NEXTAUTH_URL || 'https://klfacilities.com.br';
          const chamadoUrl = `${baseUrl}/operacional/incidentes`;

          const emailContent = `
            <p>Olá!</p>
            
            <p>Um novo chamado foi aberto e requer atenção:</p>
            
            <div style="background: ${secondaryColor}; border-left: 4px solid ${primaryColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <div style="margin: 10px 0;">
                <span style="font-weight: 600; color: #666; display: inline-block; min-width: 120px;">Categoria:</span>
                <span style="color: #333;">${categoriaUrgencia.nome}</span>
                <span style="display: inline-block; padding: 4px 8px; background: ${primaryColor}; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px;">${urgenciaTexto}</span>
              </div>
              <div style="margin: 10px 0;">
                <span style="font-weight: 600; color: #666; display: inline-block; min-width: 120px;">Urgência:</span>
                <span style="color: #333;">${getUrgenciaLabel(categoriaUrgencia.urgenciaNivel)} - Prazo: ${categoriaUrgencia.prazoHoras}h</span>
              </div>
              <div style="margin: 10px 0;">
                <span style="font-weight: 600; color: #666; display: inline-block; min-width: 120px;">Descrição:</span>
                <span style="color: #333;">${descricao}</span>
              </div>
              <div style="margin: 10px 0;">
                <span style="font-weight: 600; color: #666; display: inline-block; min-width: 120px;">Grupo:</span>
                <span style="color: #333;">${grupo.nome}</span>
              </div>
              <div style="margin: 10px 0;">
                <span style="font-weight: 600; color: #666; display: inline-block; min-width: 120px;">Unidade:</span>
                <span style="color: #333;">${unidade.nome}</span>
              </div>
              <div style="margin: 10px 0;">
                <span style="font-weight: 600; color: #666; display: inline-block; min-width: 120px;">Cliente:</span>
                <span style="color: #333;">${clienteFinal.nome} (${clienteFinal.email})</span>
              </div>
              <div style="margin: 10px 0;">
                <span style="font-weight: 600; color: #666; display: inline-block; min-width: 120px;">ID do Chamado:</span>
                <span style="color: #333;">${incidente.id}</span>
              </div>
              <div style="margin: 10px 0;">
                <span style="font-weight: 600; color: #666; display: inline-block; min-width: 120px;">Data de Abertura:</span>
                <span style="color: #333;">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            
            ${imagemUrl ? `
              <div style="margin: 20px 0; text-align: center;">
                <p style="font-weight: 600; margin-bottom: 10px;">Imagem anexada:</p>
                <img src="${imagemUrl}" alt="Imagem do chamado" style="max-width: 100%; border-radius: 8px;" />
              </div>
            ` : ''}
            
            <p style="margin-top: 20px;">
              <a href="${chamadoUrl}" 
                 style="display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Ver Chamado no Sistema
              </a>
            </p>
          `;

          const logoHtml = logoUrl
            ? `<img src="${logoUrl}" alt="KL Facilities" style="max-height: 60px; margin-bottom: 15px;" />`
            : `<h1 style="margin: 0; font-size: 28px;">KL Facilities</h1>`;

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Novo Chamado</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); color: white; padding: 30px 20px; text-align: center; }
                .content { padding: 30px 20px; }
                .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  ${logoHtml}
                  <h2 style="margin: 0; font-size: 24px;">Novo Chamado</h2>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Notificação do Sistema</p>
                </div>
                <div class="content">
                  ${emailContent}
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} KL Facilities. Todos os direitos reservados.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const emailPromises = usuariosComEmail.map(usuario => {
            
            return resend.emails.send({
              from: fromEmail,
              to: [usuario.email],
              subject: `[${urgenciaTexto}] Novo Chamado: ${categoriaUrgencia.nome} - ${unidade.nome}`,
              html: emailHtml,
            });
          });

          await Promise.allSettled(emailPromises);
          console.log(`Emails enviados para ${usuariosComEmail.length} usuário(s) MASTER/OPERACIONAL`);
        }
      }
    } catch (emailError) {
      console.error('Erro ao enviar email para MASTER/OPERACIONAL:', emailError);
      // Não falhar o processo se o email não for enviado
    }

    // Enviar WhatsApp para número de teste (por enquanto)
    // TODO: Depois será para cada supervisor de acordo com a unidade
    const whatsappTeste = '5522998025040'; // Número de teste
    
    try {
      const { getUrgenciaLabel } = await import('@/lib/urgencia-helper');
      const urgenciaTexto = categoriaUrgencia.urgenciaNivel === 'CRITICA' ? 'CRÍTICA' 
        : categoriaUrgencia.urgenciaNivel === 'ALTA' ? 'ALTA URGÊNCIA'
        : categoriaUrgencia.urgenciaNivel === 'NORMAL' ? 'URGENTE'
        : 'NORMAL';

      const mensagemWhatsApp = `*Novo Chamado - ${urgenciaTexto}*\n\n` +
        `Um novo chamado foi aberto e requer atenção:\n\n` +
        `*Categoria:* ${categoriaUrgencia.nome}\n` +
        `*Urgência:* ${getUrgenciaLabel(categoriaUrgencia.urgenciaNivel)} - Prazo: ${categoriaUrgencia.prazoHoras}h\n` +
        `*Grupo:* ${grupo.nome}\n` +
        `*Unidade:* ${unidade.nome}\n` +
        `*Cliente:* ${clienteFinal.nome}\n` +
        `*Email:* ${clienteFinal.email}\n\n` +
        `*Descrição:*\n${descricao}\n\n` +
        `${(categoriaUrgencia.urgenciaNivel === 'CRITICA' || categoriaUrgencia.urgenciaNivel === 'ALTA') ? '*🚨 ATENÇÃO: Este chamado requer ação imediata!*\n\n' : ''}` +
        `*ID do Chamado:* ${incidente.id}\n\n` +
        `Por favor, acesse o sistema para visualizar os detalhes completos e responder ao chamado.`;

      const whatsappResult = await evolutionAPIService.sendMessage(
        whatsappTeste,
        mensagemWhatsApp
      );
      
      // Registrar log de mensagem WhatsApp
      try {
        const { logWhatsAppMessage } = await import('@/lib/message-logs');
        await logWhatsAppMessage({
          to: whatsappTeste,
          message: mensagemWhatsApp,
          messageId: whatsappResult.messageId || null,
          provider: 'evolution-api',
          success: whatsappResult.success,
          error: whatsappResult.error || null,
          context: 'chamado',
          contextId: incidente.id,
        });
      } catch (logError) {
        console.error('Erro ao registrar log de WhatsApp:', logError);
      }
      
      console.log(`WhatsApp enviado para número de teste: ${whatsappTeste}`);
    } catch (whatsappError) {
      console.error('Erro ao enviar WhatsApp:', whatsappError);
      // Não falhar o processo se o WhatsApp não for enviado
    }

    return NextResponse.json({
      success: true,
      message: 'Chamado aberto com sucesso',
      incidente: {
        id: incidente.id,
        titulo: incidente.titulo,
        grupo: incidente.grupo.nome,
        unidade: incidente.unidade.nome,
      },
    });
  } catch (error) {
    console.error('Erro ao criar chamado público:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar chamado',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

