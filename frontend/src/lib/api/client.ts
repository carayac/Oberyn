const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

type ApiRequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, token?: string | null) => apiRequest<T>(path, { method: "GET", token }),
  post: <T>(path: string, body?: unknown, token?: string | null) => apiRequest<T>(path, { method: "POST", body: JSON.stringify(body ?? {}), token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) => apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}), token }),
  delete: <T>(path: string, token?: string | null) => apiRequest<T>(path, { method: "DELETE", token }),
};

