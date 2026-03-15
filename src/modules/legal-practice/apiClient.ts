/**
 * WebWaka Professional — API Client Helper
 * Extracted from ui.tsx to avoid JSX generic type parameter ambiguity in .tsx files.
 * Blueprint Reference: Part 9.3 — Platform API response format { success: true, data: ... }
 */

export interface ApiCallOptions extends RequestInit {
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export async function apiCall<T>(
  apiBaseUrl: string,
  authToken: string,
  tenantId: string,
  path: string,
  options: ApiCallOptions = {}
): Promise<T | null> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'X-Tenant-ID': tenantId,
      ...(options.headers ?? {})
    }
  });
  const json = await response.json() as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.errors?.join(', ') ?? 'Unknown error');
  }
  return json.data ?? null;
}
