import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { Fazenda, CriarFazendaPayload, ApiResponse } from "@/types";

type FazendaBackend = Fazenda & {
  nome?: string;
  localizacao?: string;
  estado?: "SP" | "MS" | "MT";
};

const normalizeFazendaFromBackend = (item: FazendaBackend): Fazenda => ({
  ...item,
  fazenda: item.fazenda ?? item.nome ?? "",
  estado: item.estado ?? (item.localizacao as "SP" | "MS" | "MT" | undefined) ?? null,
});

const normalizeListResponse = (data: unknown): Fazenda[] => {
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeFazendaFromBackend(item as FazendaBackend));
};

const normalizeSingleResponse = (data: unknown): Fazenda | null => {
  if (!data || typeof data !== "object") return null;
  return normalizeFazendaFromBackend(data as FazendaBackend);
};

const normalizePayloadToBackend = (payload: CriarFazendaPayload | Partial<CriarFazendaPayload>) => {
  const normalized = { ...payload };

  if (typeof normalized.fazenda === "string") {
    normalized.fazenda = normalized.fazenda.trim();
  }

  return normalized;
};

const listarFazendas = async (params?: { page?: number; limit?: number }): Promise<ApiResponse<Fazenda[]>> => {
  try {
    const { page = 1, limit = 50 } = params ?? {};
    const res = await api.get("/fazendas", { params: { page, limit } });
    const data = normalizeListResponse(res.data.data || res.data);
    return { success: true, data, meta: res.data.meta, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao listar fazendas";
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
};

const obterFazenda = async (id: string): Promise<ApiResponse<Fazenda>> => {
  try {
    const res = await api.get(`/fazendas/${id}`);
    const data = normalizeSingleResponse(res.data.data || res.data);
    return { success: true, data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao obter fazenda";
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
};

const criarFazenda = async (payload: CriarFazendaPayload): Promise<ApiResponse<Fazenda>> => {
  try {
    const res = await api.post("/fazendas", normalizePayloadToBackend(payload));
    const data = normalizeSingleResponse(res.data.data || res.data);
    return { success: true, data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao criar fazenda";
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
};

const atualizarFazenda = async (
  id: string,
  payload: Partial<CriarFazendaPayload>
): Promise<ApiResponse<Fazenda>> => {
  try {
    const res = await api.put(`/fazendas/${id}`, normalizePayloadToBackend(payload));
    const data = normalizeSingleResponse(res.data.data || res.data);
    return { success: true, data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao atualizar fazenda";
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
};

const deletarFazenda = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const res = await api.delete(`/fazendas/${id}`);
    return { success: true, data: null, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao deletar fazenda";
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
};

const incrementarVolumeTransportado = async (
  id: string,
  toneladas: number,
  sacas?: number,
  faturamento?: number
): Promise<ApiResponse<Fazenda>> => {
  try {
    const body: Record<string, number> = { toneladas };
    if (sacas !== undefined) body.sacas = sacas;
    if (faturamento !== undefined) body.faturamento = faturamento;
    const res = await api.post(`/fazendas/${id}/incrementar-volume`, body);
    const data = normalizeSingleResponse(res.data.data || res.data);
    return { success: true, data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao incrementar volume";
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
};

const fazendasService = {
  listarFazendas,
  obterFazenda,
  criarFazenda,
  atualizarFazenda,
  deletarFazenda,
  incrementarVolumeTransportado,
};

export default fazendasService;
