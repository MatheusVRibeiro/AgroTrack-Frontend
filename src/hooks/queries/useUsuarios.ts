import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as usuariosService from "@/services/usuarios";
import type { ApiResponse, Usuario } from "@/types";

export const USUARIOS_QUERY_KEY = ["usuarios"] as const;

export function useUsuarios(params?: { page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = params ?? {};

  return useQuery({
    queryKey: [...USUARIOS_QUERY_KEY, page, limit],
    queryFn: () => usuariosService.listarUsuarios({ page, limit }),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
}

export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usuariosService.criarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY });
    },
  });
}

export function useAtualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<Usuario>,
    unknown,
    { id: string; payload: Partial<Record<string, any>> }
  >({
    mutationFn: ({ id, payload }) =>
      usuariosService.atualizarUsuario(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY });
    },
  });
}

export function useDeletarUsuario() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<null>, unknown, string>({
    mutationFn: usuariosService.deletarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY });
    },
  });
}
