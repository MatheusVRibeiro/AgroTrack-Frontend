import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { FieldError, fieldErrorClass } from "@/components/shared/FieldError";
import { ModalSubmitFooter } from "@/components/shared/ModalSubmitFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Users, UserCheck, UserX, Lock, Unlock,
  MoreHorizontal, Edit, Trash2, ShieldAlert,
  ShieldCheck, Clock, AlertTriangle, Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useShake } from "@/hooks/useShake";
import type { Usuario, Role } from "@/types";
import {
  useUsuarios,
  useCriarUsuario,
  useAtualizarUsuario,
  useDeletarUsuario,
} from "@/hooks/queries/useUsuarios";

// ─── Constants ───────────────────────────────────────────────────────────────

const INACTIVITY_WARNING_DAYS = 60;
const INACTIVITY_DISABLE_DAYS = 90;

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: "Administrador", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  contabilidade: { label: "Contabilidade", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  operador: { label: "Operador", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  motorista: { label: "Motorista", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
};

// ─── Time helpers ────────────────────────────────────────────────────────────

function tempoRelativo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Nunca acessou";
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return "Nunca acessou";

  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `Há ${diffMin} minuto${diffMin > 1 ? "s" : ""}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Há ${diffH} hora${diffH > 1 ? "s" : ""}`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `Há ${diffD} dia${diffD > 1 ? "s" : ""}`;
  const diffM = Math.floor(diffD / 30);
  return `Há ${diffM} ${diffM > 1 ? "meses" : "mês"}`;
}

function diasSemAcesso(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
}

function isBloqueado(bloqueado_ate: string | null | undefined): boolean {
  if (!bloqueado_ate) return false;
  return new Date(bloqueado_ate).getTime() > Date.now();
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function Usuarios() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<Usuario & { senha?: string }>>({});
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const { isShaking, triggerShake } = useShake(220);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  // Queries
  const { data: usuariosResponse, isLoading, refetch } = useUsuarios({ page: currentPage, limit: itemsPerPage });
  const criarMutation = useCriarUsuario();
  const atualizarMutation = useAtualizarUsuario();
  const deletarMutation = useDeletarUsuario();
  const isSaving = criarMutation.status === "pending" || atualizarMutation.status === "pending";

  const allUsers: Usuario[] = useMemo(() => usuariosResponse?.data || [], [usuariosResponse?.data]);
  const serverMeta = usuariosResponse?.meta as any;
  const totalFromServer = serverMeta?.total ?? allUsers.length;
  const totalPages = serverMeta?.totalPages ?? Math.ceil(totalFromServer / itemsPerPage);

  // Client-side filtering (search + status)
  const filteredUsers = useMemo(() => {
    let list = allUsers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.nome?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }
    if (statusFilter === "ativo") list = list.filter((u) => Number(u.ativo) === 1);
    if (statusFilter === "inativo") list = list.filter((u) => Number(u.ativo) === 0);
    if (statusFilter === "bloqueado") list = list.filter((u) => isBloqueado(u.bloqueado_ate));
    return list;
  }, [allUsers, search, statusFilter]);

  // KPI counts — from full server page or filtered
  const totalUsuarios = totalFromServer;
  const totalAtivos = allUsers.filter((u) => Number(u.ativo) === 1).length;
  const totalInativos = allUsers.filter((u) => Number(u.ativo) === 0).length;
  const totalBloqueados = allUsers.filter((u) => isBloqueado(u.bloqueado_ate)).length;

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  // ─── Modal handlers ──────────────────────────────────────────────────────

  const handleOpenNew = () => {
    setEditedUser({
      nome: "",
      email: "",
      role: "operador",
      ativo: 1,
      telefone: "",
      documento: "",
    });
    setIsEditing(false);
    setErrosCampos({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: Usuario) => {
    setEditedUser({
      ...user,
      ativo: Number(user.ativo),
    });
    setIsEditing(true);
    setErrosCampos({});
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!editedUser.nome?.trim()) errors.nome = "Nome é obrigatório";
    if (!editedUser.email?.trim()) errors.email = "Email é obrigatório";
    if (!isEditing && (!editedUser.senha || editedUser.senha.length < 6))
      errors.senha = "Senha deve ter no mínimo 6 caracteres";
    if (!editedUser.role) errors.role = "Perfil é obrigatório";

    if (Object.keys(errors).length > 0) {
      setErrosCampos(errors);
      triggerShake();
      toast.error(`Erro: ${Object.values(errors)[0]}`);
      return;
    }

    const payload: Record<string, any> = {
      nome: editedUser.nome?.trim().toUpperCase(),
      email: editedUser.email?.trim().toLowerCase(),
      role: editedUser.role,
      ativo: editedUser.ativo === 1 || editedUser.ativo === true,
    };
    if (editedUser.telefone?.trim()) payload.telefone = editedUser.telefone.replace(/\D/g, "");
    if (editedUser.documento?.trim()) payload.documento = editedUser.documento.replace(/\D/g, "");
    if (!isEditing && editedUser.senha) payload.senha = editedUser.senha;
    if (isEditing && editedUser.senha && editedUser.senha.length >= 6) payload.senha = editedUser.senha;

    try {
      if (isEditing) {
        const id = String(editedUser.id || "");
        const res = await atualizarMutation.mutateAsync({ id, payload });
        if (res.success) {
          toast.success("Usuário atualizado com sucesso!");
          setIsModalOpen(false);
          refetch();
        } else {
          toast.error(res.message ?? "Erro ao atualizar");
        }
      } else {
        const res = await criarMutation.mutateAsync(payload);
        if (res.success) {
          toast.success("Usuário criado com sucesso!");
          setIsModalOpen(false);
          refetch();
        } else {
          toast.error(res.message ?? "Erro ao criar");
        }
      }
    } catch (e) {
      toast.error("Erro ao salvar usuário");
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleToggleAtivo = (user: Usuario) => {
    const novoStatus = Number(user.ativo) === 1 ? false : true;
    const label = novoStatus ? "ativar" : "inativar";
    setConfirmDialog({
      open: true,
      title: `${novoStatus ? "Ativar" : "Inativar"} usuário`,
      message: `Tem certeza que deseja ${label} o usuário "${user.nome}"?`,
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, open: false }));
        const res = await atualizarMutation.mutateAsync({
          id: String(user.id),
          payload: { ativo: novoStatus },
        });
        if (res.success) {
          toast.success(`Usuário ${novoStatus ? "ativado" : "inativado"} com sucesso`);
          refetch();
        } else {
          toast.error(res.message ?? "Erro ao atualizar status");
        }
      },
    });
  };

  const handleDesbloquear = async (user: Usuario) => {
    const res = await atualizarMutation.mutateAsync({
      id: String(user.id),
      payload: { bloqueado_ate: null, tentativas_login_falhas: 0 },
    });
    if (res.success) {
      toast.success(`Usuário "${user.nome}" desbloqueado`);
      refetch();
    } else {
      toast.error(res.message ?? "Erro ao desbloquear");
    }
  };

  const handleDelete = (user: Usuario) => {
    setConfirmDialog({
      open: true,
      title: "Excluir usuário",
      message: `Tem certeza que deseja excluir permanentemente o usuário "${user.nome}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, open: false }));
        const res = await deletarMutation.mutateAsync(String(user.id));
        if (res.success) {
          toast.success("Usuário excluído com sucesso");
          refetch();
        } else {
          toast.error(res.message ?? "Erro ao excluir");
        }
      },
    });
  };

  // ─── Status badge helpers ─────────────────────────────────────────────────

  function renderStatusBadge(user: Usuario) {
    if (isBloqueado(user.bloqueado_ate)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Lock className="h-3 w-3" /> Bloqueado
        </Badge>
      );
    }
    if (Number(user.ativo) === 0) {
      const dias = diasSemAcesso(user.ultimo_acesso);
      if (dias !== null && dias >= INACTIVITY_DISABLE_DAYS) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <AlertTriangle className="h-3 w-3" /> Inativo por inatividade
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Desativado automaticamente após {INACTIVITY_DISABLE_DAYS} dias sem acesso</p>
            </TooltipContent>
          </Tooltip>
        );
      }
      return <Badge variant="secondary">Inativo</Badge>;
    }
    // Ativo — check warning
    const dias = diasSemAcesso(user.ultimo_acesso);
    if (dias !== null && dias >= INACTIVITY_WARNING_DAYS) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="gap-1 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300">
              <Clock className="h-3 w-3" /> Ativo ({dias}d sem acesso)
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esse usuário será desativado automaticamente em {INACTIVITY_DISABLE_DAYS - dias} dias</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300">
        Ativo
      </Badge>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <MainLayout title="Usuários" subtitle="Gerenciamento de acessos">
      <PageHeader
        title="Usuários"
        description="Gerencie os acessos ao sistema"
        actions={
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden lg:flex">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">
                  Usuários inativos por mais de <strong>{INACTIVITY_DISABLE_DAYS} dias</strong> são desativados automaticamente.
                  Alerta a partir de <strong>{INACTIVITY_WARNING_DAYS} dias</strong> sem acesso.
                </p>
              </TooltipContent>
            </Tooltip>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total</p>
              <p className="text-xl md:text-2xl font-bold">{totalUsuarios}</p>
            </div>
            <Users className="h-6 w-6 md:h-8 md:w-8 text-primary/30" />
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Ativos</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">{totalAtivos}</p>
            </div>
            <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-green-600/30" />
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Inativos</p>
              <p className="text-xl md:text-2xl font-bold text-gray-500">{totalInativos}</p>
            </div>
            <UserX className="h-6 w-6 md:h-8 md:w-8 text-gray-400/30" />
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Bloqueados</p>
              <p className="text-xl md:text-2xl font-bold text-red-600">{totalBloqueados}</p>
            </div>
            <Lock className="h-6 w-6 md:h-8 md:w-8 text-red-600/30" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou email..."
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
              <SelectItem value="bloqueado">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const dias = diasSemAcesso(user.ultimo_acesso);
                  const blocked = isBloqueado(user.bloqueado_ate);
                  const role = roleConfig[user.role] ?? roleConfig.operador;

                  return (
                    <TableRow key={user.id} className={cn(blocked && "opacity-70")}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {blocked && <Lock className="h-4 w-4 text-red-500 flex-shrink-0" />}
                          {user.nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", role.color)}>
                          {role.label}
                        </span>
                      </TableCell>
                      <TableCell>{renderStatusBadge(user)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-sm",
                            dias === null
                              ? "text-muted-foreground italic"
                              : dias >= INACTIVITY_DISABLE_DAYS
                              ? "text-red-500 font-medium"
                              : dias >= INACTIVITY_WARNING_DAYS
                              ? "text-amber-600 font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {tempoRelativo(user.ultimo_acesso)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleAtivo(user)}>
                              {Number(user.ativo) === 1 ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Inativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            {blocked && (
                              <DropdownMenuItem onClick={() => handleDesbloquear(user)}>
                                <Unlock className="h-4 w-4 mr-2" />
                                Desbloquear
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(user)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(Math.max(1, currentPage - 1));
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const isVisible =
                  Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                if (!isVisible) return null;
                if (page === 2 && currentPage > 3) {
                  return (
                    <PaginationItem key="ellipsis-start">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                if (page === totalPages - 1 && currentPage < totalPages - 2) {
                  return (
                    <PaginationItem key="ellipsis-end">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(Math.min(totalPages, currentPage + 1));
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="text-xs text-muted-foreground ml-4 flex items-center">
            Página {currentPage} de {totalPages} • {totalFromServer} registros
          </div>
        </div>
      )}

      {/* ──── Create/Edit Modal ───────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Altere os dados do usuário."
                : "Preencha os campos obrigatórios para criar um novo acesso."}
            </DialogDescription>
          </DialogHeader>

          <div className={cn("space-y-4", isShaking && "animate-shake")}>
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="user-nome">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-nome"
                value={editedUser.nome ?? ""}
                onChange={(e) => {
                  setEditedUser((p) => ({ ...p, nome: e.target.value }));
                  setErrosCampos((p) => ({ ...p, nome: "" }));
                }}
                placeholder="Nome completo"
                className={fieldErrorClass(errosCampos.nome)}
              />
              <FieldError message={errosCampos.nome} />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="user-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-email"
                type="email"
                value={editedUser.email ?? ""}
                onChange={(e) => {
                  setEditedUser((p) => ({ ...p, email: e.target.value }));
                  setErrosCampos((p) => ({ ...p, email: "" }));
                }}
                placeholder="email@exemplo.com"
                className={fieldErrorClass(errosCampos.email)}
              />
              <FieldError message={errosCampos.email} />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="user-senha">
                Senha {!isEditing && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="user-senha"
                type="password"
                value={editedUser.senha ?? ""}
                onChange={(e) => {
                  setEditedUser((p) => ({ ...p, senha: e.target.value }));
                  setErrosCampos((p) => ({ ...p, senha: "" }));
                }}
                placeholder={isEditing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                className={fieldErrorClass(errosCampos.senha)}
              />
              <FieldError message={errosCampos.senha} />
            </div>

            {/* Perfil + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Perfil <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={editedUser.role ?? "operador"}
                  onValueChange={(v) => setEditedUser((p) => ({ ...p, role: v as Role }))}
                >
                  <SelectTrigger className={fieldErrorClass(errosCampos.role)}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 text-purple-600" /> Administrador
                      </span>
                    </SelectItem>
                    <SelectItem value="contabilidade">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Contabilidade
                      </span>
                    </SelectItem>
                    <SelectItem value="operador">
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-emerald-600" /> Operador
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errosCampos.role} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={String(editedUser.ativo ?? 1)}
                  onValueChange={(v) => setEditedUser((p) => ({ ...p, ativo: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ativo</SelectItem>
                    <SelectItem value="0">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Telefone + Documento (opcionais) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-telefone">Telefone</Label>
                <Input
                  id="user-telefone"
                  value={editedUser.telefone ?? ""}
                  onChange={(e) => setEditedUser((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(99) 99999-9999"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-documento">Documento</Label>
                <Input
                  id="user-documento"
                  value={editedUser.documento ?? ""}
                  onChange={(e) => setEditedUser((p) => ({ ...p, documento: e.target.value }))}
                  placeholder="CPF / CNPJ"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <ModalSubmitFooter
              onCancel={() => setIsModalOpen(false)}
              onSubmit={handleSave}
              submitLabel={isEditing ? "Salvar Alterações" : "Criar Usuário"}
              isSubmitting={isSaving}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Confirmation Dialog ────────────────────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((p) => ({ ...p, open: false }))}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDialog.onConfirm}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB Mobile */}
      <Button
        onClick={handleOpenNew}
        className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg p-0"
        size="icon"
        aria-label="Novo Usuário"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </MainLayout>
  );
}
