import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { generateChecklistPDF } from '@/lib/checklists-operacionais/pdf-generator';
import { getResend } from '@/lib/email';
import { evolutionAPIService } from '@/lib/evolution-api-whatsapp';
import { ChecklistRespostaStatus } from '@prisma/client';

function getFromEmail() {
  const customFrom = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (customFrom) {
    return customFrom;
  }
  const defaultDomain = process.env.RESEND_DOMAIN || 'klfacilities.com.br';
  return `ERP KL <noreply@${defaultDomain}>`;
}

// Função para obter branding e logo da empresa
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

    const logoDataUrl = branding.loginLogoDataUrl || branding.sidebarLogoDataUrl;
    
    return {
      primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://klfacilities.com.br';
  return `${baseUrl}/logo-kl-light.png`;
}

// Função auxiliar para gerar template de email com branding
function generateEmailTemplate({
  branding,
  content,
  headerTitle,
  headerSubtitle,
}: {
  branding: Awaited<ReturnType<typeof getBranding>>;
  content: string;
  headerTitle: string;
  headerSubtitle?: string;
}) {
  const logoHtml = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-height: 60px; margin-bottom: 15px;" />`
    : `<h1 style="margin: 0; font-size: 28px;">${branding.companyName}</h1>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${headerTitle}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { 
          background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.accentColor} 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header img { max-height: 60px; margin-bottom: 15px; display: inline-block; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 16px; }
        .content { padding: 40px 30px; background: #ffffff; }
        .button { 
          display: inline-block; 
          background: ${branding.primaryColor}; 
          color: white; 
          padding: 14px 28px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 20px 0;
          font-weight: 600;
        }
        .button:hover { background: ${branding.accentColor}; }
        .footer { 
          padding: 30px; 
          text-align: center; 
          color: #6b7280; 
          font-size: 14px; 
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p { margin: 5px 0; }
        .info-box { 
          background: ${branding.secondaryColor}; 
          border-left: 4px solid ${branding.primaryColor}; 
          padding: 20px; 
          margin: 20px 0; 
          border-radius: 4px;
        }
        .info-box ul { margin: 10px 0; padding-left: 20px; }
        .info-box li { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          ${headerSubtitle ? `<p>${headerSubtitle}</p>` : ''}
        </div>
        
        <div class="content">
          ${content}
        </div>
        
        <div class="footer">
          <p><strong>${branding.companyName}</strong></p>
          <p>Este é um email automático, não responda a esta mensagem.</p>
          <p>© ${new Date().getFullYear()} ${branding.companyName} - Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ respostaId: string }> }
) {
  try {
    const { respostaId } = await params;

    // Buscar resposta completa
    const resposta = await prisma.checklistResposta.findUnique({
      where: { id: respostaId },
      include: {
        template: {
          include: {
            grupos: {
              orderBy: { ordem: 'asc' },
              include: {
                perguntas: {
                  orderBy: { ordem: 'asc' },
                },
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
        grupo: {
          select: {
            id: true,
            nome: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        respostas: {
          include: {
            pergunta: true,
          },
        },
      },
    });

    if (!resposta) {
      return NextResponse.json(
        { error: 'Resposta não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o checklist foi aprovado (status CONCLUIDO)
    if (resposta.status !== ChecklistRespostaStatus.CONCLUIDO) {
      return NextResponse.json({
        success: false,
        message: 'Checklist ainda não foi aprovado. Aprovação necessária antes de enviar para clientes finais.',
        status: resposta.status,
      }, { status: 400 });
    }

    // Buscar clientes finais vinculados ao grupo ou unidade
    const clientesFinais = await prisma.clienteFinal.findMany({
      where: {
        ativo: true,
        OR: [
          {
            grupos: {
              some: {
                grupoId: resposta.grupoId || undefined,
              },
            },
          },
          { unidadeId: resposta.unidadeId },
        ],
      },
    });

    if (clientesFinais.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum cliente final vinculado para esta resposta',
        enviados: 0,
      });
    }

    const resend = getResend();
    if (!resend) {
      return NextResponse.json(
        { error: 'Serviço de email não configurado. Configure RESEND_API_KEY.' },
        { status: 503 }
      );
    }

    // Gerar PDF
    const pdfBuffer = await generateChecklistPDF(resposta as any);

    // Enviar para cada cliente final
    const resultados = [];
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';

    for (const cliente of clientesFinais) {
      try {
        // Gerar token de confirmação
        const token = createHash('sha256')
          .update(`${respostaId}-${cliente.id}-${Date.now()}`)
          .digest('hex');

        // Criar registro de confirmação
        const confirmacao = await prisma.checklistRelatorioConfirmacao.create({
          data: {
            respostaId: resposta.id,
            clienteFinalId: cliente.id,
            tokenConfirmacao: token,
          },
        });

        // URL de confirmação
        const confirmacaoUrl = `${baseUrl}/api/checklists-operacionais/confirmar-relatorio?token=${token}`;

        // Obter branding
        const branding = await getBranding();

        // Conteúdo do email
        const content = `
          <h2 style="margin-top: 0; color: #1f2937;">Olá, ${cliente.nome}!</h2>
          
          <p>Você está recebendo o relatório de conformidade do checklist operacional realizado na unidade <strong>${resposta.unidade.nome}</strong>.</p>
          
          <div class="info-box">
            <p><strong>Informações do Relatório:</strong></p>
            <ul>
              <li><strong>Unidade:</strong> ${resposta.unidade.nome}</li>
              ${resposta.grupo ? `<li><strong>Grupo:</strong> ${resposta.grupo.nome}</li>` : ''}
              <li><strong>Data:</strong> ${new Date(resposta.submittedAt || resposta.createdAt).toLocaleString('pt-BR')}</li>
              <li><strong>Supervisor:</strong> ${resposta.supervisor.name}</li>
              ${resposta.protocolo ? `<li><strong>Protocolo:</strong> ${resposta.protocolo}</li>` : ''}
            </ul>
          </div>
          
          <p>O relatório em PDF está anexado a este email. Por favor, revise o documento e confirme que você recebeu e visualizou o relatório clicando no botão abaixo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmacaoUrl}" class="button">Confirmar Recebimento</a>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
            Esta confirmação é parte do nosso processo de qualidade e transparência, garantindo que todos os stakeholders estejam cientes do status das operações.
          </p>
        `;

        // Enviar email
        const emailResult = await resend.emails.send({
          from: getFromEmail(),
          to: [cliente.email],
          subject: `${branding.companyName} - Relatório de Conformidade - ${resposta.unidade.nome}`,
          html: generateEmailTemplate({
            branding,
            content,
            headerTitle: 'Relatório de Conformidade',
            headerSubtitle: 'Sistema de Gestão Empresarial',
          }),
          attachments: [
            {
              filename: (() => {
                // Sanitizar nome do arquivo removendo acentos e caracteres especiais
                const sanitizeFileName = (name: string): string => {
                  return name
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove caracteres especiais exceto espaços e hífens
                    .replace(/\s+/g, '-') // Substitui espaços por hífens
                    .toLowerCase();
                };
                const dataStr = new Date(resposta.submittedAt || resposta.createdAt).toISOString().split('T')[0];
                return `checklist-${sanitizeFileName(resposta.unidade.nome)}-${dataStr}.pdf`;
              })(),
              content: pdfBuffer,
            },
          ],
        });

        // Registrar log de email
        try {
          const { logEmail } = await import('@/lib/message-logs');
          await logEmail({
            to: cliente.email,
            subject: `${branding.companyName} - Relatório de Conformidade - ${resposta.unidade.nome}`,
            template: 'checklist-relatorio',
            emailId: emailResult.data?.id || null,
            success: emailResult.data !== null,
            error: emailResult.error?.message || null,
            context: 'checklist',
            contextId: resposta.id,
          });
        } catch (logError) {
          console.error('Erro ao registrar log de email:', logError);
        }

        // Enviar WhatsApp se configurado
        if (cliente.whatsapp) {
          try {
            const whatsappMessage = `*${branding.companyName} - Relatório de Conformidade*\n\nOlá ${cliente.nome}!\n\nVocê recebeu um novo relatório de conformidade do checklist operacional da unidade *${resposta.unidade.nome}*.\n\nVerifique seu email para visualizar o relatório completo em PDF.\n\nPor favor, confirme o recebimento através do link enviado no email.\n\nObrigado!`;
            
            const whatsappResult = await evolutionAPIService.sendMessage(
              cliente.whatsapp.replace(/\D/g, ''),
              whatsappMessage
            );

            // Registrar log de WhatsApp
            try {
              const { logWhatsAppMessage } = await import('@/lib/message-logs');
              await logWhatsAppMessage({
                to: cliente.whatsapp.replace(/\D/g, ''),
                message: whatsappMessage,
                messageId: whatsappResult.messageId || null,
                provider: 'evolution-api',
                success: whatsappResult.success,
                error: whatsappResult.error || null,
                context: 'checklist',
                contextId: resposta.id,
              });
            } catch (logError) {
              console.error('Erro ao registrar log de WhatsApp:', logError);
            }
          } catch (whatsappError) {
            console.error('Erro ao enviar WhatsApp:', whatsappError);
            // Não falha o processo se WhatsApp falhar
          }
        }

        resultados.push({
          clienteId: cliente.id,
          clienteEmail: cliente.email,
          emailEnviado: emailResult.data !== null,
          whatsappEnviado: !!cliente.whatsapp,
        });
      } catch (error) {
        console.error(`Erro ao enviar para ${cliente.email}:`, error);
        resultados.push({
          clienteId: cliente.id,
          clienteEmail: cliente.email,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Relatórios enviados para ${resultados.filter(r => r.emailEnviado).length} cliente(s)`,
      resultados,
    });
  } catch (error) {
    console.error('Erro ao enviar relatórios:', error);
    return NextResponse.json(
      {
        error: 'Erro ao enviar relatórios',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

