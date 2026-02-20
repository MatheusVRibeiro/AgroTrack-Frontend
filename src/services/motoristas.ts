import api from "@/api/axios";
import { isAxiosError } from "axios";
import type { ApiResponse, Motorista } from "@/types";

export async function listarMotoristas(params?: { page?: number; limit?: number }): Promise<ApiResponse<Motorista[]>> {
  try {
    const { page = 1, limit = 50 } = params ?? {};
    const res = await api.get("/motoristas", { params: { page, limit } });
    // Backend retorna {success, message, data: [...]} 
    // Então res.data.data contém o array de motoristas
    return { success: true, data: res.data.data || res.data, meta: res.data.meta };
  } catch (err: any) {
    console.error("Erro em listarMotoristas:", err);
    const message = err?.response?.data?.message ?? err?.message ?? "Erro ao listar motoristas";
    return { success: false, data: null, message };
  }
}

export async function criarMotorista(payload: Record<string, any>): Promise<ApiResponse<Motorista>> {
  try {
    console.debug("POST /motoristas payload:", payload);
    const res = await api.post("/motoristas", payload);
    // Backend retorna {success, message, data: {...}}
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: any) {
    // Log detalhado e tentativa de extrair mensagem útil do backend
    console.error("Erro em criarMotorista:", err);
    const respData = err?.response?.data;
    console.error("Resposta do servidor:", respData, "payload:", payload);
    let message = "Erro ao criar motorista";
    if (isAxiosError(err)) {
      if (respData) {
        // Prioriza campos comuns de erro
        message = respData.message ?? respData.error ?? JSON.stringify(respData);
      } else {
        message = err.message;
      }

      // No automatic retry: backend requires veiculo_id when aplicável — frontend deve validar antes
    } else if (err instanceof Error) {
      message = err.message;
    }
    const status = isAxiosError(err) ? err.response?.status : undefined;
    return { success: false, data: null, message, status };
  }
}

export async function atualizarMotorista(id: string, payload: Partial<Record<string, any>>): Promise<ApiResponse<Motorista>> {
  try {
    console.debug(`PUT /motoristas/${id} payload:`, payload);
    const res = await api.put(`/motoristas/${id}`, payload);
    console.debug(`Resposta PUT /motoristas/${id}:`, res.data);
    return { success: true, data: res.data.data || res.data, status: res.status };
  } catch (err: unknown) {
    let message = "Erro ao atualizar motorista";
    if (isAxiosError(err)) {
      const respData = err.response?.data;
      console.error("Resposta de erro do servidor em atualizarMotorista:", respData);
      message = respData?.message ?? respData?.error ?? err.message ?? message;
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

const motoristasService = {
  listarMotoristas,
  criarMotorista,
  atualizarMotorista,
};

export default motoristasService;
