import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import custosService from "@/services/custos";
import type { CriarCustoPayload } from "@/types";

export const CUSTOS_QUERY_KEY = ["custos"] as const;

export interface CustosQueryParams {
  page?: number;
  limit?: number;
  tipo?: string;
  search?: string;
  motorista_id?: string;
  data_inicio?: string;
  data_fim?: string;
  comprovante?: boolean;
}

export function useCustos(params?: CustosQueryParams) {
  const { page = 1, limit = 20, ...filtros } = params ?? {};

  // Remove keys with undefined values to keep query key clean
  const filtrosLimpos = Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== "" && v !== "all")
  );

  return useQuery({
    queryKey: [...CUSTOS_QUERY_KEY, page, limit, filtrosLimpos],
    queryFn: () => custosService.listarCustos({ page, limit, ...filtrosLimpos }),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
  });
}
