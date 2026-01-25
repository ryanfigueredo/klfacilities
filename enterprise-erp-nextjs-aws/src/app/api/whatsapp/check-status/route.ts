import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Simular uma verificação de status de mensagem
    const messageId = 'wamid.HBgNNTUyMTk5NzYyNDg3MxUCABEYEkI0Q0NDOEE2OEREQ0NGMTM4MwA=';
    
    // Fazer uma requisição para verificar o status da mensagem
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${messageId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    
    return NextResponse.json({
      messageId,
      status: response.status,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao verificar status', details: error },
      { status: 500 }
    );
  }
}
