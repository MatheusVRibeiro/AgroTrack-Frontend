import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as motoristasService from "@/services/motoristas";
import type { ApiResponse, Motorista } from "@/types";

export const MOTORISTAS_QUERY_KEY = ["motoristas"] as const;

export interface MotoristasQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tipo?: string;
}

export function useMotoristas(params?: MotoristasQueryParams) {
  const { page = 1, limit = 50, ...filtros } = params ?? {};

  const filtrosLimpos = Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== "" && v !== "all")
  );

  return useQuery({
    queryKey: [...MOTORISTAS_QUERY_KEY, page, limit, filtrosLimpos],
    queryFn: () => motoristasService.listarMotoristas({ page, limit, ...filtrosLimpos }),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
}

export function useCriarMotorista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: motoristasService.criarMotorista,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTORISTAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["caminhoes"] });
    },
  });
}

export function useAtualizarMotorista() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<Motorista>, unknown, { id: string; payload: Partial<Record<string, any>> }>({
    mutationFn: ({ id, payload }) => motoristasService.atualizarMotorista(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTORISTAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["caminhoes"] });
    },
  });
}