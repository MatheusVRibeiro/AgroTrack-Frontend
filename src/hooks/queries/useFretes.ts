import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as fretesService from "@/services/fretes";
import type { CriarFretePayload } from "@/types";

export const FRETES_QUERY_KEY = ["fretes"] as const;

export function useEstatisticasFretes(params?: any) {
  return useQuery({
    queryKey: ["estatisticas-fretes", params],
    queryFn: () => fretesService.obterEstatisticas(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useFretes(params?: {
  page?: number;
  limit?: number;
  fetchAll?: boolean;
  data_inicio?: string;
  data_fim?: string;
  motorista_id?: string | number;
  caminhao_id?: string | number;
  fazenda_id?: string | number;
  search?: string;
}) {
  const { page = 1, limit = 50, fetchAll = false, ...filtros } = params ?? {};

  return useQuery({
    queryKey: fetchAll ? [...FRETES_QUERY_KEY, "all", filtros] : [...FRETES_QUERY_KEY, page, limit, filtros],
    queryFn: async () => {
      if (!fetchAll) {
        return fretesService.listarFretes({ page, limit, ...filtros });
      }

      // Fetch all pages sequentially and concatenate results
      const perPage = limit || 50;
      let current = 1;
      let allData: any[] = [];
      let lastMeta: any = undefined;

      while (true) {
        const res = await fretesService.listarFretes({ page: current, limit: perPage, ...filtros });
        if (!res.success) return res;
        const pageData = Array.isArray(res.data) ? res.data : [];
        allData = allData.concat(pageData);
        lastMeta = res.meta;

        const totalPages = res.meta?.totalPages;
        if (pageData.length < perPage) break;
        if (typeof totalPages === "number" && current >= totalPages) break;
        current += 1;
      }

      return { success: true, data: allData, meta: lastMeta };
    },
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

export function useDeletarFrete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fretesService.deletarFrete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRETES_QUERY_KEY });
      // Also refresh fazendas since backend may update totals
      queryClient.invalidateQueries({ queryKey: ["fazendas"] });
    },
  });
}
