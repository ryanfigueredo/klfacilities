import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null; // Retornar null em vez de lançar erro para permitir fallback
  }
  return new Resend(apiKey);
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

    // Usar loginLogoDataUrl se disponível, senão sidebarLogoDataUrl, senão logo padrão
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

// Função para obter URL do logo padrão (S3 ou public)
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

  // Fallback para logo público (assumindo que está em /logo-kl-light.png)
  // Em produção, isso precisaria ser uma URL absoluta
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://klfacilities.com.br';
  return `${baseUrl}/logo-kl-light.png`;
}

// Função auxiliar para gerar header e footer de email com branding
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
        .warning { 
          background: #fef3c7; 
          border: 1px solid #f59e0b; 
          padding: 15px; 
          border-radius: 6px; 
          margin: 20px 0; 
        }
        .info-row { margin: 10px 0; }
        .info-label { font-weight: 600; color: #4b5563; }
        .info-value { color: #1f2937; }
        .badge { 
          display: inline-block; 
          background: ${branding.secondaryColor}; 
          color: ${branding.accentColor}; 
          padding: 4px 12px; 
          border-radius: 12px; 
          font-size: 12px; 
          font-weight: 600;
          margin-left: 8px;
        }
        .conclusao-box {
          background: #ecfdf5;
          border: 1px solid #10b981;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .image-container { margin: 20px 0; text-align: center; }
        .image-container img { max-width: 100%; border-radius: 8px; }
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

// Função para obter o endereço de email do remetente
// Usa variável de ambiente ou fallback para domínio verificado
export function getFromEmail() {
  // Se tiver variável de ambiente configurada, usa ela (prioridade máxima)
  const customFrom = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (customFrom) {
    return customFrom;
  }

  // IMPORTANTE: financeiro.klfacilities.com.br está com DNS Failed no Resend
  // Usar o domínio principal klfacilities.com.br como padrão
  // Se precisar usar outro domínio, configure RESEND_FROM_EMAIL no .env
  const defaultDomain = process.env.RESEND_DOMAIN || 'klfacilities.com.br';

  // Sempre usar o domínio principal (não o subdomínio financeiro)
  // O domínio principal tem mais chances de estar verificado
  return `ERP KL <noreply@${defaultDomain}>`;
}

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  try {
    const resend = getResend();
    if (!resend) {
      throw new Error('Resend não configurado');
    }
    const fromEmail = getFromEmail();
    const branding = await getBranding();
    
    const content = `
      <h2 style="margin-top: 0; color: #1f2937;">Olá, ${name}!</h2>
      
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no ERP KL.</p>
      
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">Redefinir Senha</a>
      </div>
      
      <div class="warning">
        <strong>Importante:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Este link é válido por apenas 1 hora</li>
          <li>Se você não solicitou esta redefinição, ignore este email</li>
          <li>Não compartilhe este link com outras pessoas</li>
        </ul>
      </div>
      
      <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
      <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
        ${resetUrl}
      </p>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Redefinição de Senha - ${branding.companyName}`,
      html: generateEmailTemplate({
        branding,
        content,
        headerTitle: 'Redefinição de Senha',
        headerSubtitle: 'Sistema de Gestão Empresarial',
      }),
    });

    if (error) {
      console.error('Erro ao enviar email:', error);
      
      // Registrar log de erro
      try {
        const { logEmail } = await import('./message-logs');
        await logEmail({
          to: email,
          subject: `Redefinição de Senha - ${branding.companyName}`,
          template: 'password-reset',
          success: false,
          error: error.message || 'Erro desconhecido',
        });
      } catch (logError) {
        console.error('Erro ao registrar log de email:', logError);
      }

      // Mensagem mais específica para erro de domínio não autorizado
      if (
        error.message?.includes('Not authorized') ||
        error.message?.includes('403')
      ) {
        const errorMsg = `Domínio de email não autorizado. Verifique se o domínio está verificado no Resend ou configure RESEND_FROM_EMAIL com um domínio válido. Erro: ${error.message}`;
        console.error(errorMsg);
        throw new Error(
          'Domínio de email não autorizado. Verifique a configuração do Resend.'
        );
      }
      throw new Error(
        `Falha ao enviar email: ${error.message || 'Erro desconhecido'}`
      );
    }

    // Registrar log de sucesso
    try {
      const { logEmail } = await import('./message-logs');
      await logEmail({
        to: email,
        subject: `Redefinição de Senha - ${branding.companyName}`,
        template: 'password-reset',
        emailId: data?.id || null,
        success: true,
      });
    } catch (logError) {
      console.error('Erro ao registrar log de email:', logError);
    }

    return data;
  } catch (error) {
    console.error('Erro no envio de email:', error);
    throw error;
  }
}

