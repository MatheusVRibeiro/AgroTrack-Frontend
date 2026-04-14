import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as fretesService from "@/services/fretes";
import type { CriarFretePayload } from "@/types";

export const FRETES_QUERY_KEY = ["fretes"] as const;

export interface FretesQueryParams {
  page?: number;
  limit?: number;
  data_inicio?: string;
  data_fim?: string;
  motorista_id?: string | number;
  caminhao_id?: string | number;
  fazenda_id?: string | number;
  search?: string;
}

export interface EstatisticasQueryParams {
  data_inicio?: string;
  data_fim?: string;
  motorista_id?: string | number;
  caminhao_id?: string | number;
  fazenda_id?: string | number;
  search?: string;
}

export function useEstatisticasFretes(params?: EstatisticasQueryParams) {
  return useQuery({
    queryKey: ["estatisticas-fretes", params],
    queryFn: () => fretesService.obterEstatisticas(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useFretes(params?: FretesQueryParams) {
  const { page = 1, limit = 20, ...filtros } = params ?? {};

  return useQuery({
    queryKey: [...FRETES_QUERY_KEY, page, limit, filtros],
    queryFn: () => fretesService.listarFretes({ page, limit, ...filtros }),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev, // Keeps previous data visible while loading next page
  });
}

export function useCriarFrete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CriarFretePayload) => fretesService.criarFrete(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRETES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["estatisticas-fretes"] });
    },
  });
}

export function useDeletarFrete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fretesService.deletarFrete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRETES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["estatisticas-fretes"] });
      // Also refresh fazendas since backend may update totals
      queryClient.invalidateQueries({ queryKey: ["fazendas"] });
    },
  });
}
