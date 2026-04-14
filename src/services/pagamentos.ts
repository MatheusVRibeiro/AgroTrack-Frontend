import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { ApiResponse, Pagamento, CriarPagamentoPayload, AtualizarPagamentoPayload } from "@/types";

const listarPagamentos = async (params?: Record<string, any>): Promise<ApiResponse<Pagamento[]>> => {
  try {
    const { page = 1, limit = 50, ...outros } = params ?? {};
    const filtrosLimpos = Object.fromEntries(
      Object.entries(outros).filter(([, v]) => v !== undefined && v !== "" && v !== "all")
    );
    const res = await api.get("/pagamentos", { params: { page, limit, ...filtrosLimpos } });
    return { success: true, data: res.data.data || res.data, meta: res.data.meta, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao listar pagamentos";
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

const obterPagamento = async (id: string): Promise<ApiResponse<Pagamento>> => {
  try {
    const res = await api.get(`/pagamentos/${id}`);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao obter pagamento";
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

const criarPagamento = async (payload: CriarPagamentoPayload): Promise<ApiResponse<{ id: string }>> => {
  try {
    const res = await api.post("/pagamentos", payload);
    return { success: true, data: res.data.data || res.data, message: res.data.message, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao criar pagamento";
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

const atualizarPagamento = async (
  id: string,
  payload: AtualizarPagamentoPayload
): Promise<ApiResponse<{ id: string }>> => {
  try {
    const res = await api.put(`/pagamentos/${id}`, payload);
    return { success: true, data: res.data.data || res.data, message: res.data.message, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao atualizar pagamento";
    if (isAxiosError(err)) {
      message = err.response?.data?.message ?? err.message ?? message;
      const status = err.response?.status;
      // Se PUT retornar 404, tentar PATCH (algumas APIs usam PATCH para updates parciais)
      if (status === 404) {
        try {
          const patchRes = await api.patch(`/pagamentos/${id}`, payload);
          return { success: true, data: patchRes.data.data || patchRes.data, message: patchRes.data.message, status: patchRes.status };
        } catch (patchErr: unknown) {
          // log detalhado para debugging
          console.error("Falha ao atualizar pagamento (PUT retornou 404 e PATCH também falhou)", {
            id,
            payload,
            putError: err?.response?.data ?? err.message,
            patchError: (patchErr as any)?.response?.data ?? (patchErr as any)?.message ?? patchErr,
          });
          const patchStatus = isAxiosError(patchErr) ? (patchErr.response?.status ?? undefined) : undefined;
          return { success: false, data: null, message: message || "Recurso não encontrado", status: patchStatus ?? status };
        }
      }
      return { success: false, data: null, message, status };
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return { success: false, data: null, message };
  }
};

const deletarPagamento = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const res = await api.delete(`/pagamentos/${id}`);
    return { success: true, data: null, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao deletar pagamento";
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

const uploadComprovante = async (
  pagamentoId: string,
  file: File
): Promise<ApiResponse<{ anexoId: string; filename: string; url: string; originalname: string }>> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post(`/pagamentos/${pagamentoId}/comprovante`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return { success: true, data: res.data.data || res.data, message: res.data.message, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao enviar comprovante";
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

const pagamentosService = {
  listarPagamentos,
  obterPagamento,
  criarPagamento,
  atualizarPagamento,
  deletarPagamento,
  uploadComprovante,
};

export default pagamentosService;
