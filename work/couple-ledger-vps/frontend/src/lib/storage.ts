import type { AuthSession } from "@/types/api";

export const AUTH_STORAGE_KEY = "cl_auth";
export const THEME_STORAGE_KEY = "cl_theme";
export const ACCENT_STORAGE_KEY = "cl_accent";
export const SCOPE_STORAGE_KEY = "cl_scope";

export function readAuthSession(): AuthSession {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "{}") as Partial<AuthSession>;
    return {
      accessToken: parsed.accessToken || "",
      refreshToken: parsed.refreshToken || "",
      user: parsed.user || null
    };
  } catch {
    return { accessToken: "", refreshToken: "", user: null };
  }
}

export function writeAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
