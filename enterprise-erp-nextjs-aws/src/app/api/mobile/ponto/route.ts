import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID, createHash } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logAudit } from '@/lib/audit/log';
import { notifySupervisorsAboutPonto } from '@/lib/fcm';

/**
 * OPTIONS /api/mobile/ponto
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 horas
    },
  });
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // m
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function ipToBigInt(ip: string): bigint | undefined {
  if (!ip) return undefined;
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length === 4 && parts.every(p => p >= 0 && p <= 255)) {
      return BigInt(
        parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3]
      );
    }
  }
  if (ip.includes(':')) {
    try {
      const hash = createHash('sha256').update(ip).digest();
      return BigInt('0x' + hash.slice(0, 8).toString('hex'));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function cpfToBigInt(cpf: string): bigint | undefined {
  if (!cpf) return undefined;
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return undefined;
  try {
    return BigInt(cleanCpf);
  } catch {
    return undefined;
  }
}

/**
 * POST /api/mobile/ponto
 * Registrar ponto via app mobile (sem QR code, apenas CPF)
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const tipo = String(form.get('tipo') || '');
    const lat = form.get('lat') ? Number(form.get('lat')) : undefined;
    const lng = form.get('lng') ? Number(form.get('lng')) : undefined;
    const accuracy = form.get('accuracy')
      ? Number(form.get('accuracy'))
      : undefined;
    const deviceId = String(form.get('deviceId') || '') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;
    const ipHeader =
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const ip = ipHeader.split(',')[0]?.trim() || undefined;
    const selfie = form.get('selfie') as File | null;
    const cpfRaw = String(form.get('cpf') || '');
    const cpf = cpfRaw.replace(/\D/g, '').trim() || undefined;

    if (!tipo || !cpf) {
      return NextResponse.json(
        { error: 'Tipo e CPF são obrigatórios' },
        { status: 400 }
      );
    }

    // Normalizar CPF
    const cpfNormalizado = cpf.replace(/\D/g, '').trim();

    if (!cpfNormalizado || cpfNormalizado.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
    }

    // Buscar funcionário pelo CPF
    let funcionario = await prisma.funcionario.findFirst({
      where: { cpf: cpfNormalizado },
      include: { unidade: true, grupo: true },
    });

    if (!funcionario) {
      const todosFuncionarios = await prisma.funcionario.findMany({
        where: { cpf: { not: null } },
        include: { unidade: true },
      });

      funcionario = todosFuncionarios.find(f => {
        if (!f.cpf) return false;
        const cpfBancoNormalizado = f.cpf.replace(/\D/g, '').trim();
        return cpfBancoNormalizado === cpfNormalizado;
      }) || null;
    }

    if (!funcionario) {
      return NextResponse.json(
        { error: 'CPF não cadastrado no sistema' },
        { status: 404 }
      );
    }

    if (!funcionario.unidadeId || !funcionario.unidade) {
      return NextResponse.json(
        { error: 'Funcionário não está vinculado a uma unidade' },
        { status: 400 }
      );
    }

    const unidade = funcionario.unidade;

    // GPS é sempre obrigatório
    if (lat == null || lng == null) {
      return NextResponse.json(
        { error: 'GPS obrigatório. Ative a localização e tente novamente.' },
        { status: 400 }
      );
    }

    // Validar coordenadas
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json(
        { error: 'Coordenadas GPS inválidas' },
        { status: 400 }
      );
    }

    // Geofence OBRIGATÓRIO
    if (
      unidade.lat != null &&
      unidade.lng != null &&
      unidade.radiusM != null
    ) {
      const dist = haversine(
        Number(unidade.lat),
        Number(unidade.lng),
        lat,
        lng
      );
      if (dist > unidade.radiusM) {
        return NextResponse.json(
          {
            error: `Você está fora da área permitida. Distância: ${Math.round(dist)}m (permitido: ${unidade.radiusM}m)`,
            distance: Math.round(dist),
            allowedRadius: unidade.radiusM,
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            'Unidade não tem geofence configurado. Não é possível registrar ponto.',
        },
        { status: 400 }
      );
    }

    // Selfie é obrigatória (mesma validação do sistema web)
    if (!selfie || selfie.size === 0) {
      return NextResponse.json(
        { error: 'Selfie é obrigatória' },
        { status: 400 }
      );
    }

    // Validações de selfie (mesmas do sistema web)
    if (!selfie.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Selfie inválida' },
        { status: 400 }
      );
    }
    if (selfie.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Selfie muito grande (máx 2MB)' },
        { status: 400 }
      );
    }

    // Anti-duplicação: 120s por funcionário/unidade/tipo (mesma do sistema web)
    const now = new Date();
    const twoMinAgo = new Date(now.getTime() - 120 * 1000);
    const dup = await prisma.registroPonto.findFirst({
      where: {
        funcionarioId: funcionario.id,
        unidadeId: funcionario.unidadeId,
        tipo: tipo as any,
        timestamp: { gte: twoMinAgo },
      },
    });
    if (dup) {
      return NextResponse.json(
        { error: 'Batida duplicada (aguarde 2 minutos)' },
        { status: 409 }
      );
    }

    // Upload da selfie para S3 (mesmo formato do sistema web)
    let selfieUrl: string | undefined;
    try {
      const bytes = Buffer.from(await selfie.arrayBuffer());
      const ext = selfie.type.split('/')[1] || 'jpg';
      const key = `ponto/selfies/mobile/${funcionario.id}/${new Date()
        .toISOString()
        .slice(0, 10)}/${randomUUID()}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
          Body: bytes,
          ContentType: selfie.type,
          CacheControl: 'max-age=31536000,immutable',
        })
      );
      selfieUrl = `s3://${process.env.AWS_S3_BUCKET}/${key}`;
    } catch (error) {
      console.error('Erro ao enviar selfie:', error);
      return NextResponse.json(
        { error: 'Falha ao enviar selfie' },
        { status: 500 }
      );
    }

    // Criar registro de ponto
    const registro = await prisma.registroPonto.create({
      data: {
        funcionarioId: funcionario.id,
        unidadeId: funcionario.unidadeId,
        tipo: tipo as any,
        lat: lat,
        lng: lng,
        accuracy: accuracy ? accuracy : null,
        selfieUrl: selfieUrl,
        ip: ip ? ipToBigInt(ip) : null,
        userAgent: userAgent || null,
        deviceId: deviceId || null,
        cpfSnapshot: cpfToBigInt(cpfNormalizado) || null,
      },
    });

    await logAudit({
      action: 'ponto.registrado.mobile',
      resource: 'RegistroPonto',
      resourceId: registro.id,
      success: true,
      ip: ip || '127.0.0.1',
      userAgent: userAgent || 'mobile-app',
      method: 'POST',
      url: '/api/mobile/ponto',
    });

    // Enviar notificação apenas para supervisores que cuidam deste colaborador específico
    if (funcionario.id && funcionario.nome) {
      try {
        // Enviar notificação apenas para supervisores que têm acesso ao funcionário
        notifySupervisorsAboutPonto(
          funcionario.id,
          unidade.id,
          funcionario.grupoId || null,
          {
            registroId: registro.id,
            funcionarioId: funcionario.id,
            funcionarioNome: funcionario.nome,
            tipo: registro.tipo,
            timestamp: registro.timestamp.toISOString(),
            unidadeNome: unidade.nome,
            protocolo: null,
          }
        ).catch(error => {
          console.error('Erro ao enviar notificação FCM (não bloqueia registro):', error);
        });
      } catch (error) {
        // Não bloquear registro de ponto se falhar notificação
        console.error('Erro ao buscar supervisores para notificação:', error);
      }
    }

    const response = NextResponse.json({
      success: true,
      registro: {
        id: registro.id,
        tipo: registro.tipo,
        timestamp: registro.timestamp,
        unidade: {
          nome: unidade.nome,
        },
      },
    });
    
    // CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error: any) {
    console.error('Erro ao registrar ponto mobile:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar ponto' },
      { status: 500 }
    );
  }
}

