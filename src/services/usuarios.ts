import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { ApiResponse, Usuario } from "@/types";

export async function listarUsuarios(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Usuario[]>> {
  try {
    const { page = 1, limit = 20 } = params ?? {};
    const res = await api.get("/usuarios", { params: { page, limit } });
    return {
      success: true,
      data: res.data.data || res.data,
      meta: res.data.meta,
    };
  } catch (err: any) {
    const message =
      err?.response?.data?.message ?? err?.message ?? "Erro ao listar usuários";
    return { success: false, data: null, message };
  }
}

export async function criarUsuario(
  payload: Record<string, any>
): Promise<ApiResponse<Usuario>> {
  try {
    const res = await api.post("/usuarios", payload);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: any) {
    let message = "Erro ao criar usuário";
    if (isAxiosError(err)) {
      const respData = err.response?.data;
      if (respData) {
        message = respData.message ?? respData.error ?? JSON.stringify(respData);
      }
    }
    const status = isAxiosError(err) ? err.response?.status : undefined;
    return { success: false, data: null, message, status };
  }
}

export async function atualizarUsuario(
  id: string,
  payload: Partial<Record<string, any>>
): Promise<ApiResponse<Usuario>> {
  try {
    const res = await api.put(`/usuarios/${id}`, payload);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: any) {
    let message = "Erro ao atualizar usuário";
    if (isAxiosError(err)) {
      const respData = err.response?.data;
      message = respData?.message ?? respData?.error ?? err.message ?? message;
      const status = err.response?.status;
      return { success: false, data: null, message, status };
    }
    return { success: false, data: null, message };
  }
}

export async function deletarUsuario(
  id: string
): Promise<ApiResponse<null>> {
  try {
    const res = await api.delete(`/usuarios/${id}`);
    return { success: true, data: null, message: res.data.message };
  } catch (err: any) {
    let message = "Erro ao excluir usuário";
    if (isAxiosError(err)) {
      const respData = err.response?.data;
      message = respData?.message ?? err.message ?? message;
    }
    return { success: false, data: null, message };
  }
}
