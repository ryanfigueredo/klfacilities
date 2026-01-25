import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import bcrypt from 'bcrypt';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { logAudit, logUserCreated } from '@/lib/audit/log';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(session.user.role as any, 'usuarios', 'list')) {
      return NextResponse.json(forbiddenPayload('usuarios', 'list'), {
        status: 403,
      });
    }

    // Verificar se quer buscar inativos (query param ?inativos=true)
    const { searchParams } = new URL(request.url);
    const incluirInativos = searchParams.get('inativos') === 'true';

    // Buscar apenas usuários ativos por padrão, ou inativos se solicitado
    const usuarios = await prisma.user.findMany({
      where: incluirInativos
        ? { ativo: false }
        : { ativo: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
        _count: { select: { movimentos: true, auditLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    await logAudit({
      action: 'usuarios.list',
      resource: 'User',
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/usuarios',
    });
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    await logAudit({
      action: 'usuarios.list',
      resource: 'User',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/usuarios',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(session.user.role as any, 'usuarios', 'create')) {
      return NextResponse.json(forbiddenPayload('usuarios', 'create'), {
        status: 403,
      });
    }

    const body = await request.json();

    // Validar com Zod
    const userSchema = z.object({
      name: z.string().min(1, 'Nome é obrigatório'),
      email: z.string().email('Email inválido'),
      password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
      role: z.enum([
        'MASTER',
        'ADMIN',
        'RH',
        'SUPERVISOR',
        'JURIDICO',
        'OPERACIONAL',
        'LAVAGEM',
        'PLANEJAMENTO_ESTRATEGICO',
      ]),
    });

    const validated = userSchema.parse(body);
    const { name, email, password, role } = validated;

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        role: validated.role,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Log de auditoria mais descritivo
    await logUserCreated(
      user.id,
      {
        name: user.name,
        email: user.email,
        role: user.role,
      },
      session.user.id,
      session.user.email,
      session.user.role,
      '127.0.0.1',
      'api'
    );

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    await logAudit({
      action: 'user.create',
      resource: 'User',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: '/api/usuarios',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
