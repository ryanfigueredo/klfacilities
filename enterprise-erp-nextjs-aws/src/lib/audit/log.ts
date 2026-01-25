import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { HttpContext } from './http';

export interface AuditLogEntry {
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  success: boolean;
  error?: string;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  description?: string; // Nova descrição amigável
}

// Funções específicas para diferentes tipos de ações
export async function logMovimentoCreated(
  movimentoId: string,
  movimentoData: any,
  userId: string,
  userEmail: string,
  userRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Movimento criado: ${movimentoData.descricao} - R$ ${Number(movimentoData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  await logAudit({
    action: 'movimento.create',
    resource: 'Movimento',
    resourceId: movimentoId,
    userId,
    userEmail,
    userRole,
    success: true,
    ip,
    userAgent,
    method: 'POST',
    url: '/api/movimentos',
    description,
    metadata: {
      tipo: movimentoData.tipo,
      valor: movimentoData.valor,
      descricao: movimentoData.descricao,
      unidade: movimentoData.unidadeId,
      grupo: movimentoData.grupoId,
    },
  });
}

export async function logMovimentoDeleted(
  movimentoId: string,
  movimentoData: any,
  userId: string,
  userEmail: string,
  userRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Movimento removido: ${movimentoData.descricao} - R$ ${Number(movimentoData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  await logAudit({
    action: 'movimento.delete',
    resource: 'Movimento',
    resourceId: movimentoId,
    userId,
    userEmail,
    userRole,
    success: true,
    ip,
    userAgent,
    method: 'DELETE',
    url: '/api/movimentos',
    description,
    metadata: {
      tipo: movimentoData.tipo,
      valor: movimentoData.valor,
      descricao: movimentoData.descricao,
      motivo: 'Soft delete',
    },
  });
}

export async function logMovimentoUpdated(
  movimentoId: string,
  oldData: any,
  newData: any,
  userId: string,
  userEmail: string,
  userRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Movimento atualizado: ${newData.descricao} - R$ ${Number(newData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  await logAudit({
    action: 'movimento.update',
    resource: 'Movimento',
    resourceId: movimentoId,
    userId,
    userEmail,
    userRole,
    success: true,
    ip,
    userAgent,
    method: 'PUT',
    url: '/api/movimentos',
    description,
    metadata: {
      oldData,
      newData,
      changes: {
        valor:
          oldData.valor !== newData.valor
            ? { from: oldData.valor, to: newData.valor }
            : undefined,
        descricao:
          oldData.descricao !== newData.descricao
            ? { from: oldData.descricao, to: newData.descricao }
            : undefined,
        tipo:
          oldData.tipo !== newData.tipo
            ? { from: oldData.tipo, to: newData.tipo }
            : undefined,
      },
    },
  });
}

export async function logUserCreated(
  userId: string,
  userData: any,
  createdBy: string,
  createdByEmail: string,
  createdByRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Usuário criado: ${userData.email} (${userData.role})`;

  await logAudit({
    action: 'user.create',
    resource: 'User',
    resourceId: userId,
    userId: createdBy,
    userEmail: createdByEmail,
    userRole: createdByRole,
    success: true,
    ip,
    userAgent,
    method: 'POST',
    url: '/api/usuarios',
    description,
    metadata: {
      email: userData.email,
      role: userData.role,
      name: userData.name,
    },
  });
}

export async function logUserDeleted(
  userId: string,
  userData: any,
  deletedBy: string,
  deletedByEmail: string,
  deletedByRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Usuário removido: ${userData.email} (${userData.role})`;

  await logAudit({
    action: 'user.delete',
    resource: 'User',
    resourceId: userId,
    userId: deletedBy,
    userEmail: deletedByEmail,
    userRole: deletedByRole,
    success: true,
    ip,
    userAgent,
    method: 'DELETE',
    url: '/api/usuarios',
    description,
    metadata: {
      email: userData.email,
      role: userData.role,
      name: userData.name,
    },
  });
}

export async function logUserRoleChanged(
  userId: string,
  oldRole: string,
  newRole: string,
  changedBy: string,
  changedByEmail: string,
  changedByRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Perfil de usuário alterado: ${oldRole} → ${newRole}`;

  await logAudit({
    action: 'user.role_change',
    resource: 'User',
    resourceId: userId,
    userId: changedBy,
    userEmail: changedByEmail,
    userRole: changedByRole,
    success: true,
    ip,
    userAgent,
    method: 'PATCH',
    url: '/api/usuarios',
    description,
    metadata: {
      oldRole,
      newRole,
    },
  });
}

export async function logCategoriaCreated(
  categoriaId: string,
  categoriaData: any,
  userId: string,
  userEmail: string,
  userRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Categoria criada: ${categoriaData.nome} (${categoriaData.tipo})`;

  await logAudit({
    action: 'categoria.create',
    resource: 'Categoria',
    resourceId: categoriaId,
    userId,
    userEmail,
    userRole,
    success: true,
    ip,
    userAgent,
    method: 'POST',
    url: '/api/categorias',
    description,
    metadata: {
      nome: categoriaData.nome,
      tipo: categoriaData.tipo,
    },
  });
}

export async function logUnidadeCreated(
  unidadeId: string,
  unidadeData: any,
  userId: string,
  userEmail: string,
  userRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Unidade criada: ${unidadeData.nome}`;

  await logAudit({
    action: 'unidade.create',
    resource: 'Unidade',
    resourceId: unidadeId,
    userId,
    userEmail,
    userRole,
    success: true,
    ip,
    userAgent,
    method: 'POST',
    url: '/api/unidades',
    description,
    metadata: {
      nome: unidadeData.nome,
    },
  });
}

export async function logGrupoCreated(
  grupoId: string,
  grupoData: any,
  userId: string,
  userEmail: string,
  userRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Grupo criado: ${grupoData.nome}`;

  await logAudit({
    action: 'grupo.create',
    resource: 'Grupo',
    resourceId: grupoId,
    userId,
    userEmail,
    userRole,
    success: true,
    ip,
    userAgent,
    method: 'POST',
    url: '/api/grupos',
    description,
    metadata: {
      nome: grupoData.nome,
    },
  });
}

export async function logLogin(
  userId: string,
  userEmail: string,
  userRole: string,
  ip: string,
  userAgent: string,
  success: boolean,
  error?: string
) {
  try {
    const description = success
      ? `Login realizado: ${userEmail} (${userRole})`
      : `Tentativa de login falhou: ${userEmail}`;

    await logAudit({
      action: 'user.login',
      resource: 'User',
      resourceId: userId,
      userId,
      userEmail,
      userRole,
      success,
      error,
      ip,
      userAgent,
      method: 'POST',
      url: '/api/auth/signin',
      description,
      metadata: {
        success,
        userRole,
      },
    });
  } catch (error) {
    console.error('Erro ao logar login:', error);
    // Não re-throw o erro para não quebrar a autenticação
  }
}

export async function logLogout(
  userId: string,
  userEmail: string,
  userRole: string,
  ip: string,
  userAgent: string
) {
  const description = `Logout realizado: ${userEmail}`;

  await logAudit({
    action: 'user.logout',
    resource: 'User',
    resourceId: userId,
    userId,
    userEmail,
    userRole,
    success: true,
    ip,
    userAgent,
    method: 'POST',
    url: '/api/auth/signout',
    description,
    metadata: {
      userRole,
    },
  });
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const detailsObj: Record<string, unknown> = {
      ...(entry.metadata ?? {}),
      method: entry.method,
      url: entry.url,
      userEmail: entry.userEmail,
      userRole: entry.userRole,
      description: entry.description,
    };

    await prisma.auditLog.create({
      data: {
        action: entry.action,
        resource: entry.resource ?? '',
        resourceId: entry.resourceId,
        details: detailsObj as unknown as Prisma.InputJsonValue,
        userId: entry.userId,
        success: entry.success,
        error: entry.error,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

const CURRICULO_STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  CONTATADO: 'Contatado',
  ENTREVISTADO: 'Entrevistado',
  CONTRATADO: 'Contratado',
  DESCARTADO: 'Descartado',
  TALENTO: 'Banco de Talentos',
};

function formatCurriculoStatus(status?: string | null) {
  if (!status) return 'Indefinido';
  return CURRICULO_STATUS_LABELS[status] ?? status;
}

interface CurriculoAuditContext {
  curriculo: {
    id: string;
    nome: string | null;
    sobrenome: string | null;
    status: string | null;
    observacoes: string | null;
  };
  before: {
    status: string | null;
    observacoes: string | null;
  };
  user: {
    id?: string;
    email?: string | null;
    role?: string | null;
  };
  http: HttpContext;
}

export async function logCurriculoStatusChange({
  curriculo,
  before,
  user,
  http,
}: CurriculoAuditContext) {
  const description = `Status do currículo ${[
    curriculo.nome,
    curriculo.sobrenome,
  ]
    .filter(Boolean)
    .join(' ')} alterado: ${formatCurriculoStatus(
    before.status
  )} → ${formatCurriculoStatus(curriculo.status)}`;

  await logAudit({
    action: 'curriculo.status_change',
    resource: 'Curriculo',
    resourceId: curriculo.id,
    userId: user.id,
    userEmail: user.email ?? undefined,
    userRole: user.role ?? undefined,
    success: true,
    ip: http.ip,
    userAgent: http.userAgent,
    method: http.method,
    url: http.url,
    description,
    metadata: {
      curriculoId: curriculo.id,
      nome: curriculo.nome,
      sobrenome: curriculo.sobrenome,
      oldStatus: before.status,
      newStatus: curriculo.status,
      oldObservacoes: before.observacoes,
      newObservacoes: curriculo.observacoes,
    },
  });
}

export async function logCurriculoDeleted({
  curriculo,
  user,
  http,
}: Omit<CurriculoAuditContext, 'before'>) {
  const description = `Currículo removido: ${[
    curriculo.nome,
    curriculo.sobrenome,
  ]
    .filter(Boolean)
    .join(' ')}`;

  await logAudit({
    action: 'curriculo.delete',
    resource: 'Curriculo',
    resourceId: curriculo.id,
    userId: user.id,
    userEmail: user.email ?? undefined,
    userRole: user.role ?? undefined,
    success: true,
    ip: http.ip,
    userAgent: http.userAgent,
    method: http.method,
    url: http.url,
    description,
    metadata: {
      curriculoId: curriculo.id,
      nome: curriculo.nome,
      sobrenome: curriculo.sobrenome,
      status: curriculo.status,
    },
  });
}
