const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

export type ApiErrorPayload = { detail?: string | Array<{ msg?: string }> };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem("arena-access-token");
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") throw new Error("Authentication is available only in a browser");
  window.sessionStorage.setItem("arena-access-token", token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem("arena-access-token");
  } catch {
    // The browser session may still be ended by navigating to the login screen.
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Не удалось связаться с сервером. Проверьте подключение и повторите попытку.", 0);
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // Use a stable fallback for non-JSON proxy errors.
    }
    const detail = payload?.detail;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg).filter(Boolean).join(". ")
        : response.status === 401
          ? "Сессия завершена. Войдите в аккаунт заново."
          : `Ошибка сервера (${response.status}). Повторите попытку.`;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiRequestBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;
  try {
    response = await fetch(url, { headers, cache: "no-store" });
  } catch {
    throw new ApiError("Не удалось связаться с сервером. Проверьте подключение и повторите попытку.", 0);
  }
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      detail = typeof payload.detail === "string" ? payload.detail : undefined;
    } catch {
      // Use the default message below.
    }
    throw new ApiError(detail ?? `Не удалось скачать файл (${response.status}).`, response.status);
  }
  return response.blob();
}
