const envApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = envApiUrl
  ? `${envApiUrl.replace(/\/+$/, '')}/api`
  : '/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${cleanEndpoint}`;

  const method = (options.method || 'GET').toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null;
  const isWriteMethod = ['POST', 'PUT', 'PATCH'].includes(method);

  const finalBody = hasBody ? options.body : (isWriteMethod ? '{}' : undefined);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    body: finalBody,
    headers,
  });

  if (!response.ok) {
    let errorDetails: any = null;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = { message: response.statusText };
    }
    const error = new Error(errorDetails?.message || `API error ${response.status}`);
    (error as any).status = response.status;
    (error as any).details = errorDetails;
    throw error;
  }

  return response.json();
}
