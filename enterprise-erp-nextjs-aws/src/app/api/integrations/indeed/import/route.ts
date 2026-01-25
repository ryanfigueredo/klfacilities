import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';

/**
 * Endpoint para importação manual de candidaturas do Indeed
 * 
 * Este endpoint permite importar candidaturas do Indeed manualmente
 * através de um arquivo JSON ou CSV exportado do Indeed.
 * 
 * Requer autenticação de ADMIN ou RH
 */

interface IndeedCandidate {
  applicationId: string;
  jobId?: string;
  jobTitle?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  address?: string;
  resumeUrl?: string;
  resumeText?: string;
  appliedAt?: string;
  status?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !['MASTER', 'ADMIN', 'RH'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const candidates: IndeedCandidate[] = Array.isArray(body.candidates)
      ? body.candidates
      : body.candidate
        ? [body.candidate]
        : [];

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma candidatura fornecida' },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ applicationId: string; error: string }>,
    };

    for (const candidate of candidates) {
      try {
        // Validar dados mínimos
        if (!candidate.applicationId || !candidate.firstName || !candidate.lastName) {
          results.errors.push({
            applicationId: candidate.applicationId || 'unknown',
            error: 'Dados incompletos',
          });
          continue;
        }

        // Verificar se já existe
        const existing = await prisma.curriculo.findFirst({
          where: {
            origem: 'INDEED',
            origemId: candidate.applicationId,
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Processar telefone
        const telefone = candidate.phone
          ? candidate.phone.replace(/\D/g, '').slice(0, 11)
          : '00000000000';

        // Determinar unidade
        let unidadeId: string = '';
        if (candidate.city && candidate.state) {
          const unidade = await prisma.unidade.findFirst({
            where: {
              cidade: { contains: candidate.city, mode: 'insensitive' },
              estado: candidate.state,
              ativa: true,
            },
          });
          unidadeId = unidade?.id || '';
        }

        if (!unidadeId) {
          const fallback = await prisma.unidade.findFirst({
            where: { ativa: true },
            orderBy: { nome: 'asc' },
          });
          unidadeId = fallback?.id || '';
        }

        if (!unidadeId) {
          results.errors.push({
            applicationId: candidate.applicationId,
            error: 'Nenhuma unidade disponível',
          });
          continue;
        }

        // Processar arquivo do currículo
        let arquivoUrl = 'manual://sem-arquivo';
        if (candidate.resumeUrl) {
          try {
            const resumeResponse = await fetch(candidate.resumeUrl);
            if (resumeResponse.ok) {
              const buffer = Buffer.from(await resumeResponse.arrayBuffer());
              const fileName = `indeed_${candidate.applicationId}_${Date.now()}.pdf`;
              
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
            console.error('Erro ao baixar currículo:', error);
          }
        }

        // Criar observações
        const observacoes = [
          `Candidatura importada do Indeed`,
          candidate.jobTitle ? `Vaga: ${candidate.jobTitle}` : '',
          `ID: ${candidate.applicationId}`,
          candidate.resumeText
            ? `\nResumo:\n${candidate.resumeText.slice(0, 500)}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        // Criar currículo
        await prisma.curriculo.create({
          data: {
            nome: candidate.firstName,
            sobrenome: candidate.lastName,
            telefone,
            email: candidate.email || null,
            endereco: candidate.address || null,
            unidadeId,
            arquivoUrl,
            observacoes,
            status: 'PENDENTE',
            origem: 'INDEED',
            origemId: candidate.applicationId,
            origemDados: {
              jobId: candidate.jobId,
              jobTitle: candidate.jobTitle,
              appliedAt: candidate.appliedAt,
              status: candidate.status,
            } as any,
          },
        });

        results.imported++;
      } catch (error: any) {
        results.errors.push({
          applicationId: candidate.applicationId || 'unknown',
          error: error.message || 'Erro desconhecido',
        });
      }
    }

    return NextResponse.json({
      message: 'Importação concluída',
      results,
    });
  } catch (error: any) {
    console.error('Erro ao importar candidaturas do Indeed:', error);
    return NextResponse.json(
      {
        error: 'Erro ao importar candidaturas',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

