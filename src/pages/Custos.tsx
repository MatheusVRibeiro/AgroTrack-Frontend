import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodoFilter } from "@/components/shared/PeriodoFilter";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { ModalSubmitFooter } from "@/components/shared/ModalSubmitFooter";
import { FieldError, fieldErrorClass } from "@/components/shared/FieldError";
import { DatePicker } from "@/components/shared/DatePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import custosService from "@/services/custos";
import * as fretesService from "@/services/fretes";
import { usePeriodoFilter } from "@/hooks/usePeriodoFilter";
import type { ApiResponse, Custo, CriarCustoPayload, Frete } from "@/types";
import { toast } from "sonner";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, Upload, Fuel, Wrench, FileText, DollarSign, Truck, User, MapPin, Calendar as CalendarIcon, FileCheck, Eye, Filter, X } from "lucide-react";
import { cn, shortName } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ITEMS_PER_PAGE } from "@/lib/pagination";
import { RefreshingIndicator } from "@/components/shared/RefreshingIndicator";
import { useRefreshData } from "@/hooks/useRefreshData";
import { useShake } from "@/hooks/useShake";
import { formatarCodigoFrete, isCustoFromFrete } from "@/utils/formatters";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export const tipoConfig = {
  combustivel: { label: "Combustível", icon: Fuel, color: "text-warning" },
  manutencao: { label: "Manutenção", icon: Wrench, color: "text-loss" },
  pedagio: { label: "Pedágio", icon: Truck, color: "text-primary" },
  outros: { label: "Outros", icon: FileText, color: "text-muted-foreground" },
};

// Função para formatar nome de fazenda/local
const formatFazendaNome = (nome: string): string => {
  if (!nome) return "";
  // Remove tudo após " - " (ex: "Filial 1 - secagem" → "Filial 1")
  if (nome.includes(" - ")) {
    return nome.split(" - ")[0].trim();
  }
  // Se começar com "Fazenda", abrevia e pega apenas as palavras principais
  if (nome.toLowerCase().includes("fazenda")) {
    // "Fazenda Santa Rosa secagem" → "Faz Sta Rosa"
    const words = nome.split(" ");
    const nonSecagem = words.filter(w => !w.toLowerCase().includes("secagem")).slice(0, 3);
    if (nonSecagem[0].toLowerCase() === "fazenda") {
      nonSecagem[0] = "Faz";
    }
    return nonSecagem.join(" ").substring(0, 20);
  }
  return nome;
};

const getFreteCodeFallback = (freteId: unknown): string => {
  if (freteId === null || freteId === undefined) return "";
  const value = String(freteId).trim();
  if (!value) return "";
  return value.slice(0, 8).toUpperCase();
};

const normalizeFreteRef = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Função para renderizar frete no Select com novo formato
const formatFreteSelect = (frete: Frete): string => {
  const codigo = frete.codigo_frete || getFreteCodeFallback(frete.id);
  const favorecidoNome = frete.proprietario_nome || frete.motorista_nome || "";
  const motorista = favorecidoNome
    ? favorecidoNome.split(" ").slice(0, 2).join(" ")
    : "";
  const placa = frete.caminhao_placa || "";
  const destino = formatFazendaNome(frete.destino);
  return `${codigo} • ${motorista} • ${placa} • ${destino}`.trim();
};


