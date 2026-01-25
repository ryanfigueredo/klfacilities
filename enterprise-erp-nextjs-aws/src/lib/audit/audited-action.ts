import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth-server';

import { auditedCtx } from './ctx';

export interface AuditedActionOptions {
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export function auditedAction<T extends unknown[], R>(
  options: AuditedActionOptions,
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    const result = await action(...args);

    // Log the action
    await auditedCtx.log({
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      metadata: options.metadata,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
    });

    return result;
  };
}
