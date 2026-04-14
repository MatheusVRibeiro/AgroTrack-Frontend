/**
 * Módulo centralizado de sanitização e segurança.
 *
 * Protege contra XSS, injeção de HTML e URLs maliciosas.
 * Deve ser usado em qualquer ponto que renderize dados dinâmicos vindos
 * do backend ou de inputs do usuário.
 */

// ─── HTML / XSS ─────────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const HTML_ESCAPE_RE = /[&<>"'`/]/g;

/**
 * Escapa caracteres perigosos de HTML de uma string.
 * Usar sempre que um valor dinâmico for inserido em contexto HTML (string → DOM).
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== "string") return "";
  return unsafe.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Remove TODAS as tags HTML de uma string, retornando apenas texto puro.
 * Útil para labels, nomes, observações, etc.
 */
export function stripHtmlTags(input: string): string {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitiza um valor para uso seguro como label de gráfico / tooltip.
 * Remove tags HTML e limita o comprimento.
 */
export function sanitizeLabel(value: unknown, maxLength = 200): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const cleaned = stripHtmlTags(str);
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + "…" : cleaned;
}

// ─── CSS (para uso em <style> dinâmico) ──────────────────────────────────────

const UNSAFE_CSS_RE = /[^a-zA-Z0-9#(),.\-%\s:;\/]/g;

/**
 * Sanitiza um valor de cor/CSS para injeção segura em tags <style>.
 * Apenas caracteres seguros são permitidos.
 */
export function sanitizeCssValue(value: string): string {
  if (typeof value !== "string") return "";
  return value.replace(UNSAFE_CSS_RE, "");
}

/**
 * Sanitiza um identificador CSS (seletor de atributo, e.g. [data-chart=xxx]).
 * Apenas alfanuméricos e hifens são permitidos.
 */
export function sanitizeCssIdentifier(id: string): string {
  if (typeof id !== "string") return "";
  return id.replace(/[^a-zA-Z0-9-_]/g, "");
}

// ─── URL ─────────────────────────────────────────────────────────────────────

const ALLOWED_URL_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

/**
 * Valida se uma URL é segura para abrir (previne `javascript:`, `data:`, etc.).
 * Retorna true se a URL é segura, false caso contrário.
 */
export function isSafeUrl(url: string): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return ALLOWED_URL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Abre uma URL em nova aba apenas se ela for segura.
 * Inclui proteção contra tabnabbing (noopener, noreferrer).
 */
export function safeOpenUrl(url: string): void {
  if (!isSafeUrl(url)) {
    console.warn("[Security] Blocked unsafe URL:", url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

// ─── Input sanitization ─────────────────────────────────────────────────────

/**
 * Sanitiza uma string de input de formulário:
 * - Remove tags HTML
 * - Trim
 * - Limita comprimento
 */
export function sanitizeInput(value: unknown, maxLength = 500): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  const cleaned = stripHtmlTags(str);
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

/**
 * Sanitiza um email: lowercase, trim, remove caracteres perigosos.
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") return "";
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>"'`]/g, "");
}

// ─── JSON parse seguro ──────────────────────────────────────────────────────

/**
 * Faz JSON.parse com tratamento de erro, retornando undefined em caso de falha.
 * Previne crash se o conteúdo do storage for corrompido ou manipulado.
 */
export function safeJsonParse<T = unknown>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}
