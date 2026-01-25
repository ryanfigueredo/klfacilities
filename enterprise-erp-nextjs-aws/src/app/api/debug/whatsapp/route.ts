import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    // Não vamos retornar o token completo por segurança
    const tokenPreview = token
      ? `${token.substring(0, 20)}...`
      : 'NÃO CONFIGURADO';

    return NextResponse.json({
      tokenConfigured: !!token,
      tokenLength: token?.length || 0,
      tokenPreview,
      phoneId: phoneId || 'NÃO CONFIGURADO',
      phoneIdConfigured: !!phoneId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get debug info' },
      { status: 500 }
    );
  }
}
