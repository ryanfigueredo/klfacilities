import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';

/**
 * Webhook para receber candidaturas do Indeed
 *
 * Este endpoint pode ser configurado no Indeed para receber notificações
 * quando há novas candidaturas. O Indeed enviará os dados do candidato
 * e o sistema importará automaticamente para o banco de talentos.
 *
 * Para configurar:
 * 1. Acesse o painel do Indeed Employer
 * 2. Vá em Integrações > Webhooks
 * 3. Configure a URL: https://seu-dominio.com/api/integrations/indeed/webhook
 * 4. Configure o secret token (use INDEED_WEBHOOK_SECRET no .env)
 */

interface IndeedApplication {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  candidate: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    resume?: {
      url?: string;
      text?: string;
    };
    address?: {
      city?: string;
      state?: string;
      full?: string;
    };
  };
  appliedAt: string;
  status?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação do webhook (se configurado)
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.INDEED_WEBHOOK_SECRET;

    // Suporta diferentes formatos de autenticação do Indeed
    if (webhookSecret) {
      const bearerToken = `Bearer ${webhookSecret}`;
      const basicToken = `Basic ${Buffer.from(webhookSecret).toString('base64')}`;

      // Verificar Bearer Token ou Basic Auth
      if (
        authHeader !== bearerToken &&
        authHeader !== basicToken &&
        authHeader !== webhookSecret
      ) {
        // Se houver header X-API-Key (formato alternativo)
        const apiKey = request.headers.get('x-api-key');
        if (apiKey !== webhookSecret) {
          return NextResponse.json(
            { error: 'Não autorizado' },
            { status: 401 }
          );
        }
      }
    }

    const body: IndeedApplication = await request.json();

    // Validar dados mínimos
    if (
      !body.applicationId ||
      !body.candidate?.firstName ||
      !body.candidate?.lastName
    ) {
      return NextResponse.json(
        {
          error:
            'Dados inválidos: applicationId, firstName e lastName são obrigatórios',
        },
        { status: 400 }
      );
    }

    // Verificar se já existe candidatura com este ID
    const existing = await prisma.curriculo.findFirst({
      where: {
        origem: 'INDEED',
        origemId: body.applicationId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Candidatura já importada', id: existing.id },
        { status: 200 }
      );
    }

    // Processar telefone
    const telefone = body.candidate.phone
      ? body.candidate.phone.replace(/\D/g, '').slice(0, 11)
      : '00000000000';

    // Determinar unidade baseado na cidade/estado
    // Se não encontrar, criar com status especial para vinculação manual
    let unidadeId: string | null = null;
    const cidade = body.candidate.address?.city;
    const estado = body.candidate.address?.state;
    let cidadeNaoEncontrada = false;

    if (cidade && estado) {
      // Buscar unidade pela cidade e estado
      const unidade = await prisma.unidade.findFirst({
        where: {
          cidade: { contains: cidade, mode: 'insensitive' },
          estado: estado,
          ativa: true,
        },
      });

      if (unidade) {
        unidadeId = unidade.id;
      } else {
        // Cidade não encontrada - marcar para vinculação manual
        cidadeNaoEncontrada = true;
        // Usar uma unidade placeholder temporária (criar se não existir)
        let unidadePlaceholder = await prisma.unidade.findFirst({
          where: {
            nome: 'PENDENTE - VINCULAÇÃO MANUAL',
            ativa: false, // Inativa para não aparecer em listagens normais
          },
        });

        if (!unidadePlaceholder) {
          unidadePlaceholder = await prisma.unidade.create({
            data: {
              nome: 'PENDENTE - VINCULAÇÃO MANUAL',
              cidade: 'PENDENTE',
              estado: 'XX',
              ativa: false, // Inativa para não bagunçar
            },
          });
        }
        unidadeId = unidadePlaceholder.id;
      }
    } else {
      // Sem localização - também marcar para vinculação manual
      cidadeNaoEncontrada = true;
      let unidadePlaceholder = await prisma.unidade.findFirst({
        where: {
          nome: 'PENDENTE - VINCULAÇÃO MANUAL',
          ativa: false,
        },
      });

      if (!unidadePlaceholder) {
        unidadePlaceholder = await prisma.unidade.create({
          data: {
            nome: 'PENDENTE - VINCULAÇÃO MANUAL',
            cidade: 'PENDENTE',
            estado: 'XX',
            ativa: false,
          },
        });
      }
      unidadeId = unidadePlaceholder.id;
    }

    if (!unidadeId) {
      return NextResponse.json(
        { error: 'Erro ao processar candidatura' },
        { status: 500 }
      );
    }

    // Processar arquivo do currículo (se disponível)
    let arquivoUrl = 'manual://sem-arquivo';

    if (body.candidate.resume?.url) {
      try {
        // Baixar o arquivo do Indeed
        const resumeResponse = await fetch(body.candidate.resume.url);
        if (resumeResponse.ok) {
          const buffer = Buffer.from(await resumeResponse.arrayBuffer());
          const fileName = `indeed_${body.applicationId}_${Date.now()}.pdf`;

          const uploadedUrl = await uploadBufferToS3({
            buffer,
            originalName: fileName,
            contentType: 'application/pdf',
            prefix: 'curriculos/indeed',
          });

          if (uploadedUrl) {
            arquivoUrl = uploadedUrl;
          }
        }
      } catch (error) {
        console.error('Erro ao baixar currículo do Indeed:', error);
        // Continuar sem o arquivo se houver erro
      }
    }

    // Criar observações com dados adicionais do Indeed
    const observacoes = [
      `Candidatura importada do Indeed`,
      `Vaga: ${body.jobTitle || 'N/A'}`,
      `ID da candidatura: ${body.applicationId}`,
      cidadeNaoEncontrada
        ? `\n ATENÇÃO: Cidade não encontrada no sistema!\nCidade informada: ${cidade || 'N/A'}, Estado: ${estado || 'N/A'}\nNecessária vinculação manual a uma unidade existente.`
        : '',
      body.candidate.resume?.text
        ? `\nResumo do candidato:\n${body.candidate.resume.text.slice(0, 500)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Criar currículo no banco
    // Se cidade não foi encontrada, usar status especial
    const status = cidadeNaoEncontrada ? 'PENDENTE_VINCULACAO' : 'PENDENTE';

    const curriculo = await prisma.curriculo.create({
      data: {
        nome: body.candidate.firstName,
        sobrenome: body.candidate.lastName,
        telefone,
        email: body.candidate.email || null,
        endereco: body.candidate.address?.full || null,
        unidadeId,
        arquivoUrl,
        observacoes,
        status,
        origem: 'INDEED',
        origemId: body.applicationId,
        origemDados: {
          jobId: body.jobId,
          jobTitle: body.jobTitle,
          appliedAt: body.appliedAt,
          status: body.status,
          cidadeInformada: cidade,
          estadoInformado: estado,
          cidadeNaoEncontrada: cidadeNaoEncontrada,
        } as any,
      },
    });

    return NextResponse.json(
      {
        message: 'Candidatura importada com sucesso',
        id: curriculo.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao processar webhook do Indeed:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar candidatura',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'Webhook do Indeed está ativo',
    timestamp: new Date().toISOString(),
  });
}
