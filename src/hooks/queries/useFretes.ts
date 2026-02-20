import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as fretesService from "@/services/fretes";
import type { CriarFretePayload } from "@/types";

export const FRETES_QUERY_KEY = ["fretes"] as const;

export function useFretes(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  return useQuery({
    queryKey: [...FRETES_QUERY_KEY, page, limit],
    queryFn: () => fretesService.listarFretes({ page, limit }),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCriarFrete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CriarFretePayload) => fretesService.criarFrete(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRETES_QUERY_KEY });
    },
  });
}
