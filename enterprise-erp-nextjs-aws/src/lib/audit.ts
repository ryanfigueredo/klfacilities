import { getServerSession } from 'next-auth';

import { logAudit } from './audit/log';
import { authOptions } from './auth-server';

export async function auditAction(
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  await logAudit({
    action,
    resource,
    resourceId,
    metadata,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    success: true,
    ip: '',
    userAgent: '',
    method: '',
    url: '',
  });
}
