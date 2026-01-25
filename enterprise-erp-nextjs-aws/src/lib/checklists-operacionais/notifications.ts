import { prisma } from '@/lib/prisma';
import { getResend, getFromEmail } from '@/lib/email';
import { evolutionAPIService } from '@/lib/evolution-api-whatsapp';

interface ChecklistNotificationData {
  respostaId: string;
  protocolo: string;
  templateTitulo: string;
  unidadeNome: string;
  grupoNome: string | null;
  supervisorNome: string;
  supervisorEmail: string;
  submittedAt: Date;
}

/**
 * Envia email para todos os usuários com role OPERACIONAL
 * informando sobre um novo checklist enviado
 */
export async function notifyOperacionalTeam(
  data: ChecklistNotificationData
): Promise<void> {
  try {
    // Buscar todos os usuários com role OPERACIONAL
    const operacionalUsers = await prisma.user.findMany({
      where: {
        role: 'OPERACIONAL',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Filtrar apenas usuários com email
    const usersWithEmail = operacionalUsers.filter(user => user.email);

    if (usersWithEmail.length === 0) {
      console.log('Nenhum usuário OPERACIONAL com email encontrado para notificar');
      return;
    }

    const resend = getResend();
    if (!resend) {
      console.error('Resend não configurado - emails não serão enviados');
      return;
    }

    const fromEmail = getFromEmail();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://klfacilities.com.br';
    const checklistUrl = `${baseUrl}/operacional/checklists/visualizar/${data.respostaId}`;

    const subject = `Novo Checklist Enviado - ${data.templateTitulo}`;
    
    const emailContent = `
      <h2 style="margin-top: 0; color: #1f2937;">Novo Checklist Enviado</h2>
      
      <p>Um novo checklist foi enviado na plataforma e está aguardando sua análise.</p>
      
      <div style="background: #e8f5ff; border-left: 4px solid #009ee2; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <div style="margin: 10px 0;">
          <span style="font-weight: 600; color: #4b5563;">Checklist:</span>
          <span style="color: #1f2937; margin-left: 8px;">${data.templateTitulo}</span>
        </div>
        <div style="margin: 10px 0;">
          <span style="font-weight: 600; color: #4b5563;">Unidade:</span>
          <span style="color: #1f2937; margin-left: 8px;">${data.unidadeNome}</span>
        </div>
        ${data.grupoNome ? `
        <div style="margin: 10px 0;">
          <span style="font-weight: 600; color: #4b5563;">Grupo:</span>
          <span style="color: #1f2937; margin-left: 8px;">${data.grupoNome}</span>
        </div>
        ` : ''}
        <div style="margin: 10px 0;">
          <span style="font-weight: 600; color: #4b5563;">Supervisor:</span>
          <span style="color: #1f2937; margin-left: 8px;">${data.supervisorNome}</span>
          <span style="color: #6b7280; margin-left: 8px;">(${data.supervisorEmail})</span>
        </div>
        <div style="margin: 10px 0;">
          <span style="font-weight: 600; color: #4b5563;">Protocolo:</span>
          <span style="color: #1f2937; margin-left: 8px; font-family: monospace;">${data.protocolo}</span>
        </div>
        <div style="margin: 10px 0;">
          <span style="font-weight: 600; color: #4b5563;">Data de Envio:</span>
          <span style="color: #1f2937; margin-left: 8px;">${data.submittedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${checklistUrl}" style="display: inline-block; background: #009ee2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Ver Checklist no Sistema
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        <strong>Informação:</strong> Acesse o sistema para visualizar os detalhes completos do checklist e aprovar o envio para os clientes finais.
      </p>
    `;

    // Enviar email para cada usuário OPERACIONAL
    const emailPromises = usersWithEmail.map(async (user) => {
      if (!user.email) return;

      try {
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: [user.email],
          subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${subject}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: linear-gradient(135deg, #009ee2 0%, #0088c7 100%); color: white; padding: 40px 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                .content { padding: 40px 30px; background: #ffffff; }
                .footer { padding: 30px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>KL Facilities</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.95;">Sistema de Gestão Empresarial</p>
                </div>
                <div class="content">
                  <p>Olá, <strong>${user.name}</strong>!</p>
                  ${emailContent}
                </div>
                <div class="footer">
                  <p><strong>KL Facilities</strong></p>
                  <p>Este é um email automático, não responda a esta mensagem.</p>
                  <p>© ${new Date().getFullYear()} KL Facilities - Todos os direitos reservados</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        if (error) {
          console.error(`Erro ao enviar email para ${user.email}:`, error);
        } else {
          console.log(`Email enviado com sucesso para ${user.email}`);
        }
      } catch (error) {
        console.error(`Erro ao enviar email para ${user.email}:`, error);
      }
    });

    await Promise.all(emailPromises);
  } catch (error) {
    console.error('Erro ao notificar equipe operacional:', error);
    // Não lançar erro para não quebrar o fluxo principal
  }
}

interface SupervisorWhatsAppData {
  supervisorId: string;
  unidadeId: string;
  grupoId: string | null;
  templateTitulo: string;
  unidadeNome: string;
  grupoNome: string | null;
  protocolo: string;
  submittedAt: Date;
}

/**
 * Envia WhatsApp para o supervisor confirmando o envio do checklist
 * Busca o WhatsApp do supervisor baseado na unidade e grupo
 */
export async function notifySupervisorWhatsApp(
  data: SupervisorWhatsAppData
): Promise<void> {
  try {
    let supervisorWhatsApp: string | null = null;

    // 1. Buscar WhatsApp do supervisor diretamente
    const supervisor = await prisma.user.findUnique({
      where: { id: data.supervisorId },
      select: {
        whatsapp: true,
        name: true,
      },
    });

    supervisorWhatsApp = supervisor?.whatsapp || null;

    // 2. Se não tiver WhatsApp no usuário, buscar através do SupervisorScope baseado na unidade e grupo
    if (!supervisorWhatsApp && data.grupoId) {
      const scope = await prisma.supervisorScope.findFirst({
        where: {
          supervisorId: data.supervisorId,
          grupoId: data.grupoId,
        },
        include: {
          supervisor: {
            select: {
              whatsapp: true,
            },
          },
        },
      });

      supervisorWhatsApp = scope?.supervisor?.whatsapp || null;
    }

    // 3. Se ainda não tiver, buscar WhatsApp na unidade (whatsappSupervisor)
    if (!supervisorWhatsApp) {
      const unidade = await prisma.unidade.findUnique({
        where: { id: data.unidadeId },
        select: {
          whatsappSupervisor: true,
        },
      });

      supervisorWhatsApp = unidade?.whatsappSupervisor || null;
    }

    // 4. Última tentativa: buscar qualquer SupervisorScope para essa unidade
    if (!supervisorWhatsApp) {
      const scope = await prisma.supervisorScope.findFirst({
        where: {
          supervisorId: data.supervisorId,
          unidadeId: data.unidadeId,
        },
        include: {
          supervisor: {
            select: {
              whatsapp: true,
            },
          },
        },
      });

      supervisorWhatsApp = scope?.supervisor?.whatsapp || null;
    }

    if (!supervisorWhatsApp) {
      console.log(`WhatsApp do supervisor não encontrado para supervisor ${data.supervisorId} na unidade ${data.unidadeNome}`);
      return;
    }

    if (!evolutionAPIService.isConfigured()) {
      console.error('Evolution API não configurada - WhatsApp não será enviado');
      return;
    }

    const message = `✅ *Checklist Enviado com Sucesso!*

📋 *Checklist:* ${data.templateTitulo}
📍 *Unidade:* ${data.unidadeNome}
${data.grupoNome ? `🏢 *Grupo:* ${data.grupoNome}\n` : ''}🔖 *Protocolo:* ${data.protocolo}
📅 *Data:* ${data.submittedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

Seu checklist foi enviado com sucesso e está aguardando aprovação da equipe operacional.

Você receberá uma notificação quando o checklist for aprovado e enviado aos clientes finais.`;

    const result = await evolutionAPIService.sendMessage(
      supervisorWhatsApp,
      message
    );

    if (result.success) {
      console.log(`WhatsApp enviado com sucesso para supervisor: ${supervisorWhatsApp}`);
    } else {
      console.error(`Erro ao enviar WhatsApp para supervisor: ${result.error}`);
    }
  } catch (error) {
    console.error('Erro ao notificar supervisor via WhatsApp:', error);
    // Não lançar erro para não quebrar o fluxo principal
  }
}

