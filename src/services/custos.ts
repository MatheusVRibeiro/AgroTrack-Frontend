import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { Custo, CriarCustoPayload, ApiResponse } from "@/types";

const listarCustos = async (params?: { page?: number; limit?: number }): Promise<ApiResponse<Custo[]>> => {
  try {
    const { page = 1, limit = 50 } = params ?? {};
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

const criarCusto = async (payload: CriarCustoPayload): Promise<ApiResponse<Custo>> => {
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
  obterCusto,
  criarCusto,
  atualizarCusto,
  deletarCusto,
};

export default custosService;
