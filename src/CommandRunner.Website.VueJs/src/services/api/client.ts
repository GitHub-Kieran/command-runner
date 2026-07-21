// Thin fetch wrapper: JSON in/out plus consistent, status-code-aware error messages.

// No env override => same origin the page was served from. This is what makes the Photino
// desktop host work without any configuration: it serves the Vue build and the API from the
// same dynamically-assigned Kestrel port, so relative/same-origin requests always find it
// regardless of which port got picked. Only the standalone web-dev workflow (Vite dev server
// on one port, API on another) needs VITE_API_BASE_URL set explicitly.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function extractErrorMessage(response: Response): Promise<string> {
  let message = 'API Error';

  try {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      message = data?.message ?? data?.error ?? data?.title ?? message;
    } else {
      const text = await response.text();
      if (text) message = text;
    }
  } catch {
    // Body wasn't readable/parseable — fall back to the generic message below.
  }

  switch (response.status) {
    case 400:
      return `Bad Request: ${message}`;
    case 401:
      return `Unauthorized: ${message}`;
    case 403:
      return `Forbidden: ${message}`;
    case 404:
      return `Not Found: ${message}`;
    case 409:
      return `Conflict: ${message}`;
    default:
      return response.status >= 500 ? `Server Error: ${message}` : message;
  }
}

async function request<T>(path: string, init?: RequestInit, params?: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('Network error - please check your connection');
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>(path, { method: 'GET' }, params);
  },
  post<T>(path: string, data?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined });
  },
  put<T>(path: string, data?: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined });
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};

export { API_BASE_URL };
