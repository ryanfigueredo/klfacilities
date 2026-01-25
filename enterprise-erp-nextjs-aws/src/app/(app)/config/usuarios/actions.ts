'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authz';
import { revalidatePath } from 'next/cache';
import { hash } from 'bcryptjs';

const usuarioSchema = z.object({
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

const usuarioUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().optional(),
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

export async function listUsuarios() {
  await requireRole(['list'], 'usuarios');

  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function createUsuario(data: z.infer<typeof usuarioSchema>) {
  await requireRole(['create'], 'usuarios');

  const validated = usuarioSchema.parse(data);

  // Verificar se já existe
  const existing = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existing) {
    throw new Error('Usuário já existe');
  }

  const hashedPassword = await hash(validated.password, 12);

  const usuario = await prisma.user.create({
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

  revalidatePath('/config/usuarios');
  return usuario;
}

export async function updateUsuario(
  id: string,
  data: z.infer<typeof usuarioUpdateSchema>
) {
  await requireRole(['update'], 'usuarios');

  const validated = usuarioUpdateSchema.parse(data);

  // Verificar se já existe outro com o mesmo email
  const existing = await prisma.user.findFirst({
    where: {
      email: validated.email,
      id: { not: id },
    },
  });

  if (existing) {
    throw new Error('Email já está em uso');
  }

  const updateData: any = {
    name: validated.name,
    email: validated.email,
    role: validated.role,
  };

  if (validated.password) {
    updateData.password = await hash(validated.password, 12);
  }

  const usuario = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  revalidatePath('/config/usuarios');
  return usuario;
}

export async function toggleUsuario(id: string) {
  await requireRole(['toggle'], 'usuarios');

  const usuario = await prisma.user.findUnique({
    where: { id },
  });

  if (!usuario) {
    throw new Error('Usuário não encontrado');
  }

  // Alternar entre roles (ciclo: MASTER -> ADMIN -> RH -> SUPERVISOR -> OPERACIONAL -> RH)
  // Não permitir alterar MASTER via toggle
  if (usuario.role === 'MASTER') {
    throw new Error('Não é possível alterar role de MASTER');
  }

  let newRole: 'ADMIN' | 'RH' | 'SUPERVISOR' | 'OPERACIONAL';
  if (usuario.role === 'ADMIN') {
    newRole = 'RH';
  } else if (usuario.role === 'RH') {
    newRole = 'SUPERVISOR';
  } else if (usuario.role === 'SUPERVISOR') {
    newRole = 'OPERACIONAL';
  } else {
    newRole = 'RH';
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: newRole },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  revalidatePath('/config/usuarios');
  return updated;
}