export default function Custos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isRefreshing, startRefresh, endRefresh } = useRefreshData();

  // Query para listar custos
  const { data: custosResponse, isLoading } = useQuery<ApiResponse<Custo[]>>({
    queryKey: ["custos"],
    queryFn: () => custosService.fetchAllCustos(),
  });

  // Query para listar fretes (vinculo de custos)
  const { data: fretesResponse } = useQuery<ApiResponse<Frete[]>>({
    queryKey: ["fretes"],
    // Solicita um limite maior para garantir que a lista local de fretes
    // contenha a maioria dos registros e permita resolver o motorista/frete
    // associados aos lançamentos de custos.
    queryFn: () => fretesService.listarFretes({ page: 1, limit: 1000 }),
  });

  // Query para listar fretes PENDENTES (sem pagamento)
  const { data: fretesPendentesResponse } = useQuery<ApiResponse<Frete[]>>({
    queryKey: ["fretes", "pendentes"],
    queryFn: () => fretesService.listarFretesPendentes(),
  });

  const custos: Custo[] = custosResponse?.data || [];
  const fretes = fretesResponse?.data || [];
  const fretesPendentes = (() => {
    const rawData = fretesPendentesResponse?.data || [];
    // O backend retorna um array de agrupamentos por proprietario/motorista
    // Ex: { proprietario_id: X, fretes: [...] }
    return Array.isArray(rawData) ? rawData.flatMap((group: any) => group.fretes ? group.fretes : [group]) : [];
  })();

  const fretesDisponiveisParaCusto = (() => {
    const isSemPagamento = (item: Frete) => {
      const pagamentoId = (item as any)?.pagamento_id ?? (item as any)?.pagamentoId;
      return pagamentoId === null || pagamentoId === undefined || String(pagamentoId).trim() === "";
    };

    const isFreteValido = (item: Frete) =>
      !!item &&
      !!String(item.id || "").trim() &&
      !!(item.origem || item.destino || item.caminhao_placa || item.motorista_nome || item.proprietario_nome);

    const dedupeById = (items: Frete[]) => {
      const seen = new Set<string>();
      return items.filter((item) => {
        const id = String(item.id || "").trim();
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    };

    return dedupeById((fretesPendentes || []).filter((item) => isFreteValido(item) && isSemPagamento(item)));
  })();

  // Hook para filtro de período
  const {
    tipoVisualizacao,
    selectedPeriodo,
    periodosDisponiveis,
    dadosFiltrados: custosFiltrados,
    formatPeriodoLabel,
    setTipoVisualizacao,
    setSelectedPeriodo,
  } = usePeriodoFilter({
    data: custos,
    getDataField: (c) => c.data,
  });

  // Mutation para criar custo
  const createMutation = useMutation({
    mutationFn: custosService.criarCusto,
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["custos"] });
        toast.success("Custo cadastrado com sucesso!");
        setEditingCusto(null);
        setIsModalOpen(false);
        endRefresh();
      } else {
        toast.error(response.message || "Erro ao cadastrar custo");
        endRefresh();
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao cadastrar custo");
      endRefresh();
    },
  });

  // Mutation para atualizar custo
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CriarCustoPayload> }) =>
      custosService.atualizarCusto(id, data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["custos"] });
        toast.success("Custo atualizado com sucesso!");
        setEditingCusto(null);
        setIsModalOpen(false);
        endRefresh();
      } else {
        toast.error(response.message || "Erro ao atualizar custo");
        endRefresh();
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao atualizar custo");
      endRefresh();
    },
  });

  // Mutation para deletar custo
  const deleteMutation = useMutation({
    mutationFn: custosService.deletarCusto,
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["custos"] });
        toast.success("Custo removido com sucesso!");
        setIsDetailsOpen(false);
        setSelectedCusto(null);
        endRefresh();
      } else {
        toast.error(response.message || "Erro ao remover custo");
        endRefresh();
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao remover custo");
      endRefresh();
    },
  });

  const [search, setSearch] = useState("");
  const isSaving = createMutation.status === "pending" || updateMutation.status === "pending" || deleteMutation.status === "pending";
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [motoristaFilter, setMotoristaFilter] = useState<string>("all");
  const [comprovanteFilter, setComprovanteFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCusto, setEditingCusto] = useState<Custo | null>(null);
  const [selectedCusto, setSelectedCusto] = useState<Custo | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmDeleteCusto, setConfirmDeleteCusto] = useState<Custo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = ITEMS_PER_PAGE;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageCombustivel, setPageCombustivel] = useState(1);
  const [pageManutencao, setPageManutencao] = useState(1);
  const [pagePedagio, setPagePedagio] = useState(1);
  const [pageOutros, setPageOutros] = useState(1);

  // Estados do formulário
  const [formData, setFormData] = useState<Partial<CriarCustoPayload>>({
    frete_id: "",
    tipo: undefined,
    descricao: "",
    valor: undefined,
    data: "",
    comprovante: false,
    observacoes: "",
    litros: undefined,
    tipo_combustivel: undefined,
  });
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovanteError, setComprovanteError] = useState("");
  const comprovanteInputRef = useRef<HTMLInputElement | null>(null);
  type FormErrors = {
    frete_id: string;
    tipo: string;
    valor: string;
    data: string;
    litros: string;
    tipo_combustivel: string;
  };
  const initialFormErrors: FormErrors = {
    frete_id: "",
    tipo: "",
    valor: "",
    data: "",
    litros: "",
    tipo_combustivel: "",
  };
  const [formErrors, setFormErrors] = useState<FormErrors>(initialFormErrors);
  const resetFormErrors = () => setFormErrors(initialFormErrors);
  const clearFormError = (field: keyof FormErrors) => {
    setFormErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };
  const { isShaking, triggerShake } = useShake(220);

  const handleRowClick = (custo: Custo) => {
    setSelectedCusto(custo);
    setIsDetailsOpen(true);
  };

  const handleOpenNewModal = () => {
    setEditingCusto(null);
    resetFormErrors();
    setComprovanteFile(null);
    setComprovanteError("");
    setFormData({
      frete_id: "",
      tipo: undefined,
      descricao: "",
      valor: undefined,
      data: format(new Date(), "yyyy-MM-dd"),
      comprovante: false,
      observacoes: "",
      litros: undefined,
      tipo_combustivel: undefined,
    });
    setIsModalOpen(true);
  };

  // Abrir modal de edição quando rota /custos/editar/:id for acessada
  const custosParams = useParams();
  useEffect(() => {
    const idParam = custosParams.id;
    if (!idParam) return;
    if (!isLoading && custos.length > 0) {
      const found = custos.find((c) => String(c.id) === String(idParam));
      if (found) handleOpenEditModal(found);
    }
  }, [custosParams.id, isLoading, custos]);

  const handleOpenEditModal = (custo: Custo) => {
    setEditingCusto(custo);
    resetFormErrors();
    setComprovanteFile(null);
    setComprovanteError("");
    setFormData({
      frete_id: custo.frete_id,
      tipo: custo.tipo,
      descricao: custo.descricao,
      valor: custo.valor,
      data: custo.data,
      comprovante: !!custo.comprovante,
      observacoes: custo.observacoes || "",
      litros: custo.litros || undefined,
      tipo_combustivel: custo.tipo_combustivel || undefined,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (isSaving) return;
    const nextErrors: FormErrors = {
      frete_id: "",
      tipo: "",
      valor: "",
      data: "",
      litros: "",
      tipo_combustivel: "",
    };

    if (!formData.frete_id) nextErrors.frete_id = "Selecione o frete.";
    if (!formData.tipo) nextErrors.tipo = "Selecione o tipo de custo.";
    if (!formData.valor) nextErrors.valor = "Informe o valor.";
    if (!formData.data) nextErrors.data = "Selecione a data.";

    if (formData.tipo === "combustivel") {
      if (!formData.litros) nextErrors.litros = "Informe os litros abastecidos.";
      if (!formData.tipo_combustivel) nextErrors.tipo_combustivel = "Selecione o tipo de combustivel.";
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setFormErrors(nextErrors);
      triggerShake();
      return;
    }

    // Gerar descrição automática se não houver
    const descricaoAuto = formData.descricao ||
      (formData.tipo === "combustivel" ? `Abastecimento - ${formData.tipo_combustivel || 'combustível'}` :
        formData.tipo === "pedagio" ? "Pedágio" :
          formData.tipo === "manutencao" ? "Manutenção" :
            "Outros custos");

    const payload: CriarCustoPayload = {
      frete_id: formData.frete_id,
      tipo: formData.tipo,
      descricao: descricaoAuto.trim().toUpperCase(),
      valor: Number(formData.valor),
      data: formData.data,
      comprovante: !!formData.comprovante,
      observacoes: formData.observacoes ? formData.observacoes.trim().toUpperCase() : undefined,
      litros: formData.tipo === "combustivel" ? Number(formData.litros) : undefined,
      tipo_combustivel: formData.tipo === "combustivel" ? formData.tipo_combustivel : undefined,
    };

    if (editingCusto) {
      startRefresh();
      updateMutation.mutate({ id: editingCusto.id, data: payload });
    } else {
      startRefresh();
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (custo: Custo) => {
    setConfirmDeleteCusto(custo);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteCusto) return;
    startRefresh();
    deleteMutation.mutate(confirmDeleteCusto.id);
    setConfirmDeleteCusto(null);
  };

  const parseCustoDate = (value: string) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [ano, mes, dia] = value.split("-");
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
    if (value.includes("/")) {
      const [dia, mes, ano] = value.split("/");
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return null;
  };

  const formatCustoDate = (value: string) => {
    const parsed = parseCustoDate(value);
    return parsed ? format(parsed, "dd/MM/yyyy") : value;
  };

  const toNumber = (value: number | string | null | undefined) => {
    if (typeof value === "number") return value;
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (v: number | string | undefined) => {
    if (v === undefined || v === null || v === "") return "";
    const num = typeof v === "number" ? v : Number(v);
    if (Number.isNaN(num)) return "";
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const parseCurrency = (s: string) => {
    if (!s) return undefined;
    // Remove any currency symbol and spaces, keep digits, comma, dot and minus
    let t = s.replace(/[^0-9,\.-]/g, "").trim();
    if (!t) return undefined;
    // Remove thousand separators (.) and replace decimal comma with dot
    // If string contains both '.' and ',', assume '.' is thousand sep and ',' decimal
    if (t.indexOf(",") > -1 && t.indexOf(".") > -1) {
      t = t.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // If only commas present, treat comma as decimal separator
      if (t.indexOf(",") > -1 && t.indexOf(".") === -1) {
        t = t.replace(/,/g, ".");
      } else {
        // Only dots or only digits -> remove dots (they may be thousand seps)
        t = t.replace(/\./g, "");
      }
    }
    const n = Number(t);
    return Number.isNaN(n) ? undefined : n;
  };

  // Normalize strings (remove accents) to compare types robustly
  const normalizeString = (s: any) => {
    if (!s && s !== 0) return "";
    const str = String(s).toLowerCase();
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const getTipoKey = (tipo: any) => {
    const n = normalizeString(tipo);
    if (n.includes("combust")) return "combustivel";
    if (n.includes("manutenc")) return "manutencao";
    if (n.includes("pedag") || n.includes("pedagio") || n.includes("pedagios")) return "pedagio";
    return "outros";
  };

  // Input helper for valor to allow formatted typing
  const [valorInput, setValorInput] = useState<string>("");

  useEffect(() => {
    setValorInput(formatCurrency(formData.valor));
  }, [formData.valor]);

  // Limpar todos os filtros
  const clearFilters = () => {
    setSearch("");
    setTipoFilter("all");
    setMotoristaFilter("all");
    setComprovanteFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters =
    search !== "" ||
    tipoFilter !== "all" ||
    motoristaFilter !== "all" ||
    comprovanteFilter !== "all" ||
    dateFrom !== undefined ||
    dateTo !== undefined;

  // Lista única de motoristas usando dados do custo e do frete associado
  const motoristas = Array.from(
    new Set(
      custosFiltrados.map(c => {
        const related = fretes.find(f => isCustoFromFrete((c as any).frete_id, f.id, c.codigo_frete));
        const motoristaResultante = c.motorista || related?.motorista_nome || related?.proprietario_nome || "—";
        return motoristaResultante;
      }).filter(n => n && n !== "—")
    )
  ).sort();

  const filteredData = custosFiltrados.filter((custo) => {
    const related = fretes.find(f => isCustoFromFrete((custo as any).frete_id, f.id, custo.codigo_frete));
    const motoristaResultante = custo.motorista || related?.motorista_nome || related?.proprietario_nome || "—";
    const codigoFrete = custo.codigo_frete || related?.codigo_frete || getFreteCodeFallback(custo.frete_id);

    // Filtro de busca
    const q = search.toLowerCase();
    const matchesSearch =
      String(custo.frete_id || "").toLowerCase().includes(q) ||
      String(codigoFrete || "").toLowerCase().includes(q) ||
      String(custo.descricao || "").toLowerCase().includes(q) ||
      String(motoristaResultante).toLowerCase().includes(q);

    // Filtro de tipo
    const matchesTipo = tipoFilter === "all" || custo.tipo === tipoFilter;

    // Filtro de motorista
    const matchesMotorista = motoristaFilter === "all" || motoristaResultante === motoristaFilter;

    // Filtro de comprovante
    const matchesComprovante =
      comprovanteFilter === "all" ||
      (comprovanteFilter === "com" && custo.comprovante) ||
      (comprovanteFilter === "sem" && !custo.comprovante);

    // Filtro de data
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const custoDate = parseCustoDate(custo.data);
      if (!custoDate) {
        matchesDate = false;
      } else {
        if (dateFrom && custoDate < dateFrom) matchesDate = false;
        if (dateTo && custoDate > dateTo) matchesDate = false;
      }
    }

    return matchesSearch && matchesTipo && matchesMotorista && matchesComprovante && matchesDate;
  });

  // Categorize items for separate cards (robust to accents/variants)
  const combustivelItems = filteredData.filter((c) => getTipoKey(c.tipo) === "combustivel");
  const manutencaoItems = filteredData.filter((c) => getTipoKey(c.tipo) === "manutencao");
  const pedagioItems = filteredData.filter((c) => getTipoKey(c.tipo) === "pedagio");
  const outrosItems = filteredData.filter((c) => getTipoKey(c.tipo) === "outros");

  // Ordenar por ID para exibir os itens recém criados primeiro (ordem decrescente)
  const compareByNewestFirst = (a: Custo, b: Custo) => {
    const idA = Number(a.id);
    const idB = Number(b.id);

    // Se forem IDs sequenciais numéricos
    if (!isNaN(idA) && !isNaN(idB)) {
      if (idB !== idA) return idB - idA;
    }

    // Fallback para string (ex: UUIDs ou se não for um número válido)
    return String(b.id).localeCompare(String(a.id));
  };

  combustivelItems.sort(compareByNewestFirst);
  manutencaoItems.sort(compareByNewestFirst);
  pedagioItems.sort(compareByNewestFirst);
  outrosItems.sort(compareByNewestFirst);

  // Lógica de paginação
  // Lógica de paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedCombustivel = combustivelItems.slice((pageCombustivel - 1) * itemsPerPage, pageCombustivel * itemsPerPage);
  const paginatedManutencao = manutencaoItems.slice((pageManutencao - 1) * itemsPerPage, pageManutencao * itemsPerPage);
  const paginatedPedagio = pedagioItems.slice((pagePedagio - 1) * itemsPerPage, pagePedagio * itemsPerPage);
  const paginatedOutros = outrosItems.slice((pageOutros - 1) * itemsPerPage, pageOutros * itemsPerPage);

  const totalPagesCombustivel = Math.ceil(combustivelItems.length / itemsPerPage);
  const totalPagesManutencao = Math.ceil(manutencaoItems.length / itemsPerPage);
  const totalPagesPedagio = Math.ceil(pedagioItems.length / itemsPerPage);
  const totalPagesOutros = Math.ceil(outrosItems.length / itemsPerPage);

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
    setPageCombustivel(1);
    setPageManutencao(1);
    setPagePedagio(1);
    setPageOutros(1);
  }, [search, tipoFilter, motoristaFilter, comprovanteFilter, dateFrom, dateTo, tipoVisualizacao, selectedPeriodo]);

  const totalCustos = custosFiltrados.reduce((acc, c) => acc + toNumber(c.valor), 0);
  const totalCombustivel = combustivelItems.reduce((acc, c) => acc + toNumber(c.valor), 0);
  const totalManutencao = manutencaoItems.reduce((acc, c) => acc + toNumber(c.valor), 0);
  const totalPedagio = pedagioItems.reduce((acc, c) => acc + toNumber(c.valor), 0);

  const columns = [
    {
      key: "tipo",
      header: "Tipo",
      render: (item: Custo) => {
        const tipoKey = getTipoKey(item.tipo);
        const config = tipoConfig[tipoKey] || tipoConfig.outros;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg bg-muted", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-medium">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: "frete_id",
      header: "Frete",
      render: (item: Custo) => {
        const related = fretes.find((f) => isCustoFromFrete((item as any).frete_id, f.id, f.codigo_frete));
        const codigoFrete = item.codigo_frete || related?.codigo_frete || getFreteCodeFallback(item.frete_id);
        const motorista = item.motorista || related?.motorista_nome || "—";

        return (
          <div>
            <p className="font-mono text-sm text-primary">{codigoFrete || "—"}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{motorista}</p>
          </div>
        );
      },
    },
    {
      key: "descricao",
      header: "Descrição",
      render: (item: Custo) => (
        <div>
          <p className="font-medium">{item.descricao || <span className="text-muted-foreground italic">—</span>}</p>
        </div>
      ),
    },
    {
      key: "valor",
      header: "Valor",
      render: (item: Custo) => (
        <span className="font-bold text-lg text-loss">
          R$ {toNumber(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "data",
      header: "Data",
      render: (item: Custo) => (
        <span className="text-muted-foreground">{formatCustoDate(item.data)}</span>
      ),
    },
    {
      key: "comprovante",
      header: "Comprovante",
      render: (item: Custo) => (
        <Badge variant={item.comprovante ? "success" : "neutral"}>
          {item.comprovante ? "✓ Anexado" : "Pendente"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: Custo) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(item);
          }}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Ver
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <MainLayout title="Custos" subtitle="Gestão de custos operacionais">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Carregando custos...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const selectedFrete = selectedCusto
    ? fretes.find((frete) => isCustoFromFrete(selectedCusto.frete_id, frete.id, frete.codigo_frete))
    : null;

  const renderPaginationWidget = (
    currentPageValue: number,
    totalPagesValue: number,
    setPageFunc: React.Dispatch<React.SetStateAction<number>>,
    totalItems: number
  ) => {
    if (totalPagesValue <= 1) return null;
    return (
      <>
        {/* Mobile Pagination: Simple Prev/Next */}
        <div className="mt-4 md:hidden">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageFunc(Math.max(1, currentPageValue - 1))}
              disabled={currentPageValue === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground font-medium">
              {currentPageValue} / {totalPagesValue}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageFunc(Math.min(totalPagesValue, currentPageValue + 1))}
              disabled={currentPageValue === totalPagesValue}
            >
              Próxima
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {totalItems} registros
          </p>
        </div>

        {/* Desktop Pagination: Full */}
        <div className="mt-4 hidden md:flex items-center justify-center gap-4 pb-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPageFunc(Math.max(1, currentPageValue - 1));
                  }}
                  className={currentPageValue === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {Array.from({ length: totalPagesValue }, (_, i) => i + 1).map((page) => {
                const isCurrentPage = page === currentPageValue;
                const isVisible =
                  Math.abs(page - currentPageValue) <= 1 ||
                  page === 1 ||
                  page === totalPagesValue;

                if (!isVisible) {
                  return null;
                }

                if (page === 2 && currentPageValue > 3) {
                  return (
                    <PaginationItem key="ellipsis-start">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                if (
                  page === totalPagesValue - 1 &&
                  currentPageValue < totalPagesValue - 2
                ) {
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
                        setPageFunc(page);
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
                    setPageFunc(Math.min(totalPagesValue, currentPageValue + 1));
                  }}
                  className={
                    currentPageValue === totalPagesValue ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="text-xs text-muted-foreground flex items-center">
            Página {currentPageValue} de {totalPagesValue} • {totalItems} registros
          </div>
        </div>
      </>
    );
  };

  const selectedFreteCodigo = selectedCusto
    ? formatarCodigoFrete(
      selectedCusto.codigo_frete || selectedFrete?.codigo_frete || selectedCusto.frete_id,
      selectedFrete?.data_frete || selectedCusto.data
    )
    : "";

  const selectedFreteMotorista = selectedCusto
    ? selectedCusto.motorista || selectedFrete?.motorista_nome || "—"
    : "—";

  const selectedFreteCaminhao = selectedCusto
    ? selectedCusto.caminhao || selectedFrete?.caminhao_placa || "—"
    : "—";

  const selectedFreteRota = selectedCusto
    ? selectedCusto.rota || (selectedFrete?.origem && selectedFrete?.destino
      ? `${selectedFrete.origem} → ${selectedFrete.destino}`
      : "—")
    : "—";

  return (
    <MainLayout title="Custos" subtitle="Gestão de custos operacionais">
      <RefreshingIndicator isRefreshing={isRefreshing} />
      <PageHeader
        title="Custos"
        description="Controle de custos por frete e tipo"
        actions={
          <div className="hidden lg:flex items-center gap-3">
            <PeriodoFilter
              tipoVisualizacao={tipoVisualizacao}
              selectedPeriodo={selectedPeriodo}
              periodosDisponiveis={periodosDisponiveis}
              formatPeriodoLabel={formatPeriodoLabel}
              onTipoChange={setTipoVisualizacao}
              onPeriodoChange={setSelectedPeriodo}
            />
            <Button onClick={handleOpenNewModal}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Custo
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          label="Total de Custos"
          value={`R$ ${totalCustos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          variant="loss"
          icon={<DollarSign className="h-4 w-4 md:h-5 md:w-5 text-loss" />}
        />
        <StatCard
          label="Combustível"
          value={`R$ ${totalCombustivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          variant="warning"
          icon={<Fuel className="h-4 w-4 md:h-5 md:w-5 text-warning" />}
        />
        <StatCard
          label="Manutenção"
          value={`R$ ${totalManutencao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          variant="loss"
          icon={<Wrench className="h-4 w-4 md:h-5 md:w-5 text-loss" />}
        />
        <StatCard
          label="Pedágios"
          value={`R$ ${totalPedagio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          variant="primary"
          icon={<Truck className="h-4 w-4 md:h-5 md:w-5 text-primary" />}
        />
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
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filtros e Período</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <PeriodoFilter
                  tipoVisualizacao={tipoVisualizacao}
                  selectedPeriodo={selectedPeriodo}
                  periodosDisponiveis={periodosDisponiveis}
                  formatPeriodoLabel={formatPeriodoLabel}
                  onTipoChange={setTipoVisualizacao}
                  onPeriodoChange={setSelectedPeriodo}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Buscar</Label>
                <Input
                  placeholder="Frete, descrição ou motorista..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="combustivel">🛢️ Combustível</SelectItem>
                    <SelectItem value="manutencao">🔧 Manutenção</SelectItem>
                    <SelectItem value="pedagio">🛣️ Pedágio</SelectItem>
                    <SelectItem value="outros">📄 Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Motorista</Label>
                <Select value={motoristaFilter} onValueChange={setMotoristaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    <SelectItem value="all">Todos motoristas</SelectItem>
                    {motoristas.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Comprovante</Label>
                <Select value={comprovanteFilter} onValueChange={setComprovanteFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="com">✓ Com comprovante</SelectItem>
                    <SelectItem value="sem">✗ Sem comprovante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período (datas)</Label>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">De</Label>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      className="pointer-events-auto"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Até</Label>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
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

      {/* Filters Section */}
      <Card className="p-6 mb-6 hidden lg:block">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Filtros</h3>
            {hasActiveFilters && (
              <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">
                {filteredData.length} resultado{filteredData.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Busca */}
          <div className="lg:col-span-2">
            <Label className="text-xs text-muted-foreground mb-2 block">Buscar</Label>
            <Input
              placeholder="Frete, descrição ou motorista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tipo */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Tipo</Label>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="combustivel">🛢️ Combustível</SelectItem>
                <SelectItem value="manutencao">🔧 Manutenção</SelectItem>
                <SelectItem value="pedagio">🛣️ Pedágio</SelectItem>
                <SelectItem value="outros">📄 Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Motorista */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Motorista</Label>
            <Select value={motoristaFilter} onValueChange={setMotoristaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos motoristas</SelectItem>
                {motoristas.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comprovante */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Comprovante</Label>
            <Select value={comprovanteFilter} onValueChange={setComprovanteFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="com">✓ Com comprovante</SelectItem>
                <SelectItem value="sem">✗ Sem comprovante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Período */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom || dateTo
                    ? `${dateFrom ? format(dateFrom, "dd/MM") : "..."} - ${dateTo ? format(dateTo, "dd/MM") : "..."}`
                    : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">De</Label>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      className="pointer-events-auto"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Até</Label>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      {/* FAB: Novo Custo (Mobile) */}
      <Button
        onClick={handleOpenNewModal}
        className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg p-0"
        size="icon"
        aria-label="Novo Custo"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Separação por Categoria */}
      <div className="space-y-6">
        {/* Combustível */}
        {combustivelItems.length > 0 && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-b border-amber-300 dark:border-amber-800 px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950">
                    <Fuel className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Combustível</h3>
                    <p className="text-xs text-muted-foreground">
                      {combustivelItems.length} lançamento{combustivelItems.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    R$ {totalCombustivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <DataTable<Custo>
              columns={columns}
              data={paginatedCombustivel}
              onRowClick={handleRowClick}
              emptyMessage="Nenhum custo de combustível"
            />
            {renderPaginationWidget(pageCombustivel, totalPagesCombustivel, setPageCombustivel, combustivelItems.length)}
          </Card>
        )}

        {/* Manutenção */}
        {manutencaoItems.length > 0 && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-red-50/20 to-red-100/10 border-b border-red-200 px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-100">
                    <Wrench className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Manutenção</h3>
                    <p className="text-xs text-muted-foreground">
                      {manutencaoItems.length} lançamento{manutencaoItems.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-red-600">
                    R$ {totalManutencao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <DataTable<Custo>
              columns={columns}
              data={paginatedManutencao}
              onRowClick={handleRowClick}
              emptyMessage="Nenhum custo de manutenção"
            />
            {renderPaginationWidget(pageManutencao, totalPagesManutencao, setPageManutencao, manutencaoItems.length)}
          </Card>
        )}

        {/* Pedágios */}
        {pedagioItems.length > 0 && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-sky-50/20 to-sky-100/10 border-b border-sky-200 px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-100">
                    <Truck className="h-4 w-4 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Pedágios</h3>
                    <p className="text-xs text-muted-foreground">
                      {pedagioItems.length} lançamento{pedagioItems.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-sky-600">
                    R$ {totalPedagio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <DataTable<Custo>
              columns={columns}
              data={paginatedPedagio}
              onRowClick={handleRowClick}
              emptyMessage="Nenhum pedágio"
            />
            {renderPaginationWidget(pagePedagio, totalPagesPedagio, setPagePedagio, pedagioItems.length)}
          </Card>
        )}

        {/* Outros */}
        {outrosItems.length > 0 && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-slate-500/20 to-gray-500/10 border-b border-slate-300 dark:border-slate-800 px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900">
                    <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Outros</h3>
                    <p className="text-xs text-muted-foreground">
                      {outrosItems.length} lançamento{outrosItems.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                    R$ {outrosItems.reduce((acc, c) => acc + toNumber(c.valor), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <DataTable<Custo>
              columns={columns}
              data={paginatedOutros}
              onRowClick={handleRowClick}
              emptyMessage="Nenhum outro custo"
            />
            {renderPaginationWidget(pageOutros, totalPagesOutros, setPageOutros, outrosItems.length)}
          </Card>
        )}

        {/* Empty State */}
        {filteredData.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Nenhum custo encontrado</p>
              <p className="text-sm text-muted-foreground">
                Não há custos registrados ou os filtros não retornaram resultados
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Details Modal */}
      {selectedCusto && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                {(() => {
                  const config = tipoConfig[selectedCusto.tipo];
                  const Icon = config.icon;
                  return (
                    <>
                      <div className={cn("p-2 rounded-lg bg-muted", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      Detalhes do Custo
                    </>
                  );
                })()}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Header Info */}
              <Card className="p-4 bg-gradient-to-br from-muted/50 to-transparent">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {tipoConfig[selectedCusto.tipo].label}
                    </p>
                    <p className="text-3xl font-bold text-loss">
                      R$ {selectedCusto.valor.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge
                    variant={selectedCusto.comprovante ? "success" : "neutral"}
                    className="text-sm px-3 py-1"
                  >
                    {selectedCusto.comprovante ? (
                      <><FileCheck className="h-4 w-4 mr-1 inline" /> Comprovante Anexado</>
                    ) : (
                      "Sem Comprovante"
                    )}
                  </Badge>
                </div>
              </Card>

              <Separator />

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Frete */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Frete</span>
                  </div>
                  {selectedFrete ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailsOpen(false);
                        navigate("/fretes");
                      }}
                      className="font-mono font-bold text-primary text-lg underline underline-offset-4 hover:opacity-80 transition-opacity"
                    >
                      {selectedFreteCodigo || "—"}
                    </button>
                  ) : (
                    <p className="font-mono font-bold text-primary text-lg">
                      {selectedFreteCodigo || "—"}
                    </p>
                  )}
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Data</span>
                  </div>
                  <p className="font-semibold text-lg">{formatCustoDate(selectedCusto.data)}</p>
                </div>

                {/* Motorista */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Motorista</span>
                  </div>
                  <p className="font-semibold text-lg">{selectedFreteMotorista}</p>
                </div>

                {/* Caminhão */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span>Caminhão</span>
                  </div>
                  <p className="font-mono font-bold text-lg">{selectedFreteCaminhao}</p>
                </div>
              </div>

              <Separator />

              {/* Rota */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Rota</span>
                </div>
                <p className="font-semibold text-lg">{selectedFreteRota}</p>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                <Card className="p-4 bg-muted/30">
                  <p className="text-foreground">{selectedCusto.descricao}</p>
                </Card>
              </div>

              {/* Informações de Combustível */}
              {selectedCusto.tipo === "combustivel" && (selectedCusto.litros || selectedCusto.tipo_combustivel) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Fuel className="h-4 w-4" />
                    Informações do Abastecimento
                  </p>
                  <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedCusto.litros && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Litros Abastecidos</p>
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            {selectedCusto.litros}L
                          </p>
                        </div>
                      )}
                      {selectedCusto.tipo_combustivel && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Tipo de Combustível</p>
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            {selectedCusto.tipo_combustivel === "diesel" && "🚛 Diesel"}
                            {selectedCusto.tipo_combustivel === "gasolina" && "⛽ Gasolina"}
                            {selectedCusto.tipo_combustivel === "etanol" && "🌱 Etanol"}
                            {selectedCusto.tipo_combustivel === "gnv" && "💨 GNV"}
                          </p>
                        </div>
                      )}
                    </div>
                    {selectedCusto.litros && selectedCusto.valor && (
                      <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-800">
                        <p className="text-xs text-muted-foreground mb-1">Preço por Litro</p>
                        <p className="text-base font-semibold text-foreground">
                          R$ {(selectedCusto.valor / selectedCusto.litros).toFixed(2)}/L
                        </p>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* Observações */}
              {selectedCusto.observacoes && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Observações</p>
                  <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <p className="text-foreground">{selectedCusto.observacoes}</p>
                  </Card>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Fechar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailsOpen(false);
                  handleOpenEditModal(selectedCusto);
                }}
              >
                Editar
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(selectedCusto)}>
                Excluir
              </Button>
              <Button variant="default">
                <Upload className="h-4 w-4 mr-2" />
                Anexar Comprovante
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Cost Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (isSaving) return;
          setIsModalOpen(open);
          resetFormErrors();
        }}
      >
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto p-6 ${isShaking ? "animate-shake" : ""}`}>
          <DialogHeader>
            <DialogTitle>{editingCusto ? "Editar Custo" : "Novo Custo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="frete_id">Frete *</Label>
              <Select
                value={formData.frete_id ?? 'none'}
                onValueChange={(value) => {
                  setFormData({ ...formData, frete_id: value === 'none' ? "" : value });
                  clearFormError("frete_id");
                }}
                onOpenChange={(open) => {
                  if (open) clearFormError("frete_id");
                }}
              >
                <SelectTrigger className={cn(fieldErrorClass(formErrors.frete_id))}>
                  <SelectValue placeholder="Selecione o frete" />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {(editingCusto ? fretes : fretesDisponiveisParaCusto).length === 0 ? (
                    <SelectItem value="none" disabled>
                      {editingCusto ? "Nenhum frete disponível" : "Nenhum frete pendente de pagamento"}
                    </SelectItem>
                  ) : (
                    (editingCusto ? fretes : fretesDisponiveisParaCusto).map((frete) => (
                      <SelectItem key={frete.id} value={frete.id}>
                        {formatFreteSelect(frete)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FieldError message={formErrors.frete_id} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Custo *</Label>
              <Select
                value={formData.tipo || ""}
                onValueChange={(value) => {
                  setFormData({ ...formData, tipo: value as Custo["tipo"] });
                  clearFormError("tipo");
                  if (value !== "combustivel") {
                    clearFormError("litros");
                    clearFormError("tipo_combustivel");
                  }
                }}
                onOpenChange={(open) => {
                  if (open) clearFormError("tipo");
                }}
              >
                <SelectTrigger className={cn(fieldErrorClass(formErrors.tipo))}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combustivel">Combustível</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="pedagio">Pedágio</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={formErrors.tipo} />
            </div>

            {/* Campos específicos para Combustível */}
            {formData.tipo === "combustivel" && (
              <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Fuel className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">Informações do Abastecimento</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="litros">Litros Abastecidos *</Label>
                      <Input
                        id="litros"
                        type="number"
                        placeholder="Ex: 150"
                        value={formData.litros ?? ""}
                        onChange={(e) => {
                          setFormData({ ...formData, litros: Number(e.target.value) });
                          clearFormError("litros");
                        }}
                        onFocus={() => clearFormError("litros")}
                        className={cn(fieldErrorClass(formErrors.litros))}
                        step="0.01"
                      />
                      <FieldError message={formErrors.litros} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo_combustivel">Tipo de Combustível *</Label>
                      <Select
                        value={formData.tipo_combustivel || ""}
                        onValueChange={(value) => {
                          setFormData({ ...formData, tipo_combustivel: value as Custo["tipo_combustivel"] });
                          clearFormError("tipo_combustivel");
                        }}
                        onOpenChange={(open) => {
                          if (open) clearFormError("tipo_combustivel");
                        }}
                      >
                        <SelectTrigger className={cn(fieldErrorClass(formErrors.tipo_combustivel))}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="etanol">Etanol</SelectItem>
                          <SelectItem value="gnv">GNV</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError message={formErrors.tipo_combustivel} />
                    </div>
                  </div>

                  {formData.litros && formData.tipo_combustivel && (
                    <Card className="p-3 bg-white dark:bg-slate-950">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{formData.litros}L</span> de{' '}
                        <span className="font-semibold text-foreground">
                          {formData.tipo_combustivel === "diesel" && "Diesel"}
                          {formData.tipo_combustivel === "gasolina" && "Gasolina"}
                          {formData.tipo_combustivel === "etanol" && "Etanol"}
                          {formData.tipo_combustivel === "gnv" && "GNV"}
                        </span>
                      </p>
                    </Card>
                  )}
                </div>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  placeholder="R$ 0,00"
                  value={valorInput}
                  onChange={(e) => {
                    // digit-based mask: keep only digits
                    const digits = (e.target.value || "").replace(/\D/g, "");
                    if (!digits) {
                      setValorInput("");
                      setFormData({ ...formData, valor: undefined });
                      return;
                    }
                    // interpret last two digits as cents
                    const cents = parseInt(digits, 10);
                    const reais = cents / 100;
                    setFormData({ ...formData, valor: reais });
                    setValorInput(formatCurrency(reais));
                    clearFormError("valor");
                  }}
                  onBlur={() => {
                    // ensure formatted
                    setValorInput(formatCurrency(formData.valor));
                  }}
                  onFocus={() => {
                    // when focusing, show digits only for easier editing
                    if (formData.valor !== undefined && formData.valor !== null) {
                      // show numeric without currency formatting, using cents as integer
                      const cents = Math.round(Number(formData.valor) * 100);
                      setValorInput(String(cents));
                    } else {
                      setValorInput("");
                    }
                    clearFormError("valor");
                  }}
                  className={cn(fieldErrorClass(formErrors.valor))}
                />
                <FieldError message={formErrors.valor} />
              </div>
              <div className="space-y-2">
                <Label className="">Data *</Label>
                <DatePicker
                  value={parseCustoDate(formData.data) ?? undefined}
                  onChange={(date) => {
                    if (!date) return;
                    setFormData({ ...formData, data: format(date, "yyyy-MM-dd") });
                    clearFormError("data");
                  }}
                  onOpenChange={(open) => {
                    if (open) clearFormError("data");
                  }}
                  buttonClassName={cn(fieldErrorClass(formErrors.data))}
                />
                <FieldError message={formErrors.data} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações adicionais"
                value={formData.observacoes || ""}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Comprovante</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  ref={comprovanteInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) {
                      setComprovanteFile(null);
                      setComprovanteError("");
                      setFormData({ ...formData, comprovante: false });
                      return;
                    }

                    const maxBytes = 5 * 1024 * 1024;
                    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
                    if (!allowedTypes.includes(file.type)) {
                      toast.error("Formato inválido", {
                        description: "Envie PDF ou imagem (JPG, PNG, WEBP).",
                      });
                      setComprovanteFile(null);
                      setComprovanteError("Formato inválido. Use PDF ou imagem.");
                      setFormData({ ...formData, comprovante: false });
                      if (comprovanteInputRef.current) {
                        comprovanteInputRef.current.value = "";
                      }
                      return;
                    }

                    if (file.size > maxBytes) {
                      toast.error("Arquivo muito grande", {
                        description: "Tamanho máximo: 5 MB.",
                      });
                      setComprovanteFile(null);
                      setComprovanteError("Arquivo acima de 5 MB.");
                      setFormData({ ...formData, comprovante: false });
                      if (comprovanteInputRef.current) {
                        comprovanteInputRef.current.value = "";
                      }
                      return;
                    }

                    setComprovanteFile(file);
                    setComprovanteError("");
                    setFormData({ ...formData, comprovante: true });
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => comprovanteInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Anexar comprovante
                </Button>
                {comprovanteFile ? (
                  <Badge variant="success" className="text-xs">
                    <FileCheck className="h-3 w-3 mr-1 inline" /> {comprovanteFile.name}
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-xs">
                    Comprovante Pendente
                  </Badge>
                )}
                {comprovanteFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setComprovanteFile(null);
                      setComprovanteError("");
                      setFormData({ ...formData, comprovante: false });
                      if (comprovanteInputRef.current) {
                        comprovanteInputRef.current.value = "";
                      }
                    }}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <FieldError message={comprovanteError} />
            </div>
          </div>
          <DialogFooter>
            <ModalSubmitFooter
              onCancel={() => {
                setIsModalOpen(false);
                setEditingCusto(null);
                resetFormErrors();
              }}
              onSubmit={handleSave}
              isSubmitting={isSaving}
              disableSubmit={isSaving}
              submitLabel={editingCusto ? "Salvar Alterações" : "Cadastrar Custo"}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!confirmDeleteCusto}
        onOpenChange={(open) => { if (!open) setConfirmDeleteCusto(null); }}
        title="Excluir Custo"
        description={`Tem certeza que deseja excluir este custo? Essa ação não pode ser desfeita.`}
        confirmLabel="Sim, excluir"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </MainLayout>
  );
}
