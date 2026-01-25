import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('arquivo') as File;
    const nome = formData.get('nome') as string;
    const sobrenome = formData.get('sobrenome') as string;
    const telefone = formData.get('telefone') as string;
    const email = formData.get('email') as string | null;
    const cidadeNome = formData.get('unidadeId') as string; // Agora recebe o nome da cidade
    const endereco = formData.get('endereco') as string | null;

    // Validações básicas
    const estadoSigla = formData.get('estado') as string;
    if (!nome || !sobrenome || !telefone || !cidadeNome || !estadoSigla || !file) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      );
    }

    // Buscar uma unidade ativa na cidade e estado informados
    const unidade = await prisma.unidade.findFirst({
      where: {
        cidade: cidadeNome,
        estado: estadoSigla?.toUpperCase(),
        ativa: true,
      },
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Nenhuma unidade encontrada para a cidade informada' },
        { status: 400 }
      );
    }
    
    const unidadeId = unidade.id;

    // Validar tipo de arquivo (apenas PDF)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Apenas arquivos PDF são permitidos' },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB' },
        { status: 400 }
      );
    }

    // Upload para S3
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const sanitizedNome = nome.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const fileName = `curriculos/${timestamp}-${sanitizedNome}-${randomUUID()}.${fileExtension}`;
    
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileName,
        Body: buffer,
        ContentType: 'application/pdf',
        CacheControl: 'max-age=31536000,immutable',
      })
    );

    // URL do S3
    const arquivoUrl = `s3://${process.env.AWS_S3_BUCKET}/${fileName}`;

    // Salvar no banco de dados
    const curriculo = await prisma.curriculo.create({
      data: {
        nome,
        sobrenome,
        telefone,
        email: email || null,
        unidadeId,
        endereco: endereco || null,
        arquivoUrl,
        status: 'PENDENTE',
      },
      include: {
        unidade: true,
      },
    });

    // Enviar notificação por email para RH
    try {
      const { sendCurriculoNotificationEmail } = await import('@/lib/email');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const adminUrl = `${baseUrl}/rh/banco-talentos`;
      
      await sendCurriculoNotificationEmail({
        nome: curriculo.nome,
        sobrenome: curriculo.sobrenome,
        telefone: curriculo.telefone,
        email: curriculo.email,
        endereco: curriculo.endereco,
        unidadeNome: curriculo.unidade.nome,
        adminUrl,
      });
    } catch (emailError) {
      console.error('Erro ao enviar email de notificação:', emailError);
      // Continuar mesmo se o email falhar
    }

    return NextResponse.json({
      success: true,
      curriculo: {
        id: curriculo.id,
        nome: curriculo.nome,
        sobrenome: curriculo.sobrenome,
        unidade: curriculo.unidade.nome,
      },
    });
  } catch (error: any) {
    console.error('Erro ao fazer upload do currículo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar o currículo' },
      { status: 500 }
    );
  }
}
