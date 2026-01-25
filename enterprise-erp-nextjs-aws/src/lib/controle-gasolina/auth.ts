import { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

export const CONTROLE_GASOLINA_ALLOWED_ROLES: Role[] = [
  'MASTER',
  'ADMIN',
  'OPERACIONAL',
  'SUPERVISOR',
];

export class ControleGasolinaAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireControleGasolinaUser() {
  const me = await getCurrentUser();
  if (!me?.id) {
    throw new ControleGasolinaAuthError('Não autenticado', 401);
  }
  if (
    me.role &&
    !CONTROLE_GASOLINA_ALLOWED_ROLES.includes(me.role as Role)
  ) {
    throw new ControleGasolinaAuthError('Sem permissão', 403);
  }
  return me;
}

export function ensureRoleAccess(role: Role | null | undefined) {
  if (!role) return false;
  return CONTROLE_GASOLINA_ALLOWED_ROLES.includes(role);
}

export const ADMIN_ROLES: Role[] = ['MASTER', 'ADMIN', 'OPERACIONAL'];

export async function requireControleGasolinaAdmin() {
  const me = await requireControleGasolinaUser();
  if (!me.role || !ADMIN_ROLES.includes(me.role as Role)) {
    throw new ControleGasolinaAuthError('Acesso restrito', 403);
  }
  return me;
}

