import { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';
import { NextRequest } from 'next/server';

export function getClientIp(
  request?: NextRequest,
  headers?: ReadonlyHeaders
): string {
  if (request) {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    return forwarded?.split(',')[0] || realIp || 'unknown';
  }

  if (headers) {
    const forwarded = headers.get('x-forwarded-for');
    const realIp = headers.get('x-real-ip');
    return forwarded?.split(',')[0] || realIp || 'unknown';
  }

  return 'unknown';
}
