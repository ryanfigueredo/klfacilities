import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Número de telefone é obrigatório' },
        { status: 400 }
      );
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      return NextResponse.json(
        { error: 'WhatsApp não configurado' },
        { status: 500 }
      );
    }

    // Teste 1: Verificar se o token está válido
    console.log('🔍 Teste 1: Verificando token...');
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v24.0/${phoneId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const tokenData = await tokenResponse.json();
    console.log('Token status:', tokenResponse.status);
    console.log('Token data:', JSON.stringify(tokenData, null, 2));

    if (!tokenResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido',
        details: tokenData,
      });
    }

    // Teste 2: Verificar informações da conta
    console.log('🔍 Teste 2: Verificando conta...');
    const accountResponse = await fetch(
      `https://graph.facebook.com/v24.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const accountData = await accountResponse.json();
    console.log('Account status:', accountResponse.status);
    console.log('Account data:', JSON.stringify(accountData, null, 2));

    // Teste 3: Tentar enviar mensagem simples
    console.log('🔍 Teste 3: Enviando mensagem...');

    // Função para formatar número brasileiro (mesma lógica do WhatsApp Service)
    function formatBrazilianPhone(phone: string): string {
      let cleanPhone = phone.replace(/\D/g, '');

      if (cleanPhone.startsWith('55')) {
        const localNumber = cleanPhone.substring(2);
        if (localNumber.length === 10) {
          const ddd = localNumber.substring(0, 2);
          const number = localNumber.substring(2);
          cleanPhone = `55${ddd}9${number}`;
        } else if (localNumber.length === 11) {
          cleanPhone = `55${localNumber}`;
        }
      } else {
        if (cleanPhone.length === 10) {
          const ddd = cleanPhone.substring(0, 2);
          const number = cleanPhone.substring(2);
          cleanPhone = `55${ddd}9${number}`;
        } else if (cleanPhone.length === 11) {
          cleanPhone = `55${cleanPhone}`;
        }
      }

      return cleanPhone;
    }

    const cleanNumber = formatBrazilianPhone(phoneNumber);
    console.log('Número original:', phoneNumber);
    console.log('Número formatado:', cleanNumber);

    const message = {
      messaging_product: 'whatsapp',
      to: cleanNumber,
      type: 'text',
      text: {
        body: 'Teste de debug - mensagem simples',
      },
    };

    console.log('Mensagem:', JSON.stringify(message, null, 2));

    const messageResponse = await fetch(
      `https://graph.facebook.com/v24.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    const messageData = await messageResponse.json();
    console.log('Message status:', messageResponse.status);
    console.log('Message response:', JSON.stringify(messageData, null, 2));

    return NextResponse.json({
      success: messageResponse.ok,
      tokenValid: tokenResponse.ok,
      accountInfo: accountData,
      messageResponse: messageData,
      debugInfo: {
        phoneNumber,
        cleanNumber,
        message,
      },
    });
  } catch (error) {
    console.error('Erro no debug:', error);
    return NextResponse.json(
      {
        error: 'Erro interno',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
