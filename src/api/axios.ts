import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import {
  clearSessionStorage,
  SESSION_EXPIRED_MESSAGE,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setTokens,
} from "@/auth/session";
import * as authService from "@/services/auth";
import { toast } from "sonner";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://api.caramellologistica.com",
  withCredentials: true, // Envia cookies HttpOnly automaticamente
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;

const getFriendlyErrorMessage = (error: AxiosError) => {
  const status = error.response?.status;
  const responseMessage = (error.response?.data as { message?: string; error?: string } | undefined)?.message
    || (error.response?.data as { message?: string; error?: string } | undefined)?.error;

  if (status === 400) return responseMessage || "Dados inválidos. Revise os campos e tente novamente.";
  if (status === 422) return responseMessage || "Não foi possível validar os dados enviados. Revise os campos e tente novamente.";
  if (status === 500) return "O servidor encontrou um problema interno. Tente novamente em instantes.";
  if (status === 401) return SESSION_EXPIRED_MESSAGE;
  return responseMessage || "Não foi possível concluir a operação. Tente novamente.";
};

const redirectToLoginAfterSessionExpiration = () => {
  clearSessionStorage();
  toast.error(SESSION_EXPIRED_MESSAGE);
  const targetUrl = `/login?session=expired&message=${encodeURIComponent(SESSION_EXPIRED_MESSAGE)}`;

  if (window.location.pathname !== "/login") {
    window.location.assign(targetUrl);
  }
};

const shouldSkipRefresh = (config?: InternalAxiosRequestConfig) => {
  const url = config?.url ?? "";
  return url.includes("/login") || url.includes("/auth/login") || url.includes("/auth/refresh");
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lê o token da memória (não mais do localStorage)
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const responseMessage = (error.response?.data as { message?: string; error?: string } | undefined)?.message
      || (error.response?.data as { message?: string; error?: string } | undefined)?.error;

    // Verificar se é erro de autenticação por mensagens típicas
    const isAuthError =
      status === 401 ||
      responseMessage?.toLowerCase().includes("token não fornecido") ||
      responseMessage?.toLowerCase().includes("token inválido") ||
      responseMessage?.toLowerCase().includes("token expirado") ||
      responseMessage?.toLowerCase().includes("não autorizado") ||
      responseMessage?.toLowerCase().includes("sessão expirada") ||
      responseMessage?.toLowerCase().includes("use post /login") ||
      responseMessage?.toLowerCase().includes("use post /auth/login");

    // Se for erro de autenticação (não importa o status), redirecionar para login
    if (isAuthError && !shouldSkipRefresh(originalRequest)) {
      redirectToLoginAfterSessionExpiration();
      return Promise.reject(error);
    }

    if (status !== 401 || !originalRequest || originalRequest._retry || shouldSkipRefresh(originalRequest)) {
      if (status === 400 || status === 422 || status === 500) {
        toast.error(getFriendlyErrorMessage(error));
      }

      return Promise.reject(error);
    }

    // Lê o refresh token da memória (não mais do localStorage)
    const storedRefreshToken = getRefreshToken();
    if (!storedRefreshToken) {
      redirectToLoginAfterSessionExpiration();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = authService
        .refreshToken(storedRefreshToken)
        .then((res: any) => {
          if (!res.success || !res.data?.token) {
            throw new Error(res.message || SESSION_EXPIRED_MESSAGE);
          }

          // Armazena os novos tokens na memória
          if (res.data.refreshToken) {
            setTokens(res.data.token, res.data.refreshToken);
          } else {
            setAccessToken(res.data.token);
          }
          return res.data.token;
        })
        .catch((refreshError: any) => {
          redirectToLoginAfterSessionExpiration();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const newToken = await refreshPromise;
      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export default api;
