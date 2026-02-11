import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID, createHash } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logAudit } from '@/lib/audit/log';
import { isUniversalQRCode } from '@/lib/ponto-universal';
import { notifySupervisorsAboutPonto } from '@/lib/fcm';

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

// Helper function to convert IP string to BigInt
function ipToBigInt(ip: string): bigint | undefined {
  if (!ip) return undefined;

  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length === 4 && parts.every(p => p >= 0 && p <= 255)) {
      return BigInt(
        parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3]
      );
    }
  }

  // Handle IPv6 (simplified - just convert to BigInt if possible)
  if (ip.includes(':')) {
    try {
      // For simplicity, we'll hash IPv6 addresses to a BigInt
      const hash = createHash('sha256').update(ip).digest();
      return BigInt('0x' + hash.slice(0, 8).toString('hex'));
    } catch {
      return undefined;
    }
  }

  return undefined;
}

// Helper function to convert CPF string to BigInt
function cpfToBigInt(cpf: string): bigint | undefined {
  if (!cpf) return undefined;

  // Remove all non-numeric characters
  const cleanCpf = cpf.replace(/\D/g, '');

  // Validate CPF length (11 digits)
  if (cleanCpf.length !== 11) return undefined;

  try {
    return BigInt(cleanCpf);
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();

  const form = await req.formData();
  const code = String(form.get('code') || '');
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
  const cpf = cpfRaw.replace(/\D/g, '').trim() || undefined; // Normalizar CPF (remover formatação e espaços)

  if (!code || !tipo) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos' },
      { status: 400 }
    );
  }

  // Verificar se é QR code universal
  const isUniversal = isUniversalQRCode(code);
  
  let qr: any = null;
  let unidade: any = null;
  
  let funcionarioFinal: any = null;
  
  if (isUniversal) {
    // QR Universal: precisa identificar funcionário primeiro para saber a unidade
    if (!cpf) {
      return NextResponse.json(
        { error: 'Para QR universal, é necessário informar o CPF primeiro' },
        { status: 400 }
      );
    }
    
    // Normalizar CPF (remover formatação e espaços)
    const cpfNormalizado = cpf?.replace(/\D/g, '').trim();
    
    if (!cpfNormalizado || cpfNormalizado.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }
    
    // Buscar funcionário pelo CPF (com unidades permitidas para múltiplas lojas)
    funcionarioFinal = await prisma.funcionario.findFirst({
      where: { cpf: cpfNormalizado },
      include: {
        unidade: true,
        unidadesPermitidas: { include: { unidade: true } },
      },
    });

    if (!funcionarioFinal) {
      const todosFuncionarios = await prisma.funcionario.findMany({
        where: { cpf: { not: null } },
        include: {
          unidade: true,
          unidadesPermitidas: { include: { unidade: true } },
        },
      });
      funcionarioFinal =
        todosFuncionarios.find(f => {
          if (!f.cpf) return false;
          const cpfBancoNormalizado = f.cpf.replace(/\D/g, '').trim();
          return cpfBancoNormalizado === cpfNormalizado;
        }) || null;
      if (funcionarioFinal && funcionarioFinal.cpf !== cpfNormalizado) {
        try {
          await prisma.funcionario.update({
            where: { id: funcionarioFinal.id },
            data: { cpf: cpfNormalizado },
          });
          funcionarioFinal.cpf = cpfNormalizado;
        } catch (error) {
          console.error('[PONTO] Erro ao normalizar CPF no banco:', error);
        }
      }
    }

    if (!funcionarioFinal) {
      return NextResponse.json(
        { error: 'CPF não cadastrado no sistema. Verifique se o CPF está correto ou entre em contato com o RH.' },
        { status: 404 }
      );
    }

    const unidadesPermitidas =
      funcionarioFinal.unidadesPermitidas?.length > 0
        ? funcionarioFinal.unidadesPermitidas.map((u: any) => u.unidade)
        : funcionarioFinal.unidade
          ? [funcionarioFinal.unidade]
          : [];

    if (unidadesPermitidas.length === 0) {
      return NextResponse.json(
        { error: 'Funcionário não está vinculado a nenhuma unidade' },
        { status: 400 }
      );
    }

    // Unidade será resolvida depois pelo geofence (qual das permitidas contém o ponto)
    unidade = null;
    qr = {
      id: 'universal',
      code: code,
      unidadeId: null,
      unidade: null,
      _unidadesPermitidas: unidadesPermitidas,
    };
  } else {
    // QR normal: buscar QR code e unidade
    qr = await prisma.pontoQrCode.findFirst({
      where: { code, ativo: true },
      include: { unidade: true },
    });
    
    if (!qr) {
      return NextResponse.json({ error: 'QR inválido' }, { status: 400 });
    }
    
    unidade = qr.unidade;
  }

  // GPS é sempre obrigatório
  if (lat == null || lng == null) {
    return NextResponse.json(
      { error: 'GPS obrigatório. Ative a localização e tente novamente.' },
      { status: 400 }
    );
  }

  // Validar se as coordenadas são válidas
  if (
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: 'Coordenadas GPS inválidas. Tente novamente.' },
      { status: 400 }
    );
  }

  // QR Universal: resolver em qual unidade permitida o colaborador está (geofence)
  if (isUniversal && qr?._unidadesPermitidas?.length) {
    const permitidas = qr._unidadesPermitidas as any[];
    unidade = permitidas.find(
      (u: any) =>
        u.lat != null &&
        u.lng != null &&
        u.radiusM != null &&
        haversine(Number(u.lat), Number(u.lng), lat!, lng!) <= (u.radiusM ?? 0)
    ) || null;
    if (!unidade) {
      return NextResponse.json(
        {
          error:
            'Você está fora da área de todas as suas unidades. Aproxime-se de uma das lojas onde pode bater ponto.',
        },
        { status: 400 }
      );
    }
    qr.unidadeId = unidade.id;
    qr.unidade = unidade;
  }

  // Geofence OBRIGATÓRIO - validar sempre usando a unidade (do QR ou do funcionário)
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
          error: `Você está fora da área permitida para esta unidade. Distância: ${Math.round(dist)}m (permitido: ${unidade.radiusM}m). Por favor, dirija-se até a unidade para registrar o ponto.`,
          distance: Math.round(dist),
          allowedRadius: unidade.radiusM,
        },
        { status: 400 }
      );
    }
  } else {
    // Se não tem geofence configurado, BLOQUEAR registro
    console.error(
      `[PONTO] ERRO CRÍTICO: Unidade ${unidade.nome} (${unidade.id}) não tem geofence configurado. Não é possível registrar ponto sem validação de localização.`
    );
    return NextResponse.json(
      {
        error:
          'Você não está no local cadastrado. Se dirija para dentro da unidade para bater o ponto.',
        unidade: unidade.nome,
      },
      { status: 400 }
    );
  }

  // Anti-duplicação: 120s por usuário/unidade/tipo
  const now = new Date();
  const twoMinAgo = new Date(now.getTime() - 120 * 1000);
  const dup = await prisma.registroPonto.findFirst({
    where: {
      criadoPorId: me?.id || undefined,
      unidadeId: unidade.id,
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

  // Upload selfie
  let selfieUrl: string | undefined;
  if (selfie && selfie.size > 0) {
    if (!selfie.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Selfie inválida' }, { status: 400 });
    }
    if (selfie.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Selfie muito grande (máx 2MB)' },
        { status: 400 }
      );
    }
    const bytes = Buffer.from(await selfie.arrayBuffer());
    const ext = selfie.type.split('/')[1] || 'jpg';
    const ownerForKey = me?.id || 'public';
    const key = `ponto/selfies/${ownerForKey}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
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
  }

  // resolve funcionario por CPF se enviado
  // Se for QR universal, já buscamos o funcionário acima, então só precisamos pegar ID e nome
  let funcionarioId: string | null = null;
  let funcionarioNome: string | null = null;
  
  if (isUniversal && cpf) {
    // Para QR universal, já temos o funcionário buscado acima
    // Usar o funcionárioFinal que já foi buscado
    if (funcionarioFinal) {
      funcionarioId = funcionarioFinal.id;
      funcionarioNome = funcionarioFinal.nome;
    }
  } else if (cpf) {
    // Normalizar CPF antes de buscar
    const cpfNormalizado = cpf.replace(/\D/g, '').trim();
    
    // Para QR normal, buscar funcionário normalmente
    let f = await prisma.funcionario.findFirst({
      where: { cpf: cpfNormalizado },
      select: { id: true, nome: true },
    });
    
    // Se não encontrou, buscar todos e filtrar manualmente (pode ter formatação no banco)
    if (!f) {
      const todosFuncionarios = await prisma.funcionario.findMany({
        where: { cpf: { not: null } },
        select: { id: true, nome: true, cpf: true },
      });
      
      const funcionarioEncontrado = todosFuncionarios.find(func => {
        if (!func.cpf) return false;
        const cpfBancoNormalizado = func.cpf.replace(/\D/g, '').trim();
        return cpfBancoNormalizado === cpfNormalizado;
      });
      
      if (funcionarioEncontrado) {
        f = funcionarioEncontrado;
        // Normalizar CPF no banco se encontrou com formatação
        if (funcionarioEncontrado.cpf !== cpfNormalizado) {
          try {
            await prisma.funcionario.update({
              where: { id: funcionarioEncontrado.id },
              data: { cpf: cpfNormalizado },
            });
          } catch (error) {
            console.error('[PONTO] Erro ao normalizar CPF no banco:', error);
          }
        }
      }
    }
    
    if (f) {
      funcionarioId = f.id;
      funcionarioNome = f.nome;
    } else {
      // CPF não cadastrado - informar ao usuário
      return NextResponse.json(
        {
          error: 'CPF não cadastrado no sistema',
          message: 'Entre em contato com o RH para cadastrar seu CPF',
          cpf: cpfNormalizado,
        },
        { status: 404 }
      );
    }
  }

  // Verificar termo de ciência se funcionário foi identificado
  if (funcionarioId) {
    const termoCiencia = await prisma.termoCienciaPonto.findUnique({
      where: { funcionarioId },
    });
    if (!termoCiencia) {
      return NextResponse.json(
        {
          error: 'termo_ciencia_nao_assinado',
          message: 'É necessário assinar o termo de ciência antes de registrar ponto.',
          funcionarioId,
        },
        { status: 403 }
      );
    }
  }

  // Ponto é sempre anônimo - não precisa de usuário logado
  // O vínculo real é pelo CPF do funcionário, não pelo usuário logado
  const criadoPorId = null;

  // VALIDAÇÃO: Verificar se já bateu este tipo hoje (horário de Brasília)
  const { toZonedTime } = await import('date-fns-tz');
  const brasiliaTime = toZonedTime(now, 'America/Sao_Paulo');
  const inicioDiaBrasilia = new Date(brasiliaTime);
  inicioDiaBrasilia.setHours(0, 0, 0, 0);
  const fimDiaBrasilia = new Date(brasiliaTime);
  fimDiaBrasilia.setHours(23, 59, 59, 999);

  // Converter para UTC
  const ano = inicioDiaBrasilia.getFullYear();
  const mes = String(inicioDiaBrasilia.getMonth() + 1).padStart(2, '0');
  const dia = String(inicioDiaBrasilia.getDate()).padStart(2, '0');
  const inicioDiaISO = `${ano}-${mes}-${dia}T00:00:00-03:00`;
  const inicioDiaUTC = new Date(inicioDiaISO);
  const fimDiaISO = `${ano}-${mes}-${dia}T23:59:59.999-03:00`;
  const fimDiaUTC = new Date(fimDiaISO);

  // Verificar se já existe registro deste tipo hoje
  const registroExistente = await prisma.registroPonto.findFirst({
    where: {
      funcionarioId,
      unidadeId: unidade.id,
      tipo: tipo as any,
      timestamp: {
        gte: inicioDiaUTC,
        lte: fimDiaUTC,
      },
    },
  });

  if (registroExistente) {
    const tipoNome =
      tipo === 'ENTRADA'
        ? 'Entrada'
        : tipo === 'SAIDA'
          ? 'Saída'
          : tipo === 'INTERVALO_INICIO'
            ? 'Intervalo - Início'
            : tipo === 'INTERVALO_FIM'
              ? 'Intervalo - Término'
              : tipo === 'HORA_EXTRA_INICIO'
                ? 'Hora Extra - Início'
                : 'Hora Extra - Saída';
    return NextResponse.json(
      {
        error: `Você já registrou ${tipoNome} hoje.`,
        tipoBatido: tipo,
      },
      { status: 409 }
    );
  }

  // Monta string canônica e gera hash/protocolo
  const canonical = [
    `ts=${now.toISOString()}`,
    `cpf=${cpf || ''}`,
    `unidade=${unidade.id}`,
    `tipo=${tipo}`,
    `ip=${ip || ''}`,
    `device=${deviceId || ''}`,
    `qr=${isUniversal ? 'universal' : qr.id}`,
  ].join('|');
  const hash = createHash('sha256').update(canonical).digest('hex');
  const protocolo = `KL-${now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${hash.slice(0, 8).toUpperCase()}`;

  // criadoPorId já foi validado acima (usuário público sempre existe)

  const created = await prisma.registroPonto.create({
    data: {
      funcionarioId,
      unidadeId: unidade.id,
      tipo: tipo as any,
      timestamp: now,
      lat: lat as any,
      lng: lng as any,
      accuracy: accuracy as any,
      selfieUrl: selfieUrl,
      ip: ipToBigInt(ip || ''),
      userAgent,
      deviceId,
      qrcodeId: isUniversal ? null : qr.id, // QR universal não tem ID no banco
      hash,
      protocolo,
      cpfSnapshot: cpfToBigInt(cpf || ''),
      criadoPorId: criadoPorId,
    } as any,
  });

  // PROCESSAR FOTO FACIAL AUTOMATICAMENTE (se funcionário existe e tem selfie)
  // Se o funcionário não tem foto cadastrada ainda, usar a selfie para cadastrar
  if (funcionarioId && selfie && selfie.size > 0) {
    try {
      const funcionarioCompleto = await prisma.funcionario.findUnique({
        where: { id: funcionarioId },
        select: { fotoUrl: true, faceDescriptor: true },
      });

      // Se não tem foto cadastrada OU se o descritor está vazio, processar automaticamente
      // Nota: O descritor será gerado no cliente e enviado junto com a selfie
      // Por enquanto, apenas marcamos que precisa processar (será feito no próximo passo)
      // A geração do descritor será feita no cliente usando face-api.js
    } catch (error) {
      // Não bloquear o registro de ponto se falhar o processamento facial
      console.error('Erro ao processar foto facial automaticamente:', error);
    }
  }

  // Log na auditoria
  const description = funcionarioNome
    ? `Registro de ponto: ${funcionarioNome} - ${tipo} em ${unidade.nome}`
    : `Registro de ponto: ${tipo} em ${unidade.nome} (CPF não cadastrado)`;

  await logAudit({
    action: 'ponto.create',
    resource: 'RegistroPonto',
    resourceId: created.id,
    userId: undefined,
    userEmail: 'public@ponto.kl',
    userRole: 'RH',
    success: true,
    ip: ip || '',
    userAgent: userAgent || '',
    method: 'POST',
    url: '/api/ponto/bater',
    description,
    metadata: {
      tipo,
      unidade: unidade.nome,
      funcionario: funcionarioNome,
      protocolo,
      cpf: cpf ? cpf.replace(/\d(?=\d{4})/g, '*') : null, // Mascarar CPF parcialmente
    },
  });

  // Enviar notificação apenas para supervisores que cuidam deste colaborador específico
  if (funcionarioId && funcionarioNome) {
    try {
      // Buscar funcionário completo para pegar grupoId
      const funcionarioCompleto = await prisma.funcionario.findUnique({
        where: { id: funcionarioId },
        select: { grupoId: true },
      });

      // Enviar notificação apenas para supervisores que têm acesso ao funcionário
      notifySupervisorsAboutPonto(
        funcionarioId,
        unidade.id,
        funcionarioCompleto?.grupoId || null,
        {
          registroId: created.id,
          funcionarioId: funcionarioId,
          funcionarioNome: funcionarioNome,
          tipo,
          timestamp: now.toISOString(),
          unidadeNome: unidade.nome,
          protocolo,
        }
      ).catch(error => {
        console.error('Erro ao enviar notificação FCM (não bloqueia registro):', error);
      });
    } catch (error) {
      // Não bloquear registro de ponto se falhar notificação
      console.error('Erro ao buscar supervisores para notificação:', error);
    }
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    unidade: unidade.nome,
    funcionario: funcionarioNome,
    protocolo,
  });
}
