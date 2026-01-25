import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'default';

    if (!evolutionUrl || !evolutionApiKey) {
      return NextResponse.json({
        status: 'NOT_CONFIGURED',
        healthy: false,
        message:
          'Evolution API não configurado. Configure as variáveis de ambiente.',
      });
    }

    const response = await fetch(
      `${evolutionUrl}/instance/connectionState/${instanceName}`,
      {
        headers: {
          apikey: evolutionApiKey,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        status: 'ERROR',
        healthy: false,
        message: `Erro ao conectar: ${response.status}`,
      });
    }

    const data = await response.json();
    const state = data.instance?.state || 'UNKNOWN';

    return NextResponse.json({
      status: state,
      healthy: state === 'open',
      message: getStatusMessage(state),
      dashboardUrl: `${evolutionUrl}/manager/${instanceName}`,
    });
  } catch (error) {
    console.error('Erro ao verificar status Evolution API:', error);
    return NextResponse.json({
      status: 'ERROR',
      healthy: false,
      message: 'Erro ao verificar status do WhatsApp',
    });
  }
}

function getStatusMessage(state: string): string {
  const messages: Record<string, string> = {
    open: ' Conectado e funcionando',
    connecting: 'Conectando...',
    close: 'Desconectado',
    UNKNOWN: 'Status desconhecido',
  };

  return messages[state] || `Status: ${state}`;
}
