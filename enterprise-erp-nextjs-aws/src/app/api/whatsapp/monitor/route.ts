import { NextRequest, NextResponse } from 'next/server';
import { whatsappMonitor } from '@/lib/whatsapp-monitor';

/**
 * GET /api/whatsapp/monitor
 * Endpoint para monitorar status do WhatsApp e enviar alertas
 * Deve ser chamado por um cron job (ex: Vercel Cron)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar se tem authorization header (segurança básica)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'change-me'}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Executar monitoramento
    await whatsappMonitor.monitor();

    return NextResponse.json({
      success: true,
      message: 'Monitoramento executado',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro no monitoramento WhatsApp:', error);
    return NextResponse.json(
      {
        error: 'Erro ao executar monitoramento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

