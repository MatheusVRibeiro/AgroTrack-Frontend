import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { ApiResponse, Frete, CriarFretePayload } from "@/types";

export type AtualizarFretePayload = Partial<CriarFretePayload>;

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

export async function listarFretes(params?: {
  page?: number;
  limit?: number;
  data_inicio?: string;
  data_fim?: string;
  motorista_id?: string | number;
  caminhao_id?: string | number;
  fazenda_id?: string | number;
  search?: string;
}): Promise<ApiResponse<Frete[]>> {
  try {
    const { page = 1, limit = 50, ...outros } = params ?? {};
    const res = await api.get<BackendFretesResponse>("/fretes", {
      params: { page, limit, ...outros },
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

export async function obterEstatisticas(params?: {
  data_inicio?: string;
  data_fim?: string;
  motorista_id?: string | number;
  caminhao_id?: string | number;
  fazenda_id?: string | number;
  search?: string;
}): Promise<ApiResponse<any>> {
  try {
    const res = await api.get<any>("/fretes/estatisticas", {
      params,
    });

    if (res.data.success && res.data.data) {
      return { success: true, data: res.data.data, status: res.status };
    }

    return { success: false, data: null, message: "Resposta inválida do servidor" };
  } catch (err: unknown) {
    let message = "Erro ao carregar estatisticas";
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      const status = err.response?.status;
      return { success: false, data: null, message, status };
    }
    return { success: false, data: null, message: String(err) };
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
      const field = err.response?.data?.field;
      return { success: false, data: null, message, status, field };
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

export async function listarFretesPendentes(params?: { motoristaId?: string; proprietarioId?: string }): Promise<ApiResponse<Frete[]>> {
  try {
    const query = params?.proprietarioId
      ? `proprietario_id=${params.proprietarioId}`
      : params?.motoristaId
        ? `motorista_id=${params.motoristaId}`
        : "";
    const url = query ? `/fretes/pendentes?${query}` : "/fretes/pendentes";
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
export async function atualizarFrete(
  id: string,
  payload: AtualizarFretePayload
): Promise<ApiResponse<Frete>> {
  try {
    const res = await api.put<{ success: boolean; message: string; data: Frete }>(
      `/fretes/${id}`,
      payload
    );

    if (res.data.success && res.data.data) {
      return { success: true, data: res.data.data, status: res.status };
    }

    // Backend pode responder sem data (apenas confirmar o update)
    return { success: true, data: null, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao atualizar frete";
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

export async function deletarFrete(id: string): Promise<ApiResponse<void>> {
  try {
    const res = await api.delete(`/fretes/${id}`);
    if (res.status === 200 || res.status === 204) {
      return { success: true, data: null, status: res.status };
    }
    return { success: false, data: null, message: res.data?.message || "Erro ao deletar frete", status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao deletar frete";
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