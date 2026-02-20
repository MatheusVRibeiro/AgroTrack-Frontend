import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as motoristasService from "@/services/motoristas";
import type { ApiResponse, Motorista } from "@/types";

export const MOTORISTAS_QUERY_KEY = ["motoristas"] as const;

export function useMotoristas(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  return useQuery({
    queryKey: [...MOTORISTAS_QUERY_KEY, page, limit],
    queryFn: () => motoristasService.listarMotoristas({ page, limit }),
    staleTime: 1000 * 60 * 5,
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
      queryClient.invalidateQueries({ queryKey: ["frota"] });
    },
  });
}