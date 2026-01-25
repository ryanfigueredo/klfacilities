import { prisma } from '@/lib/prisma';

interface LogWhatsAppMessageParams {
  to: string;
  message: string;
  messageId?: string | null;
  provider?: string;
  success: boolean;
  error?: string | null;
  context?: string | null;
  contextId?: string | null;
  userId?: string | null;
}

export async function logWhatsAppMessage(params: LogWhatsAppMessageParams) {
  try {
    await prisma.whatsAppMessageLog.create({
      data: {
        to: params.to,
        message: params.message,
        messageId: params.messageId || null,
        provider: params.provider || 'evolution-api',
        success: params.success,
        error: params.error || null,
        context: params.context || null,
        contextId: params.contextId || null,
        userId: params.userId || null,
      },
    });
  } catch (error) {
    console.error('Erro ao registrar log de mensagem WhatsApp:', error);
    // Não falhar o processo se o log não for registrado
  }
}

interface LogEmailParams {
  to: string;
  subject: string;
  template?: string | null;
  emailId?: string | null;
  success: boolean;
  error?: string | null;
  context?: string | null;
  contextId?: string | null;
  userId?: string | null;
}

export async function logEmail(params: LogEmailParams) {
  try {
    await prisma.emailLog.create({
      data: {
        to: params.to,
        subject: params.subject,
        template: params.template || null,
        emailId: params.emailId || null,
        success: params.success,
        error: params.error || null,
        context: params.context || null,
        contextId: params.contextId || null,
        userId: params.userId || null,
      },
    });
  } catch (error) {
    console.error('Erro ao registrar log de email:', error);
    // Não falhar o processo se o log não for registrado
  }
}

