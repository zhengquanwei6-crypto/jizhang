import { readAuthSession } from "@/lib/storage";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = {
  body?: unknown;
  auth?: boolean;
  raw?: boolean;
};

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function errorMessage(body: unknown, status: number): string {
  if (!body) {
    return `请求失败 (${status})`;
  }
  if (typeof body === "string") {
    return body || `请求失败 (${status})`;
  }
  if (Array.isArray(body)) {
    return body.map((item) => item?.msg || item?.message || JSON.stringify(item)).join("；");
  }
  if (typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    return errorMessage(detail, status);
  }
  if (typeof body === "object" && "message" in body) {
    return String((body as { message: unknown }).message);
  }
  return `请求失败 (${status})`;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  let body: BodyInit | undefined;

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  } else if (options.body instanceof FormData) {
    body = options.body;
  }

  if (options.auth !== false) {
    const session = readAuthSession();
    if (session.accessToken) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body });
  } catch {
    throw new ApiError("网络不可用，请稍后重试", 0);
  }

  if (!response.ok) {
    const payload = await readBody(response).catch(() => null);
    throw new ApiError(errorMessage(payload, response.status), response.status, payload);
  }

  if (options.raw) {
    return response as T;
  }
  if (response.status === 204) {
    return null as T;
  }
  return readBody(response) as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  del: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options)
};
