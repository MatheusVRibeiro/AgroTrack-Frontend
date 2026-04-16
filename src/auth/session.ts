import { safeJsonParse } from "@/lib/sanitize";

/**
 * Gerenciamento de sessão segura.
 *
 * TOKENS (accessToken, refreshToken):
 *   Armazenados via Cookies HttpOnly (configurados pelo backend).
 *   Inacessíveis via JavaScript (proteção contra XSS).
 *
 * PERSISTÊNCIA:
 *   O navegador gerencia os cookies automaticamente.
 *   O frontend mantém apenas dados não-sensíveis para UX.
 */

export const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou por inatividade. Por favor, entre novamente.";
export const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// ─── Chaves de storage ───────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  user: "caramello_logistica_user",
  auth: "@CaramelloLogistica:auth",
  /** @deprecated Mantido apenas para limpeza */
  accessToken: "@CaramelloLogistica:token",
  /** @deprecated Mantido apenas para limpeza */
  refreshToken: "@CaramelloLogistica:refreshToken",
} as const;

export interface PersistedAuthData {
  user: object;
  lastActivity: number;
}

/** 
 * Obtém o access token (agora retorna null pois o token está no cookie HttpOnly)
 * Mantido para compatibilidade com o interceptor que adiciona o header, 
 * mas o cookie withCredentials:true é o que realmente importa agora.
 */
export function getAccessToken(): string | null {
  return null;
}

/** Obtém o refresh token (nulo p/ segurança, usa cookie HttpOnly) */
export function getRefreshToken(): string | null {
  return null;
}

/** 
 * Não armazena mais tokens no JS.
 * Apenas atualiza a última atividade.
 */
export function setTokens(_accessToken: string, _refreshToken?: string): void {
  updateLastActivity();
}

/** Apenas atualiza a última atividade */
export function setAccessToken(_token: string): void {
  updateLastActivity();
}

/** Armazena apenas dados não-sensíveis no localStorage */
export function setPersistedAuthData(data: PersistedAuthData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(data));
  } catch { /* noop */ }
}

/** Obtém os dados persistidos */
export function getPersistedAuthData<T = PersistedAuthData>(): T | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.auth);
    return safeJsonParse<T>(raw);
  } catch {
    return undefined;
  }
}

/** Verifica expiração por inatividade (7 dias) */
export function isSessionExpired(): boolean {
  const persisted = getPersistedAuthData();
  if (!persisted?.lastActivity) return false;

  const msecSinceLastActivity = Date.now() - persisted.lastActivity;
  return msecSinceLastActivity > INACTIVITY_LIMIT_MS;
}

/** Atualiza o timestamp de atividade */
export function updateLastActivity(): void {
  const persisted = getPersistedAuthData();
  if (persisted) {
    setPersistedAuthData({
      ...persisted,
      lastActivity: Date.now(),
    });
  }
}

/** Remove a sessão persistida */
export function clearPersistedAuthData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.auth);
  } catch { /* noop */ }
}

// ─── User data (sessionStorage) ──────────────────────────────────────────────

export function setUserData(user: object): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } catch { /* noop */ }
}

export function getUserData<T = unknown>(): T | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.user);
    return safeJsonParse<T>(raw);
  } catch {
    return undefined;
  }
}

// ─── Limpeza ────────────────────────────────────────────────────────────────

/** Limpa toda a sessão */
export function clearSessionStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.auth);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  } catch { /* noop */ }
}

// ─── Migração ───────────────────────────────────────────────────────────────

export function migrateFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
  } catch { /* noop */ }
}


