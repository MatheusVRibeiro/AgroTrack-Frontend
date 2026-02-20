import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { ApiResponse, Frete, CriarFretePayload } from "@/types";

interface BackendFretesResponse {
  success: boolean;
  message: string;
  data: Frete[];
  meta?: ApiResponse["meta"];
}

interface BackendFreteResponse {
  success: boolean;
  message: string;
  data: { id: string };
}

export async function listarFretes(params?: { page?: number; limit?: number }): Promise<ApiResponse<Frete[]>> {
  try {
    const { page = 1, limit = 50 } = params ?? {};
    const res = await api.get<BackendFretesResponse>("/fretes", {
      params: { page, limit },
    });
    
    if (res.data.success && res.data.data) {
      return { success: true, data: res.data.data, meta: res.data.meta, status: res.status };
    }

    return { success: false, data: null, message: "Resposta inválida do servidor" };
  } catch (err: unknown) {
    let message = "Erro ao listar fretes";
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      const status = err.response?.status;
      return { success: false, data: null, message, status };
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message };
  }
}

export async function criarFrete(payload: CriarFretePayload): Promise<ApiResponse<{ id: string }>> {
  try {
    const res = await api.post<BackendFreteResponse>("/fretes", payload);
    
    if (res.data.success && res.data.data) {
      return {
        success: true,
        data: res.data.data,
        message: res.data.message,
        status: res.status,
      };
    }

    return { success: false, data: null, message: "Resposta inválida do servidor" };
  } catch (err: unknown) {
    let message = "Erro ao criar frete";
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.response?.data?.error ?? err.message ?? message;
      const status = err.response?.status;
      return { success: false, data: null, message, status };
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message };
  }
}

export async function obterFrete(id: string): Promise<ApiResponse<Frete>> {
  try {
    const res = await api.get<{ success: boolean; message: string; data: Frete }>(`/fretes/${id}`);
    
    if (res.data.success && res.data.data) {
      return { success: true, data: res.data.data };
    }
    
    return { success: false, data: null, message: "Frete não encontrado" };
  } catch (err: unknown) {
    let message = "Erro ao obter frete";
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      const status = err.response?.status;
      return { success: false, data: null, message, status };
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message };
  }
}

export async function listarFretesPendentes(motoristaId?: string): Promise<ApiResponse<Frete[]>> {
  try {
    const url = motoristaId ? `/fretes/pendentes?motorista_id=${motoristaId}` : "/fretes/pendentes";
    const res = await api.get<BackendFretesResponse>(url);

    if (res.data.success && res.data.data) {
      return { success: true, data: res.data.data };
    }

    return { success: false, data: null, message: "Resposta inválida do servidor" };
  } catch (err: unknown) {
    let message = "Erro ao listar fretes pendentes";
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      const status = err.response?.status;
      return { success: false, data: null, message, status };
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message };
  }
}
