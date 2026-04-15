import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { ApiResponse, Caminhao, CriarCaminhaoPayload } from "@/types";

export interface CaminhoesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  proprietario_tipo?: string;
}

export async function listarCaminhoes(params?: CaminhoesQueryParams): Promise<ApiResponse<Caminhao[]>> {
  try {
    const { page = 1, limit = 10000, ...filtros } = params ?? {};
    
    const filtrosLimpos = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== "" && v !== "all")
    );

    const res = await api.get("/frota", { params: { page, limit, ...filtrosLimpos } });
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
    const errorDetail = err?.response?.data?.error;
    const rawMessage = err?.response?.data?.message ?? err?.message;
    let message = rawMessage ?? "Erro ao criar caminhão";

    if (typeof errorDetail === "string" && /duplicate entry/i.test(errorDetail) && /placa/i.test(errorDetail)) {
      message = "Placa já cadastrada. Informe uma placa diferente.";
    }

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
      const errorDetail = (err.response?.data as any)?.error;
      message = err.response?.data?.message ?? err.message ?? message;

      if (typeof errorDetail === "string" && /duplicate entry/i.test(errorDetail) && /placa/i.test(errorDetail)) {
        message = "Placa já cadastrada. Informe uma placa diferente.";
      }

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
