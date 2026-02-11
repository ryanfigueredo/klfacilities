import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { isUniversalQRCode } from '@/lib/ponto-universal';

function slugify(s: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

export async function GET(req: NextRequest) {
  // Esta API é pública para permitir que funcionários se identifiquem pelo CPF
  // Não requer autenticação - o funcionário se identifica apenas pelo CPF
  const me = await getCurrentUser();
  
  // Se estiver logado, aplicar restrições de supervisor
  let allowedUnidades: string[] | null = null;
  if (me?.id && me.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);
    allowedUnidades = scope.unidadeIds;
    if (!allowedUnidades.length) {
      return NextResponse.json({ funcionario: null, message: 'Sem permissão' });
    }
  }

  const { searchParams } = new URL(req.url);
  const cpfRaw = searchParams.get('cpf') || '';
  const cpf = cpfRaw.replace(/\D/g, '').trim(); // Normalizar CPF
  const unidadeSlug = searchParams.get('unidade') || undefined;
  const code = searchParams.get('code') || undefined;

  if (!cpf || cpf.length !== 11)
    return NextResponse.json({ error: 'cpf requerido e deve ter 11 dígitos' }, { status: 400 });

  // Buscar funcionário por CPF (com unidades permitidas para múltiplas lojas)
  let f = await prisma.funcionario.findFirst({
    where: { cpf },
    select: {
      id: true,
      nome: true,
      cpf: true,
      fotoUrl: true,
      faceDescriptor: true,
      unidadeId: true,
      unidade: { select: { id: true, nome: true } },
      grupo: { select: { id: true, nome: true } },
      unidadesPermitidas: { select: { unidadeId: true } },
    },
  });

  // Se não encontrou, tentar buscar todos e filtrar manualmente (pode ter formatação no banco)
  if (!f) {
    const todosFuncionarios = await prisma.funcionario.findMany({
      where: { cpf: { not: null } },
      select: {
        id: true,
        nome: true,
        cpf: true,
        fotoUrl: true,
        faceDescriptor: true,
        unidadeId: true,
        unidade: { select: { id: true, nome: true } },
        grupo: { select: { id: true, nome: true } },
        unidadesPermitidas: { select: { unidadeId: true } },
      },
      take: 1000,
    });
    
    // Normalizar CPFs do banco e comparar
    const funcionarioEncontrado = todosFuncionarios.find(func => {
      if (!func.cpf) return false;
      const cpfBancoNormalizado = func.cpf.replace(/\D/g, '').trim();
      return cpfBancoNormalizado === cpf;
    });
    
    if (funcionarioEncontrado) {
      f = funcionarioEncontrado;
      // Se encontrou com formatação, normalizar no banco
      if (funcionarioEncontrado.cpf !== cpf) {
        try {
          await prisma.funcionario.update({
            where: { id: funcionarioEncontrado.id },
            data: { cpf },
          });
          // Atualizar o objeto em memória
          f = { ...funcionarioEncontrado, cpf };
        } catch (error) {
          console.error('[PONTO] Erro ao normalizar CPF no banco:', error);
          // Continuar mesmo se falhar
        }
      }
    }
  }

  if (!f) {
    return NextResponse.json({
      funcionario: null,
      message: 'Funcionário não encontrado no sistema',
    });
  }

  const fUnidadeIds = (f as any).unidadesPermitidas?.length
    ? (f as any).unidadesPermitidas.map((u: any) => u.unidadeId)
    : f.unidadeId
      ? [f.unidadeId]
      : [];

  // Se for supervisor logado, aplicar restrição de unidades (pelo menos uma em comum)
  if (
    me?.id &&
    allowedUnidades &&
    !fUnidadeIds.some((uid: string) => allowedUnidades!.includes(uid))
  ) {
    return NextResponse.json({ funcionario: null, message: 'Sem permissão' });
  }

  // Se especificou code, verificar se o funcionário está cadastrado na unidade do QR
  if (code) {
    if (isUniversalQRCode(code)) {
      // QR universal: retornar funcionário; geofence na hora de bater
    } else {
      const qr = await prisma.pontoQrCode.findFirst({
        where: { code, ativo: true },
        select: { unidadeId: true },
      });
      if (!qr) {
        return NextResponse.json({
          funcionario: null,
          message: 'QR code inválido',
        });
      }
      if (!fUnidadeIds.includes(qr.unidadeId)) {
        return NextResponse.json({
          funcionario: null,
          message: 'Funcionário não cadastrado nesta unidade',
        });
      }
    }
  } else if (unidadeSlug) {
    const unidade = await prisma.unidade.findMany({
      where: { ativa: true },
      select: { id: true, nome: true },
    });
    const unidadeMatch = unidade.find(
      x => slugify(x.nome) === slugify(unidadeSlug)
    );
    if (!unidadeMatch || !fUnidadeIds.includes(unidadeMatch.id)) {
      return NextResponse.json({
        funcionario: null,
        message: 'Funcionário não cadastrado nesta unidade',
      });
    }
  }

  return NextResponse.json({
    funcionario: {
      id: f.id,
      nome: f.nome,
      cpf: f.cpf,
      unidade: f.unidade?.nome,
      grupo: f.grupo?.nome,
      fotoUrl: f.fotoUrl,
      temFotoFacial: !!(f.fotoUrl && f.faceDescriptor),
    },
  });
}
