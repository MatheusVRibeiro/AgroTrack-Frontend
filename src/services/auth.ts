import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { ApiResponse, User } from "@/types";

interface LoginPayload {
  email: string;
  senha: string;
}

interface BackendUsuario {
  id: string;
  email: string;
  nome: string;
  role?: "admin" | "operador" | "motorista";
}

interface BackendLoginResponse {
  success: boolean;
  message?: string;
  token: string;
  refreshToken?: string;
  refresh_token?: string;
  usuario: BackendUsuario;
}

interface BackendRefreshResponse {
  success: boolean;
  message?: string;
  token: string;
  refreshToken?: string;
  refresh_token?: string;
}

interface LoginResult {
  user: User;
  token: string;
  refreshToken?: string;
  refresh_token?: string;
}

export async function login(email: string, senha: string): Promise<ApiResponse<LoginResult>> {
  try {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const res = await api.post<BackendLoginResponse>("/login", { email: normalizedEmail, senha });

    const status = res.status;
    // Backend retorna: { success, message, token, usuario }
    if (res.data.success && res.data.token && res.data.usuario) {
      const { token, refreshToken, refresh_token, usuario } = res.data;
      const normalizedRefreshToken = refreshToken ?? refresh_token;

      if (!usuario) {
        return { success: false, data: null, message: "Usuário não encontrado na resposta", status };
      }

      // Map backend fields (nome) to frontend format (name)
      const mappedUser: User = {
        id: usuario.id,
        name: usuario.nome,
        email: usuario.email,
        role: usuario.role ?? "admin",
      };

      return {
        success: true,
        data: {
          user: mappedUser,
          token,
          refreshToken: normalizedRefreshToken,
        },
        status,
      };
    }

    return { success: false, data: null, message: res.data.message ?? "Resposta inválida do servidor", status };
  } catch (err: unknown) {
    let message = "Erro na autenticação";
    let status: number | undefined = undefined;
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      status = err.response?.status;
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message, status };
  }
}

export async function refreshToken(refreshTokenValue?: string): Promise<ApiResponse<{ token: string; refreshToken?: string }>> {
  try {
    const res = await api.post<BackendRefreshResponse>("/auth/refresh", refreshTokenValue ? { refreshToken: refreshTokenValue } : {});

    if (res.data.success && res.data.token) {
      return {
        success: true,
        data: {
          token: res.data.token,
          refreshToken: res.data.refreshToken ?? res.data.refresh_token,
        },
        status: res.status,
      };
    }

    return {
      success: false,
      data: null,
      message: res.data.message ?? "Não foi possível renovar a sessão",
      status: res.status,
    };
  } catch (err: unknown) {
    let message = "Erro ao renovar sessão";
    let status: number | undefined = undefined;
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      status = err.response?.status;
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return {
      success: false,
      data: null,
      message,
      status,
    };
  }
}

export async function register(nome: string, email: string, senha: string): Promise<ApiResponse<{ user: User }>> {
  try {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const res = await api.post("/auth/registrar", { nome, email: normalizedEmail, senha });

    const status = res.status;
    if (res.data.success && res.data.data) {
      return {
        success: true,
        data: { user: res.data.data },
        status,
      };
    }

    return { success: false, data: null, message: res.data.message ?? "Resposta inválida do servidor", status };
  } catch (err: unknown) {
    let message = "Erro no registro";
    let status: number | undefined = undefined;
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      status = err.response?.status;
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message, status };
  }
}

export async function forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const res = await api.post<{ success: boolean; message: string }>(
      "/recuperar-senha",
      { email: normalizedEmail }
    );

    const status = res.status;
    if (res.data.success) {
      return {
        success: true,
        data: { message: res.data.message },
        message: res.data.message,
        status,
      };
    }

    return { success: false, data: null, message: res.data.message ?? "Erro ao enviar email", status };
  } catch (err: unknown) {
    let message = "Erro ao solicitar recuperação de senha";
    let status: number | undefined = undefined;
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      status = err.response?.status;
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message, status };
  }
}

export async function resetPassword(
  token: string,
  novaSenha: string,
  confirmaSenha: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await api.post<{ success: boolean; message: string }>(
      "/redefinir-senha",
      {
        token,
        novaSenha,
        confirmaSenha,
      }
    );

    const status = res.status;
    if (res.data.success) {
      return {
        success: true,
        data: { message: res.data.message },
        message: res.data.message,
        status,
      };
    }

    return { success: false, data: null, message: res.data.message ?? "Erro ao redefinir senha", status };
  } catch (err: unknown) {
    let message = "Erro ao redefinir senha";
    let status: number | undefined = undefined;
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      status = err.response?.status;
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message, status };
  }
}

/**
 * Verifica a identidade do usuário atual baseado nos cookies da sessão.
 */
export async function me(): Promise<ApiResponse<User>> {
  try {
    const res = await api.get<{ success: boolean; usuario: BackendUsuario }>("/auth/me");

    if (res.data.success && res.data.usuario) {
      const { usuario } = res.data;
      const mappedUser: User = {
        id: usuario.id,
        name: usuario.nome,
        email: usuario.email,
        role: usuario.role ?? "admin",
      };

      return {
        success: true,
        data: mappedUser,
        status: res.status,
      };
    }

    return {
      success: false,
      data: null,
      message: "Sessão inválida",
      status: res.status,
    };
  } catch (err: unknown) {
    let message = "Erro ao verificar sessão";
    let status: number | undefined = undefined;
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      status = err.response?.status;
    }
    return { success: false, data: null, message, status };
  }
}

/**
 * Realiza o logout no servidor (limpa cookies HttpOnly).
 */
export async function logout(): Promise<ApiResponse<null>> {
  try {
    const res = await api.post("/auth/logout");
    return { success: true, data: null, status: res.status };
  } catch (err: unknown) {
    return { success: false, data: null, message: "Erro logout", status: 500 };
  }
}
