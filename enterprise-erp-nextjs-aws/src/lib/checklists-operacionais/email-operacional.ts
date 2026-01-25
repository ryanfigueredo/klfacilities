import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getResend } from '@/lib/email';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ChecklistRespostaWithRelations = Prisma.ChecklistRespostaGetPayload<{
  include: {
    template: {
      select: {
        id: true;
        titulo: true;
      };
    };
    unidade: {
      select: {
        id: true;
        nome: true;
      };
    };
    supervisor: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export async function sendEmailToOperacional(
  resposta: ChecklistRespostaWithRelations
) {
  // Buscar todos os usuários com role OPERACIONAL
  const usuariosOperacional = await prisma.user.findMany({
    where: {
      role: 'OPERACIONAL',
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (usuariosOperacional.length === 0) {
    console.log('Nenhum usuário OPERACIONAL encontrado para enviar email');
    return;
  }

  const resend = getResend();
  if (!resend) {
    console.error('Resend não configurado - email não será enviado');
    return;
  }

  const dataEnvio = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  const assunto = `Checklist ${resposta.template.titulo} - ${resposta.unidade.nome}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${assunto}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin-top: 0;">Checklist Assinado pelo Gerente</h2>
        <p style="margin: 0;">Um novo checklist foi assinado e está disponível para análise.</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Informações do Checklist
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Template:</td>
            <td style="padding: 8px 0;">${resposta.template.titulo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Unidade:</td>
            <td style="padding: 8px 0;">${resposta.unidade.nome}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Supervisor:</td>
            <td style="padding: 8px 0;">${resposta.supervisor.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Data de Envio:</td>
            <td style="padding: 8px 0;">${dataEnvio}</td>
          </tr>
          ${resposta.protocolo
            ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Protocolo:</td>
            <td style="padding: 8px 0; font-family: monospace;">${resposta.protocolo}</td>
          </tr>
          `
            : ''}
        </table>
      </div>

      <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 20px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>✓ Checklist assinado pelo gerente</strong><br>
          O relatório foi revisado e aprovado. Você pode visualizar os detalhes completos no sistema.
        </p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/operacional/checklists/respondidos" 
           style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver Checklist no Sistema
        </a>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
        <p>Este é um email automático do sistema KL ERP.</p>
        <p>Por favor, não responda este email.</p>
      </div>
    </body>
    </html>
  `;

  // Enviar email para todos os usuários OPERACIONAL
  const emailPromises = usuariosOperacional.map(usuario =>
    resend.emails.send({
      from: process.env.SMTP_FROM || 'noreply@klfacilities.com.br',
      to: usuario.email,
      subject: assunto,
      html: htmlContent,
    })
  );

  await Promise.all(emailPromises);
  console.log(
    `Emails enviados para ${usuariosOperacional.length} usuário(s) OPERACIONAL`
  );
}

