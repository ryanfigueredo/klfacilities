import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/chamados?error=token_invalido`
      );
    }

    // Buscar confirmação
    const confirmacao = await prisma.checklistRelatorioConfirmacao.findUnique({
      where: { tokenConfirmacao: token },
      include: {
        resposta: {
          include: {
            unidade: {
              select: {
                nome: true,
              },
            },
          },
        },
        clienteFinal: {
          select: {
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!confirmacao) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/chamados?error=token_invalido`
      );
    }

    if (confirmacao.confirmado) {
      // Já confirmado, mostrar página de sucesso
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmação Recebida</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
            .container { max-width: 500px; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .success { color: #10b981; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #1f2937; margin-bottom: 10px; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Confirmação Já Recebida</h1>
            <p>Você já confirmou o recebimento deste relatório em ${new Date(confirmacao.confirmadoEm!).toLocaleString('pt-BR')}.</p>
            <p>Obrigado pela sua atenção!</p>
          </div>
        </body>
        </html>
        `,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Confirmar
    await prisma.checklistRelatorioConfirmacao.update({
      where: { id: confirmacao.id },
      data: {
        confirmado: true,
        confirmadoEm: new Date(),
      },
    });

    // Página de sucesso
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmação Recebida</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
          .container { max-width: 500px; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
          .success { color: #10b981; font-size: 48px; margin-bottom: 20px; }
          h1 { color: #1f2937; margin-bottom: 10px; }
          p { color: #6b7280; }
          .info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; text-align: left; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>Confirmação Recebida!</h1>
          <p>Obrigado, ${confirmacao.clienteFinal.nome}!</p>
          <div class="info">
            <p><strong>Relatório confirmado:</strong></p>
            <p>Unidade: ${confirmacao.resposta.unidade.nome}</p>
            <p>Data: ${new Date(confirmacao.resposta.submittedAt || confirmacao.resposta.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <p>Seu recebimento foi registrado com sucesso. Obrigado pela sua atenção!</p>
        </div>
      </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('Erro ao confirmar relatório:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/chamados?error=erro_interno`
    );
  }
}

