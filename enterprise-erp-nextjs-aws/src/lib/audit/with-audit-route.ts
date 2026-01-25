import { NextRequest } from 'next/server';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth-server';

import { logAudit } from './log';

export interface AuditRouteOptions {
  action: string;
  resource?: string;
  getResourceId?: (
    request: NextRequest,
    response?: Response
  ) => string | undefined;
}

export function withAuditRoute<T extends unknown[], R>(
  options: AuditRouteOptions,
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    try {
      const result = await handler(...args);

      // Log successful action
      await logAudit({
        action: options.action,
        resource: options.resource,
        resourceId: options.getResourceId?.(args[0] as NextRequest),
        metadata: {},
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        success: true,
        ip: '',
        userAgent: '',
        method: '',
        url: '',
      });

      return result;
    } catch (error) {
      // Log failed action
      await logAudit({
        action: options.action,
        resource: options.resource,
        resourceId: options.getResourceId?.(args[0] as NextRequest),
        metadata: {},
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: '',
        userAgent: '',
        method: '',
        url: '',
      });

      throw error;
    }
  };
}
