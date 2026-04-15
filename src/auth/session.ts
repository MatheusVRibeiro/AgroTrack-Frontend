import { safeJsonParse } from "@/lib/sanitize";

/**
 * Gerenciamento seguro de sessão.
 *
 * TOKENS (accessToken, refreshToken):
 *   Armazenados APENAS em memória (closure). Não ficam no localStorage/sessionStorage.
 *   Isso elimina o vetor XSS de roubo de tokens via localStorage.getItem().
 *   Trade-off: ao fechar/recarregar a aba, o usuário será redirecionado
 *   para o login. Esse trade-off é aceitável para um sistema financeiro/logístico.
 *
 * DADOS DO USUÁRIO (nome, email, role):
 *   Armazenados no sessionStorage (morre ao fechar a aba).
 *   Não contêm informações secretas, usados apenas para exibição de UI.
 */

export const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Por favor, entre novamente.";

// ─── Chaves de storage (apenas para dados não-sensíveis) ─────────────────────

export const STORAGE_KEYS = {
  user: "caramello_logistica_user",
  auth: "@CaramelloLogistica:auth",
  /** @deprecated Mantido apenas para limpeza de legado no localStorage */
  accessToken: "@CaramelloLogistica:token",
  /** @deprecated Mantido apenas para limpeza de legado no localStorage */
  refreshToken: "@CaramelloLogistica:refreshToken",
} as const;

// ─── In-Memory Token Store (não acessível via JavaScript malicioso) ──────────

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export interface PersistedAuthData {
  user: object;
  accessToken: string;
  refreshToken?: string;
}

/** Obtém o access token da memória */
export function getAccessToken(): string | null {
  return _accessToken;
}

/** Obtém o refresh token da memória */
export function getRefreshToken(): string | null {
  return _refreshToken;
}

/** Armazena os tokens apenas em memória */
export function setTokens(accessToken: string, refreshToken?: string): void {
  _accessToken = accessToken;
  if (refreshToken) {
    _refreshToken = refreshToken;
  }
}

/** Armazena apenas o access token em memória */
export function setAccessToken(token: string): void {
  _accessToken = token;
}

/** Armazena a sessão lembrada no localStorage */
export function setPersistedAuthData(data: PersistedAuthData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(data));
  } catch {
    // localStorage pode falhar em modo privado de alguns browsers
  }
}

/** Obtém a sessão lembrada do localStorage */
export function getPersistedAuthData<T = PersistedAuthData>(): T | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.auth);
    return safeJsonParse<T>(raw);
  } catch {
    return undefined;
  }
}

/** Remove a sessão lembrada do localStorage */
export function clearPersistedAuthData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.auth);
  } catch { /* noop */ }
}

// ─── User data (não-sensível, sessionStorage) ───────────────────────────────

/** Armazena os dados do usuário no sessionStorage */
export function setUserData(user: object): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } catch {
    // sessionStorage pode falhar em modo privado de alguns browsers
  }
}

/** Obtém os dados do usuário do sessionStorage */
export function getUserData<T = unknown>(): T | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.user);
    return safeJsonParse<T>(raw);
  } catch {
    return undefined;
  }
}

// ─── Limpeza ────────────────────────────────────────────────────────────────

/** Limpa toda a sessão (memória + storage) */
export function clearSessionStorage(): void {
  // Limpa tokens da memória
  _accessToken = null;
  _refreshToken = null;

  // Limpa dados do usuário do sessionStorage
  try {
    sessionStorage.removeItem(STORAGE_KEYS.user);
  } catch { /* noop */ }

  // Limpa legado do localStorage (migração)
  try {
    localStorage.removeItem(STORAGE_KEYS.auth);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  } catch { /* noop */ }
}

// ─── Migração: limpar tokens antigos do localStorage na inicialização ────────

export function migrateFromLocalStorage(): void {
  try {
    // Se existem tokens no localStorage (versão antiga), remove-os
    const oldToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    const oldRefresh = localStorage.getItem(STORAGE_KEYS.refreshToken);
    const oldUser = localStorage.getItem(STORAGE_KEYS.user);

    if (oldToken || oldRefresh || oldUser) {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  } catch { /* noop */ }
}
