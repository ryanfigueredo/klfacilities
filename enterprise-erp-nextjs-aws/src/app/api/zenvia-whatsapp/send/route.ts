import { NextRequest, NextResponse } from 'next/server';
import { zenviaWhatsApp } from '@/lib/zenvia-whatsapp';

export async function POST(request: NextRequest) {
  try {
    const { to, message, type = 'text' } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'to and message are required' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'template') {
      // Para templates estruturados
      const { templateName, parameters } = message;
      result = await zenviaWhatsApp.sendTemplateMessage(to, templateName, parameters);
    } else {
      // Para mensagens de texto simples
      result = await zenviaWhatsApp.sendTextMessage(to, message);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro no endpoint Zenvia WhatsApp:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
