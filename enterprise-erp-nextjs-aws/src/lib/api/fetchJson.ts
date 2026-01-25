// Small fetch helper to centralize 403 -> toast handling and JSON parsing
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface FetchJsonOptions extends RequestInit {
  method?: HttpMethod;
  body?: any;
}

export async function fetchJson<T = any>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const { headers, body, method = 'GET', ...rest } = options;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body:
      body != null && typeof body !== 'string' ? JSON.stringify(body) : body,
    ...rest,
  };
  const res = await fetch(url, init);
  let json: any = null;
  try {
    json = await res.json();
  } catch {}

  if (res.status === 403) {
    const moduleName = json?.module ?? 'unknown';
    const action = json?.action ?? 'unknown';
    const message = json?.error ?? 'forbidden';
    // Soft throw to be handled by caller UI
    const err: any = new Error('forbidden');
    err.code = 'FORBIDDEN';
    err.module = moduleName;
    err.action = action;
    err.payload = json;
    throw err;
  }

  if (!res.ok) {
    const err: any = new Error(json?.error || 'Request failed');
    err.code = json?.code || 'REQUEST_FAILED';
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json as T;
}
