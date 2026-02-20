import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { ApiResponse, Caminhao, CriarCaminhaoPayload } from "@/types";

export async function listarCaminhoes(params?: { page?: number; limit?: number }): Promise<ApiResponse<Caminhao[]>> {
  try {
    const { page = 1, limit = 50 } = params ?? {};
    const res = await api.get("/frota", { params: { page, limit } });
    // Backend retorna {success, message, data: [...]}
    // Então res.data.data contém o array de caminhões
    return { success: true, data: res.data.data || res.data, meta: res.data.meta, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao listar caminhões";
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

export async function criarCaminhao(payload: CriarCaminhaoPayload): Promise<ApiResponse<Caminhao>> {
  try {
    console.debug("POST /frota payload:", payload);
    const res = await api.post("/frota", payload);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: any) {
    console.error("Erro em criarCaminhao:", err?.response?.data ?? err);
    const message = err?.response?.data?.message ?? err?.message ?? "Erro ao criar caminhão";
    const status = err?.response?.status;
    return { success: false, data: null, message, status };
  }
}

export async function atualizarCaminhao(id: string, payload: Partial<CriarCaminhaoPayload>): Promise<ApiResponse<Caminhao>> {
  try {
    const res = await api.put(`/frota/${id}`, payload);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao atualizar caminhão";
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

export async function deletarCaminhao(id: string): Promise<ApiResponse<void>> {
  try {
    await api.delete(`/frota/${id}`);
    return { success: true, data: null };
  } catch (err: unknown) {
    let message = "Erro ao deletar caminhão";
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

export async function listarPorMotorista(motoristaId: string): Promise<ApiResponse<Caminhao[]>> {
  try {
    const res = await api.get(`/frota?motorista_fixo_id=${motoristaId}`);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao listar caminhões do motorista";
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

const caminhoesService = {
  listarCaminhoes,
  criarCaminhao,
  atualizarCaminhao,
  deletarCaminhao,
  listarPorMotorista,
};

export default caminhoesService;