export async function sendCurriculoNotificationEmail({
  nome,
  sobrenome,
  telefone,
  email,
  endereco,
  unidadeNome,
  adminUrl,
}: {
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  unidadeNome: string;
  adminUrl: string;
}) {
  try {
    const resend = getResend();
    if (!resend) {
      console.error('Resend não configurado - email não será enviado');
      return;
    }
    const rhEmail = 'rh@klfacilities.com.br';
    const fromEmail = getFromEmail();
    const branding = await getBranding();

    const content = `
      <p>Olá, equipe de RH!</p>
      
      <p>Um novo currículo foi enviado através do Banco de Talentos e está aguardando sua análise.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Candidato:</span>
          <span class="info-value">${nome} ${sobrenome}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Unidade de Interesse:</span>
          <span class="info-value">${unidadeNome} <span class="badge">NOVO</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">Telefone:</span>
          <span class="info-value">${telefone}</span>
        </div>
        ${email ? `
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${email}</span>
        </div>
        ` : ''}
        ${endereco ? `
        <div class="info-row">
          <span class="info-label">Endereço:</span>
          <span class="info-value">${endereco}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Data de Recebimento:</span>
          <span class="info-value">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" class="button">Ver Currículo no Sistema</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        <strong>Dica:</strong> Acesse o painel de Banco de Talentos para visualizar o currículo completo, fazer o download do PDF e atualizar o status do candidato.
      </p>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [rhEmail],
      subject: `Novo Currículo para ${unidadeNome}`,
      html: generateEmailTemplate({
        branding,
        content,
        headerTitle: 'Novo Currículo Recebido',
        headerSubtitle: 'Banco de Talentos',
      }),
    });

    if (error) {
      console.error('Erro ao enviar email de notificação:', error);
      
      // Registrar log de erro
      try {
        const { logEmail } = await import('./message-logs');
        await logEmail({
          to: rhEmail,
          subject: `Novo Currículo para ${unidadeNome}`,
          template: 'curriculo-notification',
          success: false,
          error: error.message || 'Erro desconhecido',
        });
      } catch (logError) {
        console.error('Erro ao registrar log de email:', logError);
      }

      // Mensagem mais específica para erro de domínio não autorizado
      if (
        error.message?.includes('Not authorized') ||
        error.message?.includes('403')
      ) {
        const errorMsg = `Domínio de email não autorizado. Verifique se o domínio está verificado no Resend. Erro: ${error.message}`;
        console.error(errorMsg);
        // Não lançar erro para não quebrar o fluxo principal, apenas logar
        return;
      }
      throw new Error(
        `Falha ao enviar email de notificação: ${error.message || 'Erro desconhecido'}`
      );
    }

    // Registrar log de sucesso
    try {
      const { logEmail } = await import('./message-logs');
      await logEmail({
        to: rhEmail,
        subject: `Novo Currículo para ${unidadeNome}`,
        template: 'curriculo-notification',
        emailId: data?.id || null,
        success: true,
      });
    } catch (logError) {
      console.error('Erro ao registrar log de email:', logError);
    }

    console.log('Email de notificação de currículo enviado com sucesso');
  } catch (error) {
    console.error('Erro no envio de email de notificação:', error);
    // Não lançar erro para não quebrar o fluxo principal
  }
}

