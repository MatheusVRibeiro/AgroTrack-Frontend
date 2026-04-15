import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { FieldError, fieldErrorClass } from "@/components/shared/FieldError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { InputMascarado } from "@/components/InputMascarado";
import { validarCPF, validarEmail, validarCNH, validarTelefone, apenasNumeros, formatarDataBrasileira, converterDataBrasileira, formatarDocumento, formatarTelefone, formatarCodigoFrete } from "@/utils/formatters";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, TrendingUp, Phone, Mail, Calendar, Truck, Edit, Save, X, MapPin, Award, CreditCard, Users, UserCheck, UserX, ShieldCheck, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sortMotoristasPorNome } from "@/lib/sortHelpers";
import { emptyToNull, cleanPayload } from "@/lib/utils";
import type { Motorista } from "@/types";
import { useCriarMotorista, useMotoristas, useAtualizarMotorista } from "@/hooks/queries/useMotoristas";
import { useFretes } from "@/hooks/queries/useFretes";
import { ModalSubmitFooter } from "@/components/shared/ModalSubmitFooter";
import { RefreshingIndicator } from "@/components/shared/RefreshingIndicator";
import { useRefreshData } from "@/hooks/useRefreshData";
import { useShake } from "@/hooks/useShake";
import { MotoristasCards } from "@/components/motoristas/MotoristasCards";
import { MotoristaFormModal } from "@/components/motoristas/MotoristaFormModal";

// Payload para criar motorista
interface CriarMotoristaPayload {
  nome: string;
  documento?: string | null;
  telefone: string;
  email: string;
  // cnh removido do banco e do payload
  tipo: "proprio" | "terceirizado" | "agregado";
  endereco?: string | null;
  status?: "ativo" | "inativo" | "ferias";
  tipo_pagamento?: "pix" | "transferencia_bancaria";
  chave_pix_tipo?: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | null;
  chave_pix?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: "corrente" | "poupanca" | null;
}

// Caminhões serão carregados via API

const statusConfig = {
  ativo: { label: "Ativo", variant: "active" as const },
  inativo: { label: "Inativo", variant: "inactive" as const },
  ferias: { label: "Férias", variant: "warning" as const },
};

const tipoMotoristaConfig = {
  proprio: { label: "Próprio", variant: "secondary" as const },
  terceirizado: { label: "Terceirizado", variant: "outline" as const },
  agregado: { label: "Agregado", variant: "warning" as const },
};

