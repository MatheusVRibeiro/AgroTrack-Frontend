import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { Custo, CriarCustoPayload, ApiResponse } from "@/types";

type CriarCustosEmLotePayload = {
  frete_id: string;
  custos: Array<
    Omit<CriarCustoPayload, "frete_id"> & {
      frete_id?: string;
    }
  >;
};

const listarCustos = async (params?: { page?: number; limit?: number }): Promise<ApiResponse<Custo[]>> => {
  try {
    const { page = 1, limit = 10000 } = params ?? {};
    const res = await api.get("/custos", { params: { page, limit } });
    return { success: true, data: res.data.data || res.data, meta: res.data.meta, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao listar custos";
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

const fetchAllCustos = async (params: Record<string, any> = {}): Promise<ApiResponse<Custo[]>> => {
  try {
    const perPage = params.limit ?? params.per_page ?? 1000;
    let page = params.page ?? 1;
    const all: Custo[] = [];
    let lastMeta: any = undefined;

    while (true) {
      const res = await api.get("/custos", { params: { ...params, page, limit: perPage } });
      const items = res.data?.data || res.data || [];
      const meta = res.data?.meta;
      lastMeta = meta ?? lastMeta;

      if (!Array.isArray(items) || items.length === 0) break;
      all.push(...items);

      // If API provides pagination metadata, use it to determine if there are more pages
      if (meta && (meta.total !== undefined || meta.page !== undefined)) {
        const total = Number(meta.total ?? 0);
        const per = Number(meta.per_page ?? meta.limit ?? perPage);
        const currentPage = Number(meta.page ?? page);
        const totalPages = per > 0 ? Math.ceil(total / per) : currentPage;
        if (currentPage >= totalPages) break;
        page = currentPage + 1;
        continue;
      }

      // Fallback: if the returned items are fewer than requested perPage, assume end
      if (items.length < perPage) break;
      page++;
    }

    return { success: true, data: all, meta: lastMeta ? { ...lastMeta, fetched_count: all.length } : { total: all.length, per_page: perPage } };
  } catch (err: unknown) {
    let message = "Erro ao listar custos";
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

const obterCusto = async (id: string): Promise<ApiResponse<Custo>> => {
  try {
    const res = await api.get(`/custos/${id}`);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao obter custo";
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

const criarCusto = async (
  payload: CriarCustoPayload | CriarCustosEmLotePayload
): Promise<ApiResponse<Custo | { ids?: string[]; totalCriados?: number; frete_id?: string }>> => {
  try {
    const res = await api.post("/custos", payload);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao criar custo";
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

const atualizarCusto = async (
  id: string,
  payload: Partial<CriarCustoPayload>
): Promise<ApiResponse<Custo>> => {
  try {
    const res = await api.put(`/custos/${id}`, payload);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao atualizar custo";
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

const deletarCusto = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const res = await api.delete(`/custos/${id}`);
    return { success: true, data: null, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao deletar custo";
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

const custosService = {
  listarCustos,
  fetchAllCustos,
  obterCusto,
  criarCusto,
  atualizarCusto,
  deletarCusto,
};

export default custosService;
