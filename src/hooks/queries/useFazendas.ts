import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fazendasService from "@/services/fazendas";
import type { CriarFazendaPayload } from "@/types";

export const FAZENDAS_QUERY_KEY = ["fazendas"] as const;

export interface FazendasQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function useFazendas(params?: FazendasQueryParams) {
  const { page = 1, limit = 50, search } = params ?? {};
  
  const queryParams: Record<string, any> = { page, limit };
  if (search) queryParams.search = search;

  return useQuery({
    queryKey: [...FAZENDAS_QUERY_KEY, page, limit, search].filter(Boolean),
    queryFn: () => fazendasService.listarFazendas(queryParams),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
}

export function useCriarFazenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fazendasService.criarFazenda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAZENDAS_QUERY_KEY });
    },
  });
}

export function useAtualizarFazenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CriarFazendaPayload> }) =>
      fazendasService.atualizarFazenda(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAZENDAS_QUERY_KEY });
    },
  });
}

export function useDeletarFazenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fazendasService.deletarFazenda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAZENDAS_QUERY_KEY });
    },
  });
}
