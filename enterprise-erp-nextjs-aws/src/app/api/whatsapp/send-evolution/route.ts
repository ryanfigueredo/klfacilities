import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPIService } from '@/lib/evolution-api-whatsapp';

/**
 * POST /api/whatsapp/send-evolution
 * Envia mensagem WhatsApp via Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        {
          error: 'Número de destino (to) e mensagem (message) são obrigatórios',
        },
        { status: 400 }
      );
    }

    console.log('📱 Enviando mensagem via Evolution API');
    console.log(`   Para: ${to}`);
    console.log(`   Mensagem: ${message.substring(0, 100)}...`);

    const result = await evolutionAPIService.sendMessage(to, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        sentTo: to,
        provider: 'evolution-api',
        message: 'Mensagem enviada com sucesso via Evolution API!',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          sentTo: to,
          provider: 'evolution-api',
          message: 'Falha no envio da mensagem via Evolution API',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem via Evolution API:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whatsapp/send-evolution
 * Retorna status da configuração e da instância
 */
export async function GET() {
  try {
    const isConfigured = evolutionAPIService.isConfigured();

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        message:
          'Evolution API não configurada. Configure as variáveis de ambiente.',
        requiredEnvVars: [
          'EVOLUTION_API_URL',
          'EVOLUTION_API_KEY',
          'EVOLUTION_INSTANCE_NAME',
        ],
      });
    }

    const status = await evolutionAPIService.getSessionStatus();

    return NextResponse.json({
      configured: true,
      sessionStatus: status,
      message: 'WAHA WhatsApp configurado',
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return NextResponse.json(
      {
        error: 'Erro ao verificar status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
