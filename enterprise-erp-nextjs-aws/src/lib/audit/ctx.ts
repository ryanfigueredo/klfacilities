import { logAudit } from './log';

export interface AuditContext {
  log: (entry: {
    action: string;
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    userId?: string;
    userEmail?: string;
    userRole?: string;
  }) => Promise<void>;
}

export const auditedCtx: AuditContext = {
  log: async entry => {
    await logAudit({
      ...entry,
      success: true,
      ip: '',
      userAgent: '',
      method: '',
      url: '',
    });
  },
};
