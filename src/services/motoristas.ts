import api from "@/api/axios";
import type { ApiResponse, Motorista } from "@/types";

export async function listarMotoristas(): Promise<ApiResponse<Motorista[]>> {
  try {
    const res = await api.get("/motoristas");
    // Backend retorna {success, message, data: [...]}
    // Então res.data.data contém o array de motoristas
    return { success: true, data: res.data.data || res.data };
  } catch (err: unknown) {
    const message = err?.response?.data?.message ?? err.message ?? "Erro ao listar motoristas";
    return { success: false, data: null, message };
  }
}

export async function criarMotorista(payload: Record<string, any>): Promise<ApiResponse<Motorista>> {
  try {
    const res = await api.post("/motoristas", payload);
    // Backend retorna {success, message, data: {...}}
    return { success: true, data: res.data.data || res.data };
  } catch (err: unknown) {
    const message = err?.response?.data?.message ?? err.message ?? "Erro ao criar motorista";
    return { success: false, data: null, message };
  }
}

export async function atualizarMotorista(id: string, payload: Record<string, any>): Promise<ApiResponse<Motorista>> {
  try {
    const res = await api.put(`/motoristas/${id}`, payload);
    return { success: true, data: res.data.data || res.data };
  } catch (err: unknown) {
    const message = err?.response?.data?.message ?? err.message ?? "Erro ao atualizar motorista";
    return { success: false, data: null, message };
  }
}

const motoristasService = {
  listarMotoristas,
  criarMotorista,
  atualizarMotorista,
};

export default motoristasService;
