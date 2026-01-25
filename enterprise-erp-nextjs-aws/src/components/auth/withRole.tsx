'use client';

import { useSession } from 'next-auth/react';
import { ComponentType, ReactNode } from 'react';
import { hasRole } from '@/lib/rbac';

type UserRole = 'ADMIN' | 'RH' | 'SUPERVISOR';

interface WithRoleProps {
  children?: ReactNode;
}

interface RoleGuardProps {
  allowedRoles: UserRole | UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

// Componente para proteger conteúdo baseado em role
export function RoleGuard({
  allowedRoles,
  fallback,
  children,
}: RoleGuardProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="animate-pulse">Carregando...</div>;
  }

  const userRole = session?.user?.role as UserRole | undefined;
  if (!userRole || !hasRole(userRole, allowedRoles)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// HOC para componentes que precisam de role específica
export function withRole<P extends object>(
  WrappedComponent: ComponentType<P>,
  allowedRoles: UserRole | UserRole[],
  fallback?: ReactNode
) {
  const WithRoleComponent = (props: P) => {
    const { data: session, status } = useSession();

    if (status === 'loading') {
      return <div className="animate-pulse">Carregando...</div>;
    }

    const userRole = session?.user?.role as UserRole | undefined;
    if (!userRole || !hasRole(userRole, allowedRoles)) {
      return fallback ? <>{fallback}</> : null;
    }

    return <WrappedComponent {...props} />;
  };

  WithRoleComponent.displayName = `withRole(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithRoleComponent;
}

// Hook para verificar permissões em client components
export function useRoleGuard(allowedRoles: UserRole | UserRole[]) {
  const { data: session, status } = useSession();

  const userRole = session?.user?.role as UserRole | undefined;
  const hasAccess = userRole
    ? hasRole(userRole, allowedRoles)
    : false;

  return {
    hasAccess,
    isLoading: status === 'loading',
    userRole: session?.user?.role,
  };
}
