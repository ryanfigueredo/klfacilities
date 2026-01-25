import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { authOptions } from '@/lib/auth-server';
import { handleGenericError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';

const movimentoSchema = z.object({
  tipo: z.enum(['RECEITA', 'DESPESA']),
  dataLanc: z.string().transform(str => new Date(str)),
  competencia: z.string().transform(str => new Date(str)),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  grupoId: z.string().optional(),
  unidadeId: z.string().min(1, 'Unidade é obrigatória'),
  categoria: z.string().optional(),
  subcategoria: z.string().optional(),
  centroCusto: z.string().optional(),
  documento: z.string().optional(),
  formaPagamento: z.string().optional(),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  valorAssinado: z.number().min(0.01, 'Valor assinado deve ser maior que zero'),
});

export async function createMovimento(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error('Usuário não autenticado');
    }

    const validatedData = movimentoSchema.parse({
      tipo: formData.get('tipo'),
      dataLanc: formData.get('dataLanc'),
      competencia: formData.get('competencia'),
      descricao: formData.get('descricao'),
      grupoId: formData.get('grupoId'),
      unidadeId: formData.get('unidadeId'),
      categoria: formData.get('categoria'),
      subcategoria: formData.get('subcategoria'),
      centroCusto: formData.get('centroCusto'),
      documento: formData.get('documento'),
      formaPagamento: formData.get('formaPagamento'),
      valor: Number(formData.get('valor')),
      valorAssinado: Number(formData.get('valorAssinado')),
    });

    const movimento = await prisma.movimento.create({
      data: {
        ...validatedData,
        criadoPorId: session.user.id,
      },
    });

    // Revalidar páginas que dependem dos movimentos
    revalidatePath('/dashboard');
    revalidatePath('/movimentos');

    return { success: true, data: movimento };
  } catch (error) {
    return handleGenericError(error);
  }
}

export async function getMovimentos() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error('Usuário não autenticado');
    }

    const movimentos = await prisma.movimento.findMany({
      include: {
        grupo: true,
        unidade: true,
        criadoPor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        dataLanc: 'desc',
      },
    });

    return { success: true, data: movimentos };
  } catch (error) {
    return handleGenericError(error);
  }
}

export async function updateMovimento(id: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error('Usuário não autenticado');
    }

    const validatedData = movimentoSchema.partial().parse({
      tipo: formData.get('tipo'),
      dataLanc: formData.get('dataLanc'),
      competencia: formData.get('competencia'),
      descricao: formData.get('descricao'),
      grupoId: formData.get('grupoId'),
      unidadeId: formData.get('unidadeId'),
      categoria: formData.get('categoria'),
      subcategoria: formData.get('subcategoria'),
      centroCusto: formData.get('centroCusto'),
      documento: formData.get('documento'),
      formaPagamento: formData.get('formaPagamento'),
      valor: formData.get('valor') ? Number(formData.get('valor')) : undefined,
      valorAssinado: formData.get('valorAssinado')
        ? Number(formData.get('valorAssinado'))
        : undefined,
    });

    const movimento = await prisma.movimento.update({
      where: { id },
      data: validatedData,
    });

    // Revalidar páginas que dependem dos movimentos
    revalidatePath('/dashboard');
    revalidatePath('/movimentos');

    return { success: true, data: movimento };
  } catch (error) {
    return handleGenericError(error);
  }
}

export async function deleteMovimento(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error('Usuário não autenticado');
    }

    await prisma.movimento.delete({
      where: { id },
    });

    // Revalidar páginas que dependem dos movimentos
    revalidatePath('/dashboard');
    revalidatePath('/movimentos');

    return { success: true };
  } catch (error) {
    return handleGenericError(error);
  }
}

export async function getGrupos() {
  try {
    const grupos = await prisma.grupo.findMany({
      orderBy: { nome: 'asc' },
    });
    return { success: true, data: grupos };
  } catch (error) {
    return handleGenericError(error);
  }
}

export async function getUnidades() {
  try {
    const unidades = await prisma.unidade.findMany({
      orderBy: { nome: 'asc' },
    });
    return { success: true, data: unidades };
  } catch (error) {
    return handleGenericError(error);
  }
}

export async function getCategorias() {
  try {
    // Temporariamente comentado - tabela categoria não existe no schema
    // const categorias = await prisma.categoria.findMany({
    //   orderBy: { nome: 'asc' },
    // });
    // return { success: true, data: categorias };
    return { success: true, data: [] };
  } catch (error) {
    return handleGenericError(error);
  }
}
