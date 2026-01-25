import { Role } from '@prisma/client';

// Função para verificar se um usuário tem uma role específica
export function hasRole(userRole: Role, allowedRoles: Role | Role[]): boolean {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(userRole);
}

// Função para verificar se um usuário tem acesso a uma rota específica
export function hasRouteAccess(
  userRole: Role | undefined,
  allowedRoles: Role | Role[]
): boolean {
  if (!userRole) return false;
  return hasRole(userRole, allowedRoles);
}

// Função para verificar e lançar erro se não tiver permissão
export function assertRole(
  userRole: Role | undefined,
  allowedRoles: Role | Role[]
): void {
  if (!hasRouteAccess(userRole, allowedRoles)) {
    throw new Error('Acesso negado: permissão insuficiente');
  }
}

// Objeto com todas as permissões da aplicação
export const permissions = {
  // Permissões para movimentos
  canCreateMovimento: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN']);
  },

  canEditMovimento: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN']);
  },

  canDeleteMovimento: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN']);
  },

  canViewMovimento: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN', 'RH', 'SUPERVISOR']);
  },

  canEditProposta: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN', 'SUPERVISOR']);
  },

  canDeleteProposta: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN']);
  },

  canViewProposta: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN', 'SUPERVISOR', 'RH']);
  },

  // Permissões para aprovações
  canApproveProposta: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN', 'RH']);
  },

  canRejectProposta: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN', 'RH']);
  },

  // Permissões para usuários
  canManageUsers: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN']);
  },

  canViewUsers: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN', 'RH']);
  },

  // Permissões para relatórios
  canViewReports: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, [
      'MASTER',
      'ADMIN',
      'RH',
      'SUPERVISOR',
      'OPERACIONAL',
    ]);
  },

  canExportReports: (role: Role | undefined): boolean => {
    return hasRouteAccess(role, ['MASTER', 'ADMIN', 'RH']);
  },
};
