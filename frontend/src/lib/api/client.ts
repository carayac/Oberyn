const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

type ApiRequestOptions = RequestInit & {
  token?: string | null;
  organizationId?: string | null;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.organizationId) headers.set("x-organization-id", options.organizationId);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("No se pudo conectar con la API. Revisa que el backend este corriendo en http://localhost:4000.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message ?? `API request failed with status ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, token?: string | null, organizationId?: string | null) => apiRequest<T>(path, { method: "GET", token, organizationId }),
  post: <T>(path: string, body?: unknown, token?: string | null, organizationId?: string | null) => apiRequest<T>(path, { method: "POST", body: JSON.stringify(body ?? {}), token, organizationId }),
  patch: <T>(path: string, body?: unknown, token?: string | null, organizationId?: string | null) => apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}), token, organizationId }),
  delete: <T>(path: string, token?: string | null, organizationId?: string | null) => apiRequest<T>(path, { method: "DELETE", token, organizationId }),
};