export async function sendChamadoCriadoEmail({
  email,
  nome,
  titulo,
  categoria,
  urgencia,
  descricao,
  grupo,
  unidade,
  imagemUrl,
  incidenteId,
}: {
  email: string;
  nome: string;
  titulo: string;
  categoria?: string | null;
  urgencia?: number | null;
  descricao: string;
  grupo: string;
  unidade: string;
  imagemUrl: string | null;
  incidenteId: string;
}) {
  try {
    const resend = getResend();
    if (!resend) {
      throw new Error('Resend não configurado');
    }
    const fromEmail = getFromEmail();
    const branding = await getBranding();

    const content = `
      <p>Olá, <strong>${nome}</strong>!</p>
      
      <p>Seu chamado foi registrado com sucesso e está sendo analisado pela nossa equipe.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Categoria:</span>
          <span class="info-value">${titulo}</span>
          ${urgencia ? `<span class="badge" style="margin-left: 8px;">Urgência: ${urgencia}/5</span>` : ''}
        </div>
        ${categoria && categoria !== titulo ? `
        <div class="info-row">
          <span class="info-label">Tipo:</span>
          <span class="info-value">${categoria.replace(/_/g, ' ')}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Descrição:</span>
          <span class="info-value">${descricao}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Grupo:</span>
          <span class="info-value">${grupo}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Unidade:</span>
          <span class="info-value">${unidade}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ID do Chamado:</span>
          <span class="info-value">${incidenteId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Data de Abertura:</span>
          <span class="info-value">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      
      ${imagemUrl ? `
        <div style="margin: 20px 0; text-align: center;">
          <p style="font-weight: 600; margin-bottom: 10px;">Imagem anexada:</p>
          <img src="${imagemUrl}" alt="Imagem do chamado" style="max-width: 100%; border-radius: 8px;" />
        </div>
      ` : ''}
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        <strong>Informação:</strong> Você receberá uma notificação por email quando o chamado for concluído pela nossa equipe.
      </p>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Chamado Aberto: ${titulo}`,
      html: generateEmailTemplate({
        branding,
        content,
        headerTitle: 'Chamado Aberto',
        headerSubtitle: 'Sistema de Gestão',
      }),
    });

    if (error) {
      console.error('Erro ao enviar email de chamado criado:', error);
      
      // Registrar log de erro
      try {
        const { logEmail } = await import('./message-logs');
        await logEmail({
          to: email,
          subject: `Chamado Aberto: ${titulo}`,
          template: 'chamado-criado',
          context: 'chamado',
          contextId: incidenteId,
          success: false,
          error: error.message || 'Erro desconhecido',
        });
      } catch (logError) {
        console.error('Erro ao registrar log de email:', logError);
      }

      throw new Error(
        `Falha ao enviar email: ${error.message || 'Erro desconhecido'}`
      );
    }

    // Registrar log de sucesso
    try {
      const { logEmail } = await import('./message-logs');
      await logEmail({
        to: email,
        subject: `Chamado Aberto: ${titulo}`,
        template: 'chamado-criado',
        emailId: data?.id || null,
        context: 'chamado',
        contextId: incidenteId,
        success: true,
      });
    } catch (logError) {
      console.error('Erro ao registrar log de email:', logError);
    }

    return data;
  } catch (error) {
    console.error('Erro no envio de email de chamado criado:', error);
    throw error;
  }
}

export async function sendChamadoConcluidoEmail({
  email,
  nome,
  titulo,
  categoria,
  urgencia,
  descricao,
  grupo,
  unidade,
  conclusaoNotas,
  imagemUrl,
  incidenteId,
}: {
  email: string;
  nome: string;
  titulo: string;
  categoria?: string | null;
  urgencia?: number | null;
  descricao: string;
  grupo: string;
  unidade: string;
  conclusaoNotas: string | null;
  imagemUrl: string | null;
  incidenteId: string;
}) {
  try {
    const resend = getResend();
    if (!resend) {
      throw new Error('Resend não configurado');
    }
    const fromEmail = getFromEmail();
    const branding = await getBranding();

    const content = `
      <p>Olá, <strong>${nome}</strong>!</p>
      
      <p>Seu chamado foi concluído pela nossa equipe. Abaixo estão os detalhes:</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Categoria:</span>
          <span class="info-value">${titulo}</span>
          ${urgencia ? `<span class="badge" style="margin-left: 8px;">Urgência: ${urgencia}/5</span>` : ''}
        </div>
        ${categoria && categoria !== titulo ? `
        <div class="info-row">
          <span class="info-label">Tipo:</span>
          <span class="info-value">${categoria.replace(/_/g, ' ')}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Descrição Original:</span>
          <span class="info-value">${descricao}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Grupo:</span>
          <span class="info-value">${grupo}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Unidade:</span>
          <span class="info-value">${unidade}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ID do Chamado:</span>
          <span class="info-value">${incidenteId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Data de Conclusão:</span>
          <span class="info-value">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      
      ${conclusaoNotas ? `
        <div class="conclusao-box">
          <h3 style="margin-top: 0; color: #065f46;">Resposta da Equipe:</h3>
          <p style="margin-bottom: 0; white-space: pre-wrap;">${conclusaoNotas}</p>
        </div>
      ` : ''}
      
      ${imagemUrl ? `
        <div class="image-container">
          <p style="font-weight: 600; margin-bottom: 10px;">Foto de Conclusão:</p>
          <img src="${imagemUrl}" alt="Foto de prova de conclusão do chamado" />
        </div>
      ` : ''}
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        <strong>Informação:</strong> Se você tiver alguma dúvida ou precisar de mais informações, entre em contato conosco.
      </p>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Chamado Concluído: ${titulo}`,
      html: generateEmailTemplate({
        branding,
        content,
        headerTitle: 'Chamado Concluído',
        headerSubtitle: 'Sistema de Gestão',
      }),
    });

    if (error) {
      console.error('Erro ao enviar email de chamado concluído:', error);
      
      // Registrar log de erro
      try {
        const { logEmail } = await import('./message-logs');
        await logEmail({
          to: email,
          subject: `Chamado Concluído: ${titulo}`,
          template: 'chamado-concluido',
          context: 'chamado',
          contextId: incidenteId,
          success: false,
          error: error.message || 'Erro desconhecido',
        });
      } catch (logError) {
        console.error('Erro ao registrar log de email:', logError);
      }

      throw new Error(
        `Falha ao enviar email: ${error.message || 'Erro desconhecido'}`
      );
    }

    // Registrar log de sucesso
    try {
      const { logEmail } = await import('./message-logs');
      await logEmail({
        to: email,
        subject: `Chamado Concluído: ${titulo}`,
        template: 'chamado-concluido',
        emailId: data?.id || null,
        context: 'chamado',
        contextId: incidenteId,
        success: true,
      });
    } catch (logError) {
      console.error('Erro ao registrar log de email:', logError);
    }

    return data;
  } catch (error) {
    console.error('Erro no envio de email de chamado concluído:', error);
    throw error;
  }
}