export default function Motoristas() {
  const [documentoTipo, setDocumentoTipo] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [originalMotorista, setOriginalMotorista] = useState<Motorista | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMotorista, setEditedMotorista] = useState<Partial<Motorista>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isShaking, triggerShake } = useShake(220);

  const {
    data: motoristasResponse,
    isLoading: isLoadingMotoristas,
    refetch: recarregarMotoristas,
  } = useMotoristas({ page: currentPage, limit: itemsPerPage, search, status: statusFilter, tipo: tipoFilter });
  const { data: fretesResponse } = useFretes();

  const motoristasState: Motorista[] = useMemo(
    () => sortMotoristasPorNome(motoristasResponse?.data || []),
    [motoristasResponse?.data]
  );
  const serverMeta = motoristasResponse?.meta as any;
  const totalFromServer = serverMeta?.total ?? motoristasState.length;
  const totalPagesFromServer = serverMeta?.totalPages ?? Math.ceil(totalFromServer / itemsPerPage);

  const fretesApi = fretesResponse?.data || [];
  const editRouteHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (motoristasResponse && !motoristasResponse.success) {
      toast.error(motoristasResponse.message || "Erro ao carregar motoristas");
    }
  }, [motoristasResponse]);

  const createMotoristaMutation = useCriarMotorista();
  const atualizarMotoristaMutation = useAtualizarMotorista();
  const isSaving = createMotoristaMutation.status === "pending" || atualizarMotoristaMutation.status === "pending";
  const { isRefreshing, startRefresh, endRefresh } = useRefreshData();


  // Abrir modal de edição quando rota /motoristas/editar/:id for acessada
  const params = useParams();
  useEffect(() => {
    const idParam = params.id;
    if (!idParam) {
      editRouteHandledRef.current = null;
      return;
    }
    if (isLoadingMotoristas || motoristasState.length === 0) return;
    if (editRouteHandledRef.current === String(idParam)) return;

    const found = motoristasState.find((m) => String(m.id) === String(idParam));
    if (found) {
      editRouteHandledRef.current = String(idParam);
      handleOpenEditModal(found, { skipNavigate: true });
      return;
    }

    recarregarMotoristas();
  }, [params.id, isLoadingMotoristas, motoristasState, recarregarMotoristas]);

  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenNewModal = () => {
    setEditedMotorista({
      nome: "",
      documento: "",
      telefone: "",
      email: "",
      status: "ativo",
      tipo: "proprio",
      endereco: "",
      tipo_pagamento: "pix",
      chave_pix_tipo: "cpf",
      chave_pix: "",
      banco: "",
      agencia: "",
      conta: "",
      tipo_conta: "corrente",
    });
    setIsEditing(false);
    setIsModalOpen(true);
    setOriginalMotorista(null);
  };

  const handleOpenEditModal = (motorista: Motorista, options?: { skipNavigate?: boolean }) => {
    setEditedMotorista({
      ...motorista,
      telefone: motorista.telefone ? formatarTelefone(motorista.telefone) : "",
    });
    setOriginalMotorista({ ...motorista });
    setIsEditing(true);
    setIsModalOpen(true);
    if (!options?.skipNavigate && motorista) {
      const targetPath = `/motoristas/editar/${motorista.id}`;
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTipoFilter("all");
  };

  const handleSave = async () => {
    const novosErros: Record<string, string> = {};

    // Only require minimal fields for creation
    if (!editedMotorista.nome?.trim()) {
      novosErros.nome = "Nome é obrigatório";
    }

    if (!editedMotorista.telefone?.trim()) {
      novosErros.telefone = "Telefone é obrigatório";
    } else {
      const telefoneLimpo = apenasNumeros(editedMotorista.telefone);
      if (!validarTelefone(telefoneLimpo)) {
        novosErros.telefone = "Telefone inválido";
      }
    }

    if (!editedMotorista.tipo) {
      novosErros.tipo = "Tipo de motorista é obrigatório";
    }

    // Conditional payment validation (keep as before)
    if (editedMotorista.tipo_pagamento === "pix") {
      if (!editedMotorista.chave_pix?.trim()) {
        novosErros.chave_pix = "Chave PIX é obrigatória";
      }
    } else if (editedMotorista.tipo_pagamento === "transferencia_bancaria") {
      if (!editedMotorista.banco?.trim()) {
        novosErros.banco = "Banco é obrigatório";
      }
      if (!editedMotorista.agencia?.trim()) {
        novosErros.agencia = "Agência é obrigatória";
      }
      if (!editedMotorista.conta?.trim()) {
        novosErros.conta = "Conta é obrigatória";
      }
    }

    if (Object.keys(novosErros).length > 0) {
      setErrosCampos(novosErros);
      triggerShake();
      const primeiroErro = Object.keys(novosErros)[0];
      toast.error(`Erro: ${novosErros[primeiroErro]}`);
      return;
    }

    // Build minimal payload (used for create and update)
    const payload: Record<string, any> = {
      nome: (editedMotorista.nome?.trim() || "").toUpperCase(),
      telefone: apenasNumeros(editedMotorista.telefone || ""),
      email: editedMotorista.email?.trim() || null,
      endereco: editedMotorista.endereco?.trim() || null,
      tipo: editedMotorista.tipo,
      status: editedMotorista.status || "ativo",
      tipo_pagamento: editedMotorista.tipo_pagamento || 'pix',
    };

    if (editedMotorista.documento && editedMotorista.documento.trim() !== "") {
      const docLimpo = apenasNumeros(editedMotorista.documento);
      payload.documento = docLimpo;
    }

    if (payload.tipo_pagamento === 'pix') {
      payload.banco = null;
      payload.agencia = null;
      payload.conta = null;
      payload.tipo_conta = null;
      payload.chave_pix_tipo = (editedMotorista.chave_pix_tipo as string) || 'cpf';
      payload.chave_pix = editedMotorista.chave_pix
        ? (payload.chave_pix_tipo === 'cpf' || payload.chave_pix_tipo === 'cnpj'
          ? apenasNumeros(editedMotorista.chave_pix)
          : editedMotorista.chave_pix)
        : null;
    } else if (payload.tipo_pagamento === 'transferencia_bancaria') {
      payload.banco = editedMotorista.banco || null;
      payload.agencia = editedMotorista.agencia || null;
      payload.conta = editedMotorista.conta || null;
      payload.chave_pix = null;
      payload.chave_pix_tipo = null;
    }

    // Remove null/undefined/empty fields to avoid sending explicit nulls for enum fields
    const finalPayload = cleanPayload(payload);

    if (isEditing) {
      // Build normalized objects for comparison (to detect only changed fields)
      const normalize = (m: any) => {
        if (!m) return {};
        const telefone = m.telefone ? apenasNumeros(m.telefone) : null;
        const documento = m.documento ? apenasNumeros(m.documento) : null;
        const tipo_pagamento = m.tipo_pagamento || null;
        const chave_pix_tipo = m.chave_pix_tipo || (tipo_pagamento === 'pix' ? 'cpf' : null);
        const chave_pix = m.chave_pix
          ? (chave_pix_tipo === 'cpf' || chave_pix_tipo === 'cnpj' ? apenasNumeros(m.chave_pix) : m.chave_pix)
          : null;
        return {
          nome: m.nome ?? null,
          telefone,
          documento,
          email: m.email ?? null,
          endereco: m.endereco ?? null,
          tipo: m.tipo ?? null,
          status: m.status ?? null,
          tipo_pagamento,
          chave_pix_tipo,
          chave_pix,
          banco: m.banco ?? null,
          agencia: m.agencia ?? null,
          conta: m.conta ?? null,
          tipo_conta: m.tipo_conta ?? null,
        };
      };

      const originalNorm = normalize(originalMotorista);
      const editedNorm = normalize(editedMotorista);

      const changed: Record<string, any> = {};
      Object.keys(editedNorm).forEach((k) => {
        const origVal = originalNorm[k as keyof typeof originalNorm];
        const editVal = editedNorm[k as keyof typeof editedNorm];
        if (origVal !== editVal) {
          changed[k] = editVal;
        }
      });

      // Map any 'none' sentinel to null already handled in normalized values
      const finalUpdatePayload = cleanPayload(changed);
      if (finalUpdatePayload.nome) {
        finalUpdatePayload.nome = String(finalUpdatePayload.nome).trim().toUpperCase();
      }

      if (Object.keys(finalUpdatePayload).length === 0) {
        toast.info('Nenhuma alteração detectada.');
        return;
      }

      const id = String(editedMotorista.id || editedMotorista.codigo_motorista || "");
      startRefresh();
      try {
        console.debug("atualizarMotorista - payload:", finalUpdatePayload);
        const res = await atualizarMotoristaMutation.mutateAsync({ id, payload: finalUpdatePayload });
        console.debug("atualizarMotorista - resposta:", res);
        if (res?.success) {
          setIsModalOpen(false);
          toast.success(res.message ?? "Motorista atualizado com sucesso!");
          setErrosCampos({});
          setIsEditing(false);
          setEditedMotorista({});
          setOriginalMotorista(null);
          recarregarMotoristas();
          navigate("/motoristas", { replace: true });
          endRefresh();
        } else {
          toast.error(res?.message ?? "Erro ao atualizar motorista");
          endRefresh();
        }
      } catch (e) {
        console.error(e);
        toast.error("Erro ao atualizar motorista");
        endRefresh();
      }
      return;
    }

    try {
      startRefresh();
      const res = await createMotoristaMutation.mutateAsync(finalPayload as any);
      if (res?.success) {
        setIsModalOpen(false);
        toast.success("Motorista cadastrado com sucesso!");
        setErrosCampos({});
        endRefresh();
      } else {
        toast.error(res?.message || "Erro ao cadastrar motorista");
        endRefresh();
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conectar com a API");
      endRefresh();
    }
  };

  useEffect(() => {
    if (!isModalOpen && location.pathname.startsWith("/motoristas/editar")) {
      navigate("/motoristas");
    }
  }, [isModalOpen, location.pathname, navigate]);

  // Filtragem local desativada (agora é server-side)
  // Mas mantemos a ordenação do Contelli no topo a nível de UI sobre a página atual retornada pelo servidor
  const isContelli = (motorista: Motorista) => {
    const haystack = [motorista.nome, motorista.endereco, motorista.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes("contelli");
  };

  const sortedData = [...motoristasState].sort((a, b) => {
    const aPriority = isContelli(a) ? 0 : 1;
    const bPriority = isContelli(b) ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
  });

  // Lógica de paginação principal
  const totalPages = totalPagesFromServer;
  const paginatedData = sortedData; // Itens que vieram do servidor já são a página correta

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, tipoFilter]);

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, tipoFilter]);

  const totalMotoristas = totalFromServer;
  const totalAtivos = motoristasState.filter((m) => m.status === "ativo").length;
  const totalInativos = motoristasState.filter((m) => m.status === "inativo").length;
  const totalTerceirizados = motoristasState.filter((m) => m.tipo === "terceirizado").length;
  const toNumber = (value: number | string | null | undefined) => {
    if (typeof value === "number") return value;
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const receitaTotal = motoristasState.reduce((acc, m) => acc + toNumber(m.receita_gerada), 0);
  const getDriverInitials = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return "--";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };
  const maskDocumento = (documento?: string | null) => {
    if (!documento) return "—";
    const digits = apenasNumeros(documento);
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
    }
    if (digits.length === 14) {
      return `${digits.slice(0, 2)}.***.***/****-${digits.slice(-2)}`;
    }
    return "***";
  };




  const recentFretes = useMemo(() => {
    if (!selectedMotorista) return [];
    return [...fretesApi]
      .filter((frete) =>
        String(frete.proprietario_id || frete.motorista_id) === String(selectedMotorista.id)
      )
      .sort((a, b) => new Date(b.data_frete).getTime() - new Date(a.data_frete).getTime())
      .slice(0, 3)
      .map((frete, index) => ({
        id: frete.id,
        codigo: formatarCodigoFrete(frete.codigo_frete || frete.id, frete.data_frete, index + 1),
        rota: `${frete.origem} → ${frete.destino}`,
        data: formatarDataBrasileira(frete.data_frete),
        valor: Number(frete.receita ?? frete.toneladas * frete.valor_por_tonelada) || 0,
      }));
  }, [fretesApi, selectedMotorista]);

  return (
    <MainLayout title="Motoristas" subtitle="Gestão de motoristas">
      <RefreshingIndicator isRefreshing={isRefreshing} />
      <PageHeader
        title="Motoristas"
        description="Gerencie sua equipe de motoristas"
        actions={
          <div className="hidden lg:flex">
            <Button onClick={handleOpenNewModal}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Motorista
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-6">
        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total de Motoristas</p>
              <p className="text-xl md:text-2xl font-bold">{totalMotoristas}</p>
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
        <Card className="p-3 md:p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Inativos</p>
              <p className="text-xl md:text-2xl font-bold text-red-600">{totalInativos}</p>
            </div>
            <UserX className="h-6 w-6 md:h-8 md:w-8 text-red-600/30" />
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Terceirizados</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600">{totalTerceirizados}</p>
            </div>
            <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-blue-600/30" />
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-profit/5 border-profit/20 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Receita Total</p>
              <p className="text-xl md:text-2xl font-bold text-profit">
                R$ {receitaTotal.toLocaleString("pt-BR")}
              </p>
            </div>
            <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-profit/30" />
          </div>
        </Card>
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden mb-4">
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filtros de Motoristas</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Buscar</Label>
                <Input
                  placeholder="Buscar por nome ou documento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="proprio">Próprio</SelectItem>
                    <SelectItem value="terceirizado">Terceirizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 flex gap-2">
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Limpar
                </Button>
                <Button onClick={() => setFiltersOpen(false)} className="flex-1">
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Filters */}
      <FilterBar
        className="hidden lg:flex"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou documento..."
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="ferias">Férias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Tipo</Label>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="proprio">Próprio</SelectItem>
              <SelectItem value="terceirizado">Terceirizado</SelectItem>
              <SelectItem value="agregado">Agregado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {/* FAB: Novo Motorista (Mobile) */}
      <Button
        onClick={handleOpenNewModal}
        className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg p-0"
        size="icon"
        aria-label="Novo Motorista"
      >
        <Plus className="h-6 w-6" />
      </Button>



      {paginatedData.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum motorista encontrado</p>
        </div>
      ) : (
        <MotoristasCards
          data={paginatedData}
          onSelectMotorista={setSelectedMotorista}
          getDriverInitials={getDriverInitials}
          maskDocumento={maskDocumento}
          toNumber={toNumber}
          formatarTelefone={formatarTelefone}
          statusConfig={statusConfig}
          tipoMotoristaConfig={tipoMotoristaConfig}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <>
          {/* Mobile Pagination */}
          <div className="mt-6 md:hidden">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 px-4"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground font-medium">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 px-4"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Total de {totalFromServer} registros no banco
            </p>
          </div>

          {/* Desktop Pagination */}
          <div className="mt-6 hidden md:flex justify-center">
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
                  const isCurrentPage = page === currentPage;
                  const isVisible = Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;

                  if (!isVisible) {
                    return null;
                  }

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
                        isActive={isCurrentPage}
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
        </>
      )}

      {/* Driver Detail Modal */}
      <Dialog open={!!selectedMotorista} onOpenChange={() => setSelectedMotorista(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Detalhes do Motorista</DialogTitle>
                <DialogDescription>Resumo do perfil, contato e desempenho do motorista.</DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedMotorista) {
                    // Exemplo: navegação para rota de edição usando id numérico
                    navigate(`/motoristas/editar/${selectedMotorista.id}`);
                    setSelectedMotorista(null);
                  }
                }}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-1">
            {selectedMotorista && (
              <div className="space-y-6">
                {/* Header */}
                <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                          {selectedMotorista.nome
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-bold mb-1">{selectedMotorista.nome}</p>
                        {/* código_motorista oculto por solicitação do usuário */}
                        <p className="text-sm text-muted-foreground mb-1">{formatarDocumento(selectedMotorista.documento)}</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={statusConfig[selectedMotorista.status].variant}
                            className="text-xs"
                          >
                            {statusConfig[selectedMotorista.status].label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{tipoMotoristaConfig[selectedMotorista.tipo].label}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                        <Phone className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Telefone</p>
                        <p className="font-semibold">{formatarTelefone(selectedMotorista.telefone)}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                        <Mail className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">E-mail</p>
                        <p className="font-semibold text-sm">{selectedMotorista.email}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* CNH and Truck Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 border-l-4 border-l-orange-500">
                    <p className="text-sm text-muted-foreground mb-2">CNH</p>
                    <p className="font-mono font-bold text-lg">{selectedMotorista.cnh}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-muted-foreground">
                        Validade: {formatarDataBrasileira(selectedMotorista.cnh_validade)}
                      </p>
                      {selectedMotorista.cnh_categoria && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <Badge variant="outline" className="text-xs">
                            Categoria {selectedMotorista.cnh_categoria}
                          </Badge>
                        </>
                      )}
                    </div>
                  </Card>


                </div>

                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 bg-profit/5 border-profit/20">
                    <p className="text-sm text-muted-foreground mb-2">Receita Gerada</p>
                    <p className="text-2xl font-bold text-profit">
                      R$ {toNumber(selectedMotorista.receita_gerada).toLocaleString("pt-BR")}
                    </p>
                  </Card>
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <p className="text-sm text-muted-foreground mb-2">Viagens</p>
                    <p className="text-2xl font-bold text-primary">
                      {toNumber(selectedMotorista.viagens_realizadas)}
                    </p>
                  </Card>
                  <Card className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-2">Média/viagem</p>
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                      R$ {(
                        toNumber(selectedMotorista.receita_gerada) /
                        Math.max(toNumber(selectedMotorista.viagens_realizadas), 1)
                      ).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </Card>
                </div>

                {/* Freight History */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Histórico de Fretes Recentes
                  </h4>
                  {recentFretes.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
                      <p className="text-sm text-muted-foreground">Nenhum frete recente encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentFretes.map((frete) => (
                        <Card
                          key={frete.id}
                          className="p-3 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                              <span className="font-mono text-sm font-bold text-primary">{frete.codigo}</span>
                              <span className="font-medium truncate">{frete.rota}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">{frete.data}</span>
                              <span className="font-bold text-profit">
                                R$ {frete.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Data */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Dados Bancários / PIX
                  </h4>
                  {selectedMotorista.tipo_pagamento === "pix" ? (
                    <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Tipo de Chave PIX</p>
                          <p className="font-semibold">
                            {selectedMotorista.chave_pix_tipo === "cpf" && "CPF"}
                            {selectedMotorista.chave_pix_tipo === "cnpj" && "CNPJ"}
                            {selectedMotorista.chave_pix_tipo === "email" && "E-mail"}
                            {selectedMotorista.chave_pix_tipo === "telefone" && "Telefone"}
                            {selectedMotorista.chave_pix_tipo === "aleatoria" && "Chave Aleatória"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Chave PIX</p>
                          <p className="font-mono bg-white dark:bg-slate-900 p-2 rounded border border-green-200 dark:border-green-900 break-all">
                            {selectedMotorista.chave_pix}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : selectedMotorista.banco ? (
                    <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Banco</p>
                          <p className="font-semibold">{selectedMotorista.banco}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Agência</p>
                          <p className="font-mono font-bold text-lg">{selectedMotorista.agencia}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Conta</p>
                          <p className="font-mono font-bold text-lg">{selectedMotorista.conta}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Tipo de Conta</p>
                          <p className="font-semibold">
                            {selectedMotorista.tipo_conta === "corrente" ? "Corrente" : "Poupança"}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-4 bg-muted/50">
                      <p className="text-sm text-muted-foreground">Nenhum dado bancário cadastrado</p>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MotoristaFormModal
        isModalOpen={isModalOpen}
        isEditing={isEditing}
        isSaving={isSaving}
        isShaking={isShaking}
        editedMotorista={editedMotorista}
        setEditedMotorista={setEditedMotorista}
        errosCampos={errosCampos}
        setErrosCampos={setErrosCampos}
        setDocumentoTipo={setDocumentoTipo}
        handleSave={handleSave}
        onClose={() => setIsModalOpen(false)}
        onOpenChange={setIsModalOpen}
        editRouteHandledRef={editRouteHandledRef}
      />
    </MainLayout>
  );
}
