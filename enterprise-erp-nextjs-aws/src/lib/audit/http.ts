import { NextRequest } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

import { getClientIp } from './utils';

export interface HttpContext {
  ip: string;
  userAgent: string;
  method: string;
  url: string;
}

export async function getHttpContext(
  request?: NextRequest,
  headersParam?: ReadonlyHeaders
): Promise<HttpContext> {
  const headersList: ReadonlyHeaders = headersParam ?? (await nextHeaders());

  return {
    ip: getClientIp(request, headersList),
    userAgent: headersList.get('user-agent') || '',
    method: request?.method || 'GET',
    url: request?.url || '',
  };
}
