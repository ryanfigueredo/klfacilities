import { getCurrentUser } from '@/lib/session';
import { can, normalizeRole } from '@/lib/auth/policy';

export async function requireRole(actions: string[], resource: any) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Não autenticado');
  const role = normalizeRole(user.role);
  const ok = actions.every(a => can(role as any, resource as any, a as any));
  if (!ok) throw new Error('Sem permissão');
  return user;
}
