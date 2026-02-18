import api from "@/api/axios";
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
  usuario: BackendUsuario;
}

interface LoginResult {
  user: User;
  token: string;
}

export async function login(email: string, senha: string): Promise<ApiResponse<LoginResult>> {
  try {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const res = await api.post<BackendLoginResponse>("/auth/login", { email: normalizedEmail, senha });

    const status = res.status;
    // Backend retorna: { success, message, token, usuario }
    if (res.data.success && res.data.token && res.data.usuario) {
      const { token, usuario } = res.data;

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
          token: token,
        },
        status,
      };
    }

    return { success: false, data: null, message: res.data.message ?? "Resposta inválida do servidor", status };
  } catch (err: unknown) {
    // Try to extract status/message from axios error shape
    const anyErr: any = err;
    const status = anyErr?.response?.status;
    const message = anyErr?.response?.data?.message ?? anyErr?.message ?? "Erro na autenticação";
    return { success: false, data: null, message, status };
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
    const anyErr: any = err;
    const status = anyErr?.response?.status;
    const message = anyErr?.response?.data?.message ?? anyErr?.message ?? "Erro no registro";
    return { success: false, data: null, message, status };
  }
}
