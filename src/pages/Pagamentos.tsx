import { useShake } from "@/hooks/useShake";
import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodoFilter } from "@/components/shared/PeriodoFilter";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { ModalSubmitFooter } from "@/components/shared/ModalSubmitFooter";
import { FieldError, fieldErrorClass } from "@/components/shared/FieldError";
import { Badge } from "@/components/ui/badge";
import { PaymentSummaryCards } from "@/components/pagamentos/PaymentSummaryCards";
import { PagamentosTable } from "@/components/pagamentos/PagamentosTable";
import { PaymentDetailsDialog } from "@/components/pagamentos/PaymentDetailsDialog";
import { ComprovanteDialog } from "@/components/pagamentos/ComprovanteDialog";
import { PaymentFilters } from "@/components/pagamentos/PaymentFilters";
import { PagamentoFormModal } from "@/components/pagamentos/PagamentoFormModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
// Missing UI imports used across the component
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Icons
import {
  FileText,
  Clock,
  TrendingDown,
  TrendingUp,
  Check,
  Filter,
  FileDown,
  Plus,
  Edit,
  DollarSign,
  Calendar,
  Paperclip,
  Download,
  Eye,
  AlertCircle,
  X,
  Save,
} from "lucide-react";

// Utilities
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, shortName } from "@/lib/utils";
import { formatarCodigoFrete, formatarDocumento } from "@/utils/formatters";
import { toast } from "sonner";
import { ITEMS_PER_PAGE } from "@/lib/pagination";

// PDF helpers
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ApiResponse, Pagamento, Motorista, Frete, AtualizarPagamentoPayload, CriarPagamentoPayload, Fazenda, PagamentoMotorista } from "@/types";
import pagamentosService from "@/services/pagamentos";
import motoristasService from "@/services/motoristas";
import * as fretesService from "@/services/fretes";
import custosService from "@/services/custos";
import fazendasService from "@/services/fazendas";
import { exportarGuiaPagamentoIndividual, PagamentoPDFParams } from "@/utils/pdf/pagamentos-pdf";
import { usePeriodoFilter } from "@/hooks/usePeriodoFilter";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
// locale imported above
/*
 * 5. Ao salvar pagamento, os fretes selecionados são vinculados (recebem pagamentoId)
 * 6. Fretes pagos não aparecem mais na lista de disponíveis
 * 
 * INTEGRAÇÃO COM BANCO:
 * - Campo pagamentoId na tabela fretes (FK para pagamentos)
 * - Trigger atualiza pagamentoId nos fretes quando pagamento é criado
 * - Query: SELECT * FROM fretes WHERE motorista_id = ? AND pagamento_id IS NULL
 */

// Dados de motoristas carregados via API (ver `motoristasApi` e mapeamento abaixo)

// Dados de fretes carregados via API (ver `fretesApi` e mapeamento abaixo)

// Dados de custos adicionais para cada frete
interface CustoAdicional {
  freteId: string;
  valor: number;
  descricao: string;
}

// Pagamentos serão carregados via API (ver `pagamentosApi` e mapeamento acima)

const statusConfig = {
  pendente: { label: "Pendente", variant: "pending" as const },
  processando: { label: "Processando", variant: "inTransit" as const },
  pago: { label: "Pago", variant: "completed" as const },
  cancelado: { label: "Cancelado", variant: "cancelled" as const },
};

const getFavorecidoId = (item: { proprietario_id?: string | null; motorista_id?: string | null }) =>
  String(item.proprietario_id || item.motorista_id || "");

const getFavorecidoNome = (item: { proprietario_nome?: string | null; motorista_nome?: string | null }) =>
  String(item.proprietario_nome || item.motorista_nome || "Favorecido");

const parseFretesIncluidos = (value?: string | null): string[] =>
  value
    ? value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    : [];

const uniqueById = <T extends { id: string | number }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function Pagamentos() {
  const queryClient = useQueryClient();

  const { data: pagamentosResponse, isLoading: isLoadingPagamentos } = useQuery<ApiResponse<Pagamento[]>>({
    queryKey: ["pagamentos"],
    queryFn: () => pagamentosService.listarPagamentos(),
  });

  const { data: motoristasResponse } = useQuery<ApiResponse<Motorista[]>>({
    queryKey: ["motoristas"],
    queryFn: () => motoristasService.listarMotoristas(),
  });

  const { data: fretesResponse } = useQuery<ApiResponse<Frete[]>>({
    queryKey: ["fretes"],
    queryFn: () => fretesService.listarFretes({ page: 1, limit: 1000 }),
  });

  const { data: custosResponse } = useQuery<ApiResponse<any[]>>({
    queryKey: ["custos"],
    queryFn: () => custosService.listarCustos(),
  });

  const { data: fazendasResponse } = useQuery<ApiResponse<Fazenda[]>>({
    queryKey: ["fazendas"],
    queryFn: () => fazendasService.listarFazendas(),
  });

  const pagamentosApi: Pagamento[] = pagamentosResponse?.data || [];
  const motoristasApi: Motorista[] = motoristasResponse?.data || [];
  const fretesApi: Frete[] = fretesResponse?.data || [];
  const custosApi: any[] = custosResponse?.data || [];
  const fazendasApi: Fazenda[] = fazendasResponse?.data || [];

  const getFazendaCodigoByFrete = (frete: Frete) => {
    const byId = frete.fazenda_id
      ? fazendasApi.find((f) => String(f.id) === String(frete.fazenda_id))
      : undefined;
    if (byId?.codigo_fazenda) return byId.codigo_fazenda;

    const byNome = frete.fazenda_nome
      ? fazendasApi.find((f) => String(f.fazenda).toUpperCase() === String(frete.fazenda_nome).toUpperCase())
      : undefined;
    return byNome?.codigo_fazenda || "";
  };

  // Mapear custos da API para o formato usado no componente
  const custosAdicionaisData: CustoAdicional[] = useMemo(() => {
    return custosApi.map((custo) => ({
      freteId: String(custo.frete_id),
      valor: Number(custo.valor) || 0,
      descricao: custo.descricao || custo.tipo || "Custo adicional",
    }));
  }, [custosApi]);

  // Funções de formatação
  const formatDateBR = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, "dd/MM/yyyy", { locale: ptBR });
  };

  // Formata periodo_fretes removendo duplicação de datas (ex: "19-19/02/2026" → "19/02/2026")
  const formatPeriodoFretes = (periodo: string): string => {
    if (!periodo) return "";
    // Se tem padrão "DD-DD/MM/YYYY" onde os dois DDs são iguais, remover o primeiro
    const match = periodo.match(/^(\d{2})-(\d{2})\/(\d{2}\/\d{4})$/);
    if (match && match[1] === match[2]) {
      return `${match[2]}/${match[3]}`;
    }
    // Se tem padrão "DD-DD de ..." onde os dois DDs são iguais
    const match2 = periodo.match(/^(\d{2}) a (\d{2}) de (.+)$/);
    if (match2 && match2[1] === match2[2]) {
      return `${match2[2]} de ${match2[3]}`;
    }
    return periodo;
  };

  const toApiDate = (value: string) => {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = parse(value, "dd/MM/yyyy", new Date());
    return Number.isNaN(parsed.getTime()) ? value : format(parsed, "yyyy-MM-dd");
  };

  const parseBRDateToLocalDate = (value?: string) => {
    if (!value) return undefined;
    const [day, month, year] = String(value).split("/").map(Number);
    if (!day || !month || !year) return undefined;
    const localDate = new Date(year, month - 1, day);
    return Number.isNaN(localDate.getTime()) ? undefined : localDate;
  };

  // Hook para filtro de período
  const {
    tipoVisualizacao,
    selectedPeriodo,
    periodosDisponiveis,
    dadosFiltrados: pagamentosFiltrados,
    formatPeriodoLabel,
    setTipoVisualizacao,
    setSelectedPeriodo,
  } = usePeriodoFilter({
    data: pagamentosApi,
    getDataField: (p) => p.data_pagamento,
  });

  // Transformar dados filtrados para PagamentoMotorista
  const pagamentosFiltradosTransformados = useMemo(
    () =>
      pagamentosFiltrados.map((pagamento) => ({
        id: pagamento.codigo_pagamento || pagamento.id || "SEM-ID",
        motoristaId: getFavorecidoId(pagamento),
        motoristaNome: getFavorecidoNome(pagamento),
        tipoRelatorio: pagamento.tipo_relatorio || undefined,
        dataFrete: formatPeriodoFretes(pagamento.periodo_fretes),
        toneladas: Number(pagamento.total_toneladas) || 0,
        fretes: Number(pagamento.quantidade_fretes) || 0,
        valorUnitarioPorTonelada: Number(pagamento.valor_por_tonelada) || 0,
        valorTotal: Number(pagamento.valor_total) || 0,
        fretesSelecionados: parseFretesIncluidos(pagamento.fretes_incluidos),
        dataPagamento: formatDateBR(pagamento.data_pagamento),
        statusPagamento: pagamento.status,
        metodoPagamento: pagamento.metodo_pagamento,
        comprovante: pagamento.comprovante_nome
          ? {
            nome: pagamento.comprovante_nome,
            url: pagamento.comprovante_url || "",
            datadoUpload: pagamento.comprovante_data_upload || "",
          }
          : undefined,
        observacoes: pagamento.observacoes || undefined,
      })),
    [pagamentosFiltrados]
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [motoristaFilter, setMotoristaFilter] = useState<string>("all");
  const [selectedPagamento, setSelectedPagamento] = useState<PagamentoMotorista | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPagamento, setEditedPagamento] = useState<Partial<PagamentoMotorista>>({});
  const [dataPagamentoSelected, setDataPagamentoSelected] = useState<Date | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [selectedFileIsImage, setSelectedFileIsImage] = useState(false);
  const [selectedFileIsPdf, setSelectedFileIsPdf] = useState(false);
  const [comprovanteDialog, setComprovanteDialog] = useState<{
    url: string;
    nome: string;
    isImage: boolean;
    isPdf: boolean;
  } | null>(null);
  const [selectedFretes, setSelectedFretes] = useState<string[]>([]);
  const [isInternalCostConfirmed, setIsInternalCostConfirmed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = ITEMS_PER_PAGE;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [autoEmitirGuia, setAutoEmitirGuia] = useState(true);

  const getComprovanteUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
    if (!base) return url;
    const suffix = url.startsWith("/") ? url : `/${url}`;

    if (suffix.startsWith("/uploads/")) {
      try {
        const baseUrl = new URL(base);
        return `${baseUrl.origin}${suffix}`;
      } catch {
        // fallback padrão
      }
    }

    return `${base}${suffix}`;
  };

  const parseFileType = (urlOrName?: string) => {
    if (!urlOrName) return { isImage: false, isPdf: false };
    const clean = urlOrName.split("?")[0].split("#")[0].toLowerCase();
    return {
      isImage: /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(clean),
      isPdf: /\.pdf$/.test(clean),
    };
  };

  useEffect(() => {
    return () => {
      if (selectedFilePreview) {
        URL.revokeObjectURL(selectedFilePreview);
      }
    };
  }, [selectedFilePreview]);
  type FormErrors = {
    motoristaId: string;
    fretes: string;
  };
  const initialFormErrors: FormErrors = {
    motoristaId: "",
    fretes: "",
  };
  const [formErrors, setFormErrors] = useState<FormErrors>(initialFormErrors);
  const resetFormErrors = () => setFormErrors(initialFormErrors);
  const clearFormError = (field: keyof FormErrors) => {
    setFormErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };
  const { isShaking, triggerShake } = useShake(220);

  const clearFilters = () => {
    setSearch("");
    setMotoristaFilter("all");
    setStatusFilter("all");
  };

  const motoristas = useMemo(
    () =>
      uniqueById(
        motoristasApi.map((motorista) => ({
          id: motorista.id,
          nome: motorista.nome,
          documento: motorista.documento,
          tipo: motorista.tipo,
          tipoPagamento: motorista.tipo_pagamento || "pix",
          chavePixTipo: motorista.chave_pix_tipo,
          chavePix: motorista.chave_pix,
          banco: motorista.banco,
          agencia: motorista.agencia,
          conta: motorista.conta,
          tipoConta: motorista.tipo_conta,
        }))
      ),
    [motoristasApi]
  );

  const resolveMotoristaById = (id?: string | null) => {
    if (!id) return undefined;
    const idString = String(id);
    return (
      motoristas.find((m) => String(m.id) === idString) ||
      motoristasComPendentes.find((m) => String(m.id) === idString)
    );
  };

  const motoristaSelecionado = resolveMotoristaById(editedPagamento.motoristaId);
  const isInternalCostFlow = motoristaSelecionado?.tipo === "proprio";

  // Motoristas que possuem fretes pendentes (pagamento_id == null/0)
  const motoristasComPendentes = useMemo(() => {
    const pendentes = (fretesApi || []).filter(
      (f) => f.pagamento_id == null || String(f.pagamento_id) === "0"
    );
    const pendingIds = new Set(
      pendentes
        .map((f) => getFavorecidoId(f))
        .filter(Boolean)
    );

    const fromMotoristas = motoristasApi
      .filter((m) => pendingIds.has(m.id))
      .map((motorista) => ({
        id: motorista.id,
        nome: motorista.nome,
        documento: motorista.documento,
        tipo: motorista.tipo,
        tipoPagamento: motorista.tipo_pagamento || "pix",
        chavePixTipo: motorista.chave_pix_tipo,
        chavePix: motorista.chave_pix,
        banco: motorista.banco,
        agencia: motorista.agencia,
        conta: motorista.conta,
        tipoConta: motorista.tipo_conta,
      }));

    const existing = new Set(fromMotoristas.map((item) => item.id));
    const fromFretesFallback = pendentes
      .map((f) => ({ id: getFavorecidoId(f), nome: getFavorecidoNome(f), tipo: f.proprietario_tipo }))
      .filter((f) => f.id && !existing.has(f.id))
      .map((f) => ({
        id: f.id,
        nome: f.nome,
        documento: "",
        tipo: (f.tipo as Motorista["tipo"]) || "terceirizado",
        tipoPagamento: "pix" as const,
        chavePixTipo: undefined,
        chavePix: undefined,
        banco: undefined,
        agencia: undefined,
        conta: undefined,
        tipoConta: undefined,
      }));

    return uniqueById([...fromMotoristas, ...fromFretesFallback]);
  }, [motoristasApi, fretesApi]);

  const fretesData = useMemo(
    () =>
      fretesApi.map((frete, index) => ({
        id: String(frete.id),
        codigoFrete: formatarCodigoFrete(frete.codigo_frete || frete.id, frete.data_frete, index + 1),
        codigoFreteRaw: String(frete.codigo_frete || ""),
        motoristaId: getFavorecidoId(frete),
        motoristaNome: getFavorecidoNome(frete),
        proprietarioTipo: frete.proprietario_tipo,
        dataFrete: formatDateBR(frete.data_frete),
        rota: `${frete.origem} → ${frete.destino}`,
        toneladas: Number(frete.toneladas) || 0,
        valorGerado: Number(frete.receita ?? frete.toneladas * frete.valor_por_tonelada) || 0,
        pagamentoId: frete.pagamento_id ?? null,
      })),
    [fretesApi]
  );

  const normalizeFreteRef = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const resolveFreteByRef = (ref: string) => {
    const token = String(ref || "").trim();
    if (!token) return undefined;
    const tokenLower = token.toLowerCase();
    const tokenNorm = normalizeFreteRef(token);

    return fretesData.find((f) => {
      const id = String(f.id || "").trim().toLowerCase();
      const codigo = String(f.codigoFrete || "").trim().toLowerCase();
      const codigoRaw = String((f as any).codigoFreteRaw || "").trim().toLowerCase();

      if (id === tokenLower || codigo === tokenLower || codigoRaw === tokenLower) {
        return true;
      }

      const idNorm = normalizeFreteRef(id);
      const codigoNorm = normalizeFreteRef(codigo);
      const codigoRawNorm = normalizeFreteRef(codigoRaw);
      return idNorm === tokenNorm || codigoNorm === tokenNorm || codigoRawNorm === tokenNorm;
    });
  };

  const getCustosByFreteRef = (ref: string) => {
    const resolved = resolveFreteByRef(ref);
    const refs = new Set<string>([
      normalizeFreteRef(ref),
      normalizeFreteRef(resolved?.id),
      normalizeFreteRef(resolved?.codigoFrete),
      normalizeFreteRef((resolved as any)?.codigoFreteRaw),
    ]);

    refs.delete("");

    return custosAdicionaisData.filter((custo) => refs.has(normalizeFreteRef(custo.freteId)));
  };

  const getTotalCustosByFreteRef = (ref: string) =>
    getCustosByFreteRef(ref).reduce((sum, custo) => sum + custo.valor, 0);

  // Query pendentes por motorista (carrega apenas fretes com pagamento_id == null)
  const motoristaIdForPendentes = editedPagamento?.motoristaId || null;
  const usePendentesEndpoint = import.meta.env.VITE_USE_FRETES_PENDENTES_ENDPOINT === "true";
  const {
    data: fretesPendentesResponse,
  } = useQuery<ApiResponse<Frete[]>>({
    queryKey: ["fretes", "pendentes", motoristaIdForPendentes],
    queryFn: () =>
      fretesService.listarFretesPendentes({
        proprietarioId: String(motoristaIdForPendentes),
        motoristaId: String(motoristaIdForPendentes),
      }),
    enabled: usePendentesEndpoint && !!motoristaIdForPendentes,
    retry: 1,
  });

  const fretesPendentesData = useMemo(() => {
    const rawData = fretesPendentesResponse?.data || [];
    // O backend retorna um array de agrupamentos por proprietario/motorista
    // Ex: { proprietario_id: X, fretes: [...] }
    const flatFretes = Array.isArray(rawData) ? rawData.flatMap((group: any) => group.fretes ? group.fretes : [group]) : [];

    return flatFretes.map((frete: any, index: number) => ({
      id: String(frete.id),
      codigoFrete: formatarCodigoFrete(frete.codigo_frete || frete.id, frete.data_frete, index + 1),
      motoristaId: getFavorecidoId(frete),
      motoristaNome: getFavorecidoNome(frete),
      proprietarioTipo: frete.proprietario_tipo,
      dataFrete: formatDateBR(frete.data_frete),
      rota: `${frete.origem || ""} → ${frete.destino || ""}`,
      toneladas: Number(frete.toneladas) || 0,
      valorGerado: Number(frete.receita ?? frete.toneladas * frete.valor_por_tonelada) || 0,
      pagamentoId: frete.pagamento_id ?? null,
    }));
  }, [fretesPendentesResponse]);

  const pagamentosData = useMemo(
    () =>
      pagamentosApi.map((pagamento) => ({
        id: pagamento.codigo_pagamento || pagamento.id || "SEM-ID",
        motoristaId: getFavorecidoId(pagamento),
        motoristaNome: getFavorecidoNome(pagamento),
        tipoRelatorio: pagamento.tipo_relatorio || undefined,
        dataFrete: formatPeriodoFretes(pagamento.periodo_fretes),
        toneladas: pagamento.total_toneladas,
        fretes: Number(pagamento.quantidade_fretes) || 0,
        valorUnitarioPorTonelada: Number(pagamento.valor_por_tonelada) || 0,
        valorTotal: Number(pagamento.valor_total) || 0,
        fretesSelecionados: parseFretesIncluidos(pagamento.fretes_incluidos),
        dataPagamento: formatDateBR(pagamento.data_pagamento),
        statusPagamento: pagamento.status,
        metodoPagamento: pagamento.metodo_pagamento,
        comprovante: pagamento.comprovante_nome
          ? {
            nome: pagamento.comprovante_nome,
            url: pagamento.comprovante_url || "",
            datadoUpload: pagamento.comprovante_data_upload || "",
          }
          : undefined,
        observacoes: pagamento.observacoes || undefined,
      })),
    [pagamentosApi]
  );

  // Dados históricos para comparação (simulado - mes anterior)
  const dadosMesAnterior = {
    periodo: "2025-12",
    totalPago: 21500, // Dezembro 2025 pagou R$ 21.500
    totalMotoristas: 4,
  };

  const uploadComprovanteIfNeeded = async (pagamentoId: string) => {
    if (isInternalCostFlow) return true;
    if (!selectedFile || !pagamentoId) return true;

    const uploadResponse = await pagamentosService.uploadComprovante(String(pagamentoId), selectedFile);
    if (!uploadResponse.success) {
      toast.error(uploadResponse.message || "Pagamento salvo, mas falhou o upload do comprovante.");
      return false;
    }

    return true;
  };

  const createMutation = useMutation({
    mutationFn: pagamentosService.criarPagamento,
    onSuccess: async (response) => {
      if (response.success) {
        const createdId = String((response as any)?.data?.id || "");
        await uploadComprovanteIfNeeded(createdId);
        const tipoRelatorio = String((response as any)?.data?.tipo_relatorio || "");

        const guiaPayload = {
          pagamentoId: createdId || `PG-${Date.now()}`,
          motoristaId: String(editedPagamento.motoristaId || ""),
          motoristaNome: String(
            editedPagamento.motoristaNome ||
            motoristas.find((m) => m.id === editedPagamento.motoristaId)?.nome ||
            "Favorecido"
          ),
          metodoPagamento: (editedPagamento.metodoPagamento || "pix") as "pix" | "transferencia_bancaria",
          dataPagamento: String(editedPagamento.dataPagamento || format(new Date(), "dd/MM/yyyy", { locale: ptBR })),
          freteIds: selectedFretes.map((id) => String(id).trim()).filter(Boolean),
          totalToneladas: Number(editedPagamento.toneladas || 0),
          valorTonelada: Number(editedPagamento.valorUnitarioPorTonelada || 0),
          valorTotal: Number(editedPagamento.valorTotal || 0),
          tipoRelatorio: (tipoRelatorio || (isInternalCostFlow ? "GUIA_INTERNA" : "PAGAMENTO_TERCEIRO")) as "GUIA_INTERNA" | "PAGAMENTO_TERCEIRO",
        };

        queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
        // refresh fretes pendentes for current motorista and full fretes list
        if (usePendentesEndpoint && motoristaIdForPendentes) {
          queryClient.invalidateQueries({ queryKey: ["fretes", "pendentes", motoristaIdForPendentes] });
        }
        queryClient.invalidateQueries({ queryKey: ["fretes"] });
        const isGuiaInterna = guiaPayload.tipoRelatorio === "GUIA_INTERNA";
        if (isGuiaInterna) {
          if (autoEmitirGuia) handleExportarPDF(guiaPayload);
          toast.success("Fechamento de custo interno confirmado e salvo.");
        } else {
          if (autoEmitirGuia) {
            handleExportarPDF(guiaPayload);
            toast.success("Pagamento registrado e guia emitida com sucesso!");
          } else {
            toast.success("Pagamento registrado com sucesso!");
          }
        }
        setIsModalOpen(false);
        setSelectedFretes([]);
        setIsInternalCostConfirmed(false);
        setIsSaving(false);
      } else {
        toast.error(response.message || "Erro ao criar pagamento");
        setIsSaving(false);
      }
    },
    onError: (error: any) => {
      const isNetwork = !error?.response;
      const msg = isNetwork ? "Erro de rede, tente novamente" : (error?.response?.data?.message || error?.message || "Erro ao criar pagamento");
      toast.error(msg);
      setIsSaving(false);
      setIsInternalCostConfirmed(false);
      // If backend indicates some fretes already paid, refresh pending list to sync UI
      if (String(msg).toLowerCase().includes("alguns fretes ja") || String(msg).toLowerCase().includes("alguns fretes já") || String(msg).toLowerCase().includes("já estão pagos")) {
        if (usePendentesEndpoint && motoristaIdForPendentes) {
          queryClient.invalidateQueries({ queryKey: ["fretes", "pendentes", motoristaIdForPendentes] });
        }
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarPagamentoPayload }) =>
      pagamentosService.atualizarPagamento(id, data),
    onSuccess: async (response) => {
      if (response.success) {
        await uploadComprovanteIfNeeded(String(editedPagamento.id || ""));
        queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
        if (usePendentesEndpoint && motoristaIdForPendentes) {
          queryClient.invalidateQueries({ queryKey: ["fretes", "pendentes", motoristaIdForPendentes] });
        }
        queryClient.invalidateQueries({ queryKey: ["fretes"] });
        if (autoEmitirGuia) {
          // Precisamos remontoar o payload para a edição (simplificado p/ PDF)
          const isGuiaInterna = isInternalCostFlow;
          handleExportarPDF({
            pagamentoId: String(editedPagamento.id || ""),
            motoristaId: String(editedPagamento.motoristaId || ""),
            motoristaNome: String(editedPagamento.motoristaNome || motoristaSelecionado?.nome || "Favorecido"),
            metodoPagamento: (editedPagamento.metodoPagamento || "pix") as "pix" | "transferencia_bancaria",
            dataPagamento: String(editedPagamento.dataPagamento || ""),
            freteIds: selectedFretes.map((id) => String(id).trim()).filter(Boolean),
            totalToneladas: Number(editedPagamento.toneladas || 0),
            valorTonelada: Number(editedPagamento.valorUnitarioPorTonelada || 0),
            valorTotal: Number(editedPagamento.valorTotal || 0),
            tipoRelatorio: isGuiaInterna ? "GUIA_INTERNA" : "PAGAMENTO_TERCEIRO",
          });
          toast.success("Pagamento atualizado e guia reemitida!");
        } else {
          toast.success("Pagamento atualizado com sucesso!");
        }
        setIsModalOpen(false);
        setIsSaving(false);
      } else {
        toast.error(response.message || "Erro ao atualizar pagamento");
        setIsSaving(false);
      }
    },
    onError: (error: any) => {
      const isNetwork = !error?.response;
      const msg = isNetwork ? "Erro de rede, tente novamente" : (error?.response?.data?.message || error?.message || "Erro ao atualizar pagamento");
      toast.error(msg);
      setIsSaving(false);
      if (String(msg).toLowerCase().includes("alguns fretes ja") || String(msg).toLowerCase().includes("alguns fretes já") || String(msg).toLowerCase().includes("já estão pagos")) {
        if (usePendentesEndpoint && motoristaIdForPendentes) {
          queryClient.invalidateQueries({ queryKey: ["fretes", "pendentes", motoristaIdForPendentes] });
        }
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: pagamentosService.deletarPagamento,
    onSuccess: async (response) => {
      if (response.success) {
        // If we have fretes remembered, clear their pagamento_id on the backend
        const fretesToUnlink = fretesToUnlinkRef.current || [];
        if (fretesToUnlink.length > 0) {
          try {
            await Promise.all(
              fretesToUnlink.map((fid) =>
                fretesService.atualizarFrete(String(fid), { pagamento_id: null }).catch((e) => {
                  console.error("Erro ao desassociar frete após exclusão de pagamento", fid, e);
                })
              )
            );
          } catch (e) {
            console.error("Erro ao desassociar alguns fretes após exclusão de pagamento", e);
          }
          fretesToUnlinkRef.current = [];
        }

        queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
        if (usePendentesEndpoint && motoristaIdForPendentes) {
          queryClient.invalidateQueries({ queryKey: ["fretes", "pendentes", motoristaIdForPendentes] });
        }
        queryClient.invalidateQueries({ queryKey: ["fretes"] });

        toast.success("Pagamento excluído com sucesso!");
        setSelectedPagamento(null);
      } else {
        toast.error(response.message || "Erro ao excluir pagamento");
      }
    },
    onError: (error: any) => {
      const isNetwork = !error?.response;
      const msg = isNetwork ? "Erro de rede, tente novamente" : (error?.response?.data?.message || error?.message || "Erro ao excluir pagamento");
      toast.error(msg);
    },
  });

  const [confirmDeletePagamento, setConfirmDeletePagamento] = useState<PagamentoMotorista | null>(null);
  const fretesToUnlinkRef = useRef<string[]>([]);

  const handleDeletePagamento = (pagamento: PagamentoMotorista) => {
    setConfirmDeletePagamento(pagamento);
  };

  const handleConfirmDeletePagamento = () => {
    if (!confirmDeletePagamento) return;
    // remember fretes to unlink in DB after deletion
    fretesToUnlinkRef.current = (confirmDeletePagamento.fretesSelecionados || []).map((f: any) => String(f));
    deleteMutation.mutate(String(confirmDeletePagamento.id));
    setConfirmDeletePagamento(null);
  };

  const handleOpenNewModal = () => {
    resetFormErrors();
    setEditedPagamento({
      motoristaId: "",
      motoristaNome: "",
      dataFrete: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
      toneladas: 0,
      fretes: 0,
      valorUnitarioPorTonelada: 150,
      valorTotal: 0,
      fretesSelecionados: [],
      dataPagamento: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
      statusPagamento: "pendente",
      observacoes: "",
    });
    setSelectedFile(null);
    if (selectedFilePreview) {
      URL.revokeObjectURL(selectedFilePreview);
    }
    setSelectedFilePreview(null);
    setSelectedFileIsImage(false);
    setSelectedFileIsPdf(false);
    setSelectedFretes([]);
    setIsInternalCostConfirmed(false);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pagamento: PagamentoMotorista) => {
    resetFormErrors();
    setEditedPagamento(pagamento);
    // Normalize frete references (could be codes) to actual frete IDs present in `fretesData`
    const rawRefs = pagamento.fretesSelecionados || [];
    const normalized = rawRefs
      .map((ref) => {
        const resolved = resolveFreteByRef(ref);
        return resolved ? String(resolved.id) : String(ref || "");
      })
      .filter((v) => v);
    setSelectedFretes(normalized);
    setSelectedFile(null);
    if (selectedFilePreview) {
      URL.revokeObjectURL(selectedFilePreview);
    }
    setSelectedFilePreview(null);
    setSelectedFileIsImage(false);
    setSelectedFileIsPdf(false);
    setIsInternalCostConfirmed(false);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Abrir modal de edição quando rota /pagamentos/editar/:id for acessada
  const pagamentosParams = useParams();
  useEffect(() => {
    const idParam = pagamentosParams.id;
    if (!idParam) return;
    if (!isLoadingPagamentos && pagamentosApi.length > 0) {
      const found = pagamentosApi.find((p) => String(p.id) === String(idParam));
      if (found) handleOpenEditModal(found as unknown as PagamentoMotorista);
    }
  }, [pagamentosParams.id, isLoadingPagamentos, pagamentosApi]);

  const handleMotoristaChange = (motoristaId: string) => {
    // Handle clearing selection (placeholder uses 'none')
    if (motoristaId === "none" || motoristaId === "") {
      setSelectedFretes([]);
      clearFormError("motoristaId");
      clearFormError("fretes");
      setEditedPagamento({
        ...editedPagamento,
        motoristaId: "",
        motoristaNome: "",
        toneladas: 0,
        fretes: 0,
        valorTotal: 0,
        fretesSelecionados: [],
        metodoPagamento: undefined,
      });
      setIsInternalCostConfirmed(false);
      return;
    }

    const motorista =
      motoristas.find((m) => m.id === motoristaId) ||
      motoristasComPendentes.find((m) => m.id === motoristaId);
    setSelectedFretes([]);
    clearFormError("motoristaId");
    clearFormError("fretes");
    setEditedPagamento({
      ...editedPagamento,
      motoristaId,
      motoristaNome: motorista?.nome || "",
      toneladas: 0,
      fretes: 0,
      valorTotal: 0,
      fretesSelecionados: [],
      metodoPagamento: motorista?.tipoPagamento || "pix",
    });
    setIsInternalCostConfirmed(false);
  };

  // Buscar fretes não pagos do motorista selecionado
  const fretesNaoPagos = useMemo(() => {
    // prefer pendentes endpoint result; fallback to full list filter
    if (!editedPagamento?.motoristaId) return [];
    if (usePendentesEndpoint && fretesPendentesData && fretesPendentesData.length > 0) {
      const pendentes = fretesPendentesData;
      const pendentesIds = new Set(pendentes.map((p) => String(p.id)));
      const fallback = fretesData.filter(
        (f) =>
          f.motoristaId === editedPagamento.motoristaId &&
          (f.pagamentoId == null || String(f.pagamentoId) === "0") &&
          !pendentesIds.has(String(f.id))
      );
      return uniqueById([...pendentes, ...fallback]);
    }

    return fretesData.filter(
      (f) =>
        f.motoristaId === editedPagamento.motoristaId &&
        (f.pagamentoId == null || String(f.pagamentoId) === "0")
    );
  }, [editedPagamento?.motoristaId, usePendentesEndpoint, fretesPendentesData, fretesData]);

  const fretesRefs = (isEditing
    ? editedPagamento?.fretesSelecionados
    : selectedPagamento?.fretesSelecionados) || [];
  const fretesDoPagamento = fretesRefs
    .map((ref) => resolveFreteByRef(ref))
    .filter((frete): frete is NonNullable<typeof frete> => !!frete)
    .filter((frete, index, array) => array.findIndex((item) => item.id === frete.id) === index);

  const fretesDisponiveis = isEditing ? fretesDoPagamento : fretesNaoPagos;

  const handleToggleFrete = (freteId: string) => {
    if (isEditing) return;
    // prefer pending fretes list, fallback to full fretesData
    const frete =
      (usePendentesEndpoint ? fretesPendentesData.find((f) => f.id === freteId) : undefined) ||
      fretesData.find((f) => f.id === freteId);
    if (!frete) return;

    // If frete is already linked to a payment different from current edited payment, block selection
    if (frete.pagamentoId && frete.pagamentoId !== (editedPagamento?.id ?? null)) {
      toast.error("Este frete já foi pago e não pode ser selecionado.");
      return;
    }

    const isSelected = selectedFretes.includes(freteId);
    const nextSelected = isSelected
      ? selectedFretes.filter((id) => id !== freteId)
      : [...selectedFretes, freteId];

    const fretesSelecionados = fretesData.filter((f) => nextSelected.includes(f.id));
    const toneladas = fretesSelecionados.reduce((acc, f) => acc + f.toneladas, 0);
    const valorBruto = fretesSelecionados.reduce((acc, f) => acc + f.valorGerado, 0);
    const custosTotais = nextSelected.reduce(
      (acc, freteId) => acc + getTotalCustosByFreteRef(freteId),
      0
    );
    const valorTotal = valorBruto - custosTotais;
    const dataFrete = fretesSelecionados.map((f) => f.dataFrete).join(", ");
    const valorUnitario = toneladas > 0 ? valorTotal / toneladas : 0;

    setSelectedFretes(nextSelected);
    if (nextSelected.length > 0) {
      clearFormError("fretes");
    }
    setEditedPagamento({
      ...editedPagamento,
      toneladas,
      fretes: fretesSelecionados.length,
      valorTotal,
      dataFrete: dataFrete || format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
      valorUnitarioPorTonelada: Number(valorUnitario.toFixed(2)),
      fretesSelecionados: nextSelected,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato inválido", { description: "Use PDF ou imagem (JPG, PNG, WEBP)." });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máximo 5MB)");
        return;
      }
      if (selectedFilePreview) {
        URL.revokeObjectURL(selectedFilePreview);
      }
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      setSelectedFileIsImage(isImage);
      setSelectedFileIsPdf(isPdf);
      setSelectedFilePreview(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  const metodoPagamentoAtual = isInternalCostFlow
    ? "pix"
    : (motoristaSelecionado?.tipoPagamento || editedPagamento.metodoPagamento || "pix");

  const buildPeriodoFretes = (freteIds: string[]) => {
    const datas = freteIds
      .map((id) => fretesData.find((f) => f.id === id)?.dataFrete)
      .filter((value): value is string => !!value)
      .map((value) => parse(value, "dd/MM/yyyy", new Date()))
      .filter((value) => !Number.isNaN(value.getTime()));

    if (datas.length === 0) return "";

    const sorted = datas.sort((a, b) => a.getTime() - b.getTime());
    const inicio = sorted[0];
    const fim = sorted[sorted.length - 1];

    const mesmoMes = inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear();

    // Se é o mesmo dia, mostrar apenas uma data
    if (inicio.getDate() === fim.getDate() && mesmoMes) {
      return format(inicio, "dd/MM/yyyy");
    }

    if (mesmoMes) {
      return `${format(inicio, "dd")} a ${format(fim, "dd")} de ${format(inicio, "MMMM/yyyy", { locale: ptBR })}`;
    }

    return `${format(inicio, "dd/MM/yyyy")} a ${format(fim, "dd/MM/yyyy")}`;
  };

  const getDadosPagamentoMotorista = (
    motoristaId: string,
    metodoFallback?: "pix" | "transferencia_bancaria"
  ) => {
    const motorista = motoristas.find((m) => String(m.id) === String(motoristaId));
    const metodo = motorista?.tipoPagamento || metodoFallback || "pix";

    if (metodo === "pix") {
      const tipoChave = motorista?.chavePixTipo
        ? String(motorista.chavePixTipo).toUpperCase()
        : "N/I";
      const rawChave = motorista?.chavePix || "Chave PIX não cadastrada";
      const chave = (tipoChave === "CNPJ" || tipoChave === "CPF")
        ? formatarDocumento(rawChave)
        : rawChave;
      return {
        metodoLabel: "PIX",
        dadosLabel: `Tipo: ${tipoChave} | Chave: ${chave}`,
      };
    }

    const banco = motorista?.banco || "Banco não informado";
    const agencia = motorista?.agencia || "N/I";
    const conta = motorista?.conta || "N/I";
    const tipoConta = motorista?.tipoConta === "corrente"
      ? "Corrente"
      : motorista?.tipoConta === "poupanca"
        ? "Poupança"
        : "N/I";

    return {
      metodoLabel: "Transferência Bancária",
      dadosLabel: `Banco: ${banco} | Agência: ${agencia} | Conta: ${conta} | Tipo: ${tipoConta}`,
    };
  };

  const handleExportarPDF = (params: {
    pagamentoId: string;
    motoristaId: string;
    motoristaNome: string;
    metodoPagamento: "pix" | "transferencia_bancaria";
    dataPagamento: string;
    freteIds: string[];
    totalToneladas: number;
    valorTonelada: number;
    valorTotal: number;
    tipoRelatorio?: "GUIA_INTERNA" | "PAGAMENTO_TERCEIRO";
  }) => {
    const dadosPagamento = getDadosPagamentoMotorista(params.motoristaId, params.metodoPagamento);
    const motoristaRef = motoristasApi.find(m => String(m.id) === String(params.motoristaId));
    const motoristaDocumento = motoristaRef?.documento ? formatarDocumento(motoristaRef.documento) : "";
    const normalizeRef = (value: string) =>
      String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    const resolveFreteByRef = (ref: string) => {
      const token = String(ref || "").trim();
      if (!token) return undefined;
      const tokenLower = token.toLowerCase();
      const tokenNorm = normalizeRef(token);
      return fretesData.find((f) => {
        const id = String(f.id || "").trim().toLowerCase();
        const codigo = String(f.codigoFrete || "").trim().toLowerCase();
        const codigoRaw = String((f as any).codigoFreteRaw || "").trim().toLowerCase();
        if (id === tokenLower || codigo === tokenLower || codigoRaw === tokenLower) return true;
        const idNorm = normalizeRef(id);
        const codigoNorm = normalizeRef(codigo);
        const codigoRawNorm = normalizeRef(codigoRaw);
        return idNorm === tokenNorm || codigoNorm === tokenNorm || codigoRawNorm === tokenNorm;
      });
    };

    const fretesSelecionados = params.freteIds
      .map((ref) => resolveFreteByRef(ref))
      .filter((frete): frete is NonNullable<typeof frete> => !!frete)
      .filter((frete, index, array) => array.findIndex((item) => item.id === frete.id) === index);

    const fretesParam = fretesSelecionados.map(frete => {
      const custosFrete = getTotalCustosByFreteRef(frete.id);
      const custosDetalhados = getCustosByFreteRef(frete.id).map(c => ({ descricao: c.descricao, valor: c.valor }));
      return {
        id: String(frete.id),
        codigo: String(frete.codigoFrete || frete.id),
        dataFrete: String(frete.dataFrete || ""),
        rota: String(frete.rota || ""),
        toneladas: Number(frete.toneladas || 0),
        valorGerado: Number(frete.valorGerado || 0),
        custosTotal: custosFrete,
        valorLiquido: Number(frete.valorGerado || 0) - custosFrete,
        custos: custosDetalhados
      };
    });

    const totalCustos = fretesParam.reduce((acc, f) => acc + f.custosTotal, 0);
    const valorGeradoBruto = fretesParam.reduce((acc, f) => acc + f.valorGerado, 0);

    const pdfParams: PagamentoPDFParams = {
      pagamentoId: params.pagamentoId,
      motoristaNome: params.motoristaNome,
      motoristaDocumento,
      tipoRelatorio: params.tipoRelatorio,
      fretes: fretesParam,
      totalToneladas: Number(params.totalToneladas) || 0,
      valorGeradoBruto,
      totalCustos,
      valorAPagar: valorGeradoBruto - totalCustos,
      dadosPagamento: {
        metodoLabel: dadosPagamento.metodoLabel,
        dadosLabel: dadosPagamento.dadosLabel
      }
    };

    exportarGuiaPagamentoIndividual(pdfParams);
  };

  const handleSave = () => {
    // prevent double-submit
    const isMutationPending = createMutation.status === "pending" || updateMutation.status === "pending";
    if (isMutationPending) return;
    setIsSaving(true);

    const nextErrors: FormErrors = { motoristaId: "", fretes: "" };
    if (!editedPagamento.motoristaId) {
      nextErrors.motoristaId = "Selecione um proprietário/favorecido.";
    }
    if (selectedFretes.length === 0) {
      nextErrors.fretes = "Selecione ao menos um frete.";
    }
    if (nextErrors.motoristaId || nextErrors.fretes) {
      setFormErrors(nextErrors);
      triggerShake();
      setIsSaving(false);
      return;
    }

    if (isInternalCostFlow && !isInternalCostConfirmed) {
      toast.error("Confirme o fechamento de custo interno para continuar.");
      setIsSaving(false);
      return;
    }

    // Validate that selected fretes are not already linked to another payment
    // If we're editing and the selection hasn't changed compared to the original fretes of the payment,
    // skip the conflict validation (user is only editing metadata/status).
    const originalSelectedIds = fretesDoPagamento.map((f) => String(f.id));
    const selectionsEqual =
      originalSelectedIds.length === selectedFretes.length &&
      originalSelectedIds.every((id) => selectedFretes.includes(id));

    if (!isEditing || !selectionsEqual) {
      const conflicting = selectedFretes.find((id) => {
        const f = fretesData.find((ff) => ff.id === id);
        if (!f) return false;
        // allow if editing and the frete is linked to the same payment being edited
        if (f.pagamentoId && isEditing && editedPagamento?.id && String(f.pagamentoId) === String(editedPagamento.id)) return false;
        return !!f.pagamentoId;
      });

      if (conflicting) {
        toast.error("Um ou mais fretes selecionados já estão vinculados a outro pagamento.");
        // refresh pendentes to sync UI
        if (usePendentesEndpoint && motoristaIdForPendentes) queryClient.invalidateQueries({ queryKey: ["fretes", "pendentes", motoristaIdForPendentes] });
        setIsSaving(false);
        return;
      }
    }

    const nomeFavorecidoResolvido = (
      editedPagamento.motoristaNome ||
      motoristasComPendentes.find((m) => m.id === editedPagamento.motoristaId)?.nome ||
      fretesNaoPagos.find((f) => f.motoristaId === editedPagamento.motoristaId)?.motoristaNome ||
      ""
    ).trim();

    if (!nomeFavorecidoResolvido) {
      toast.error("Não foi possível identificar o nome do favorecido para este pagamento.");
      setIsSaving(false);
      return;
    }

    const payload: CriarPagamentoPayload = {
      motorista_id: editedPagamento.motoristaId,
      motorista_nome: nomeFavorecidoResolvido.toUpperCase(),
      proprietario_id: editedPagamento.motoristaId,
      proprietario_nome: nomeFavorecidoResolvido.toUpperCase(),
      periodo_fretes: (buildPeriodoFretes(selectedFretes) || editedPagamento.dataFrete || "").trim().toUpperCase(),
      quantidade_fretes: selectedFretes.length,
      fretes_incluidos: selectedFretes.join(","),
      total_toneladas: editedPagamento.toneladas || 0,
      valor_por_tonelada: editedPagamento.valorUnitarioPorTonelada || 0,
      valor_total: editedPagamento.valorTotal || 0,
      data_pagamento: toApiDate(editedPagamento.dataPagamento || ""),
      status: isInternalCostFlow ? "pago" : (editedPagamento.statusPagamento || "pendente"),
      comprovante_nome: isInternalCostFlow ? undefined : selectedFile?.name,
      comprovante_url: isInternalCostFlow ? undefined : editedPagamento.comprovante?.url,
      observacoes: editedPagamento.observacoes,
    };

    if (isEditing && editedPagamento.id) {
      updateMutation.mutate({ id: editedPagamento.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Filtrar dados com base em busca e filtros
  const filteredData = pagamentosFiltradosTransformados.filter((pagamento) => {
    const matchesSearch =
      pagamento.motoristaNome.toLowerCase().includes(search.toLowerCase()) ||
      pagamento.id.includes(search);
    const matchesStatus =
      statusFilter === "all" || pagamento.statusPagamento === statusFilter;
    const matchesMotorista =
      motoristaFilter === "all" || pagamento.motoristaId === motoristaFilter;
    return matchesSearch && matchesStatus && matchesMotorista;
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, motoristaFilter, tipoVisualizacao, selectedPeriodo]);

  // Função para exportar Resumo Geral (Mockada temporariamente)
  const handleExportarGeralPDF = () => {
    toast.info("Exportação geral de pagamentos estará disponível em breve.");
  };

  const columns = [
    {
      key: "id",
      header: "ID Pagamento",
      render: (item: PagamentoMotorista) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary/60" />
          <span className="font-mono font-bold text-primary">{item.id}</span>
        </div>
      ),
    },
    {
      key: "motoristaNome",
      header: "Favorecido",
      render: (item: PagamentoMotorista) => (
        <div className="flex items-start gap-3 py-2">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
              {item.motoristaNome
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{shortName(item.motoristaNome)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">{item.dataFrete}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "toneladas",
      header: "Fretes",
      render: (item: PagamentoMotorista) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{item.toneladas}t</span>
          </div>
          <p className="text-xs text-muted-foreground">{item.fretes} frete(s)</p>
        </div>
      ),
    },
    {
      key: "valorTotal",
      header: "Valor",
      render: (item: PagamentoMotorista) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-profit" />
          <span className="font-bold text-profit">
            R$ {item.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ),
    },
    {
      key: "statusPagamento",
      header: "Status",
      render: (item: PagamentoMotorista) => (
        <div className="space-y-2">
          <Badge variant={statusConfig[item.statusPagamento].variant}>
            {statusConfig[item.statusPagamento].label}
          </Badge>
          <p className="text-xs text-muted-foreground">{item.dataPagamento}</p>
        </div>
      ),
    },
    {
      key: "comprovante",
      header: "Comprovante",
      render: (item: PagamentoMotorista) => (
        <div className="flex items-center gap-2">
          {item.comprovante ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-xs"
              title={`Visualizar: ${item.comprovante.nome}`}
              onClick={(e) => {
                e.stopPropagation();
                const url = getComprovanteUrl(item.comprovante?.url);
                if (!url) {
                  toast.error("Comprovante sem URL");
                  return;
                }
                setComprovanteDialog({
                  url,
                  nome: item.comprovante?.nome || "Comprovante",
                  ...parseFileType(`${url} ${item.comprovante?.nome || ""}`),
                });
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Sem anexo</span>
          )}
        </div>
      ),
    },
  ];

  const totalPendente = pagamentosData
    .filter((p) => p.statusPagamento === "pendente")
    .reduce((acc, p) => acc + p.valorTotal, 0);

  const totalPago = pagamentosData
    .filter((p) => p.statusPagamento === "pago")
    .reduce((acc, p) => acc + p.valorTotal, 0);

  if (isLoadingPagamentos) {
    return (
      <MainLayout title="Pagamentos" subtitle="Registro de pagamentos por proprietário/favorecido">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Carregando pagamentos...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Pagamentos" subtitle="Registro de pagamentos por proprietário/favorecido">
      <PageHeader
        title="Pagamentos por Favorecido"
        description="Registre e acompanhe os pagamentos pelos fretes realizados"
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

            {/* Botão Exportar PDF */}
            <Button variant="outline" onClick={handleExportarGeralPDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>

            {/* Botão Novo Pagamento */}
            <Button onClick={handleOpenNewModal}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pagamento
            </Button>
          </div>
        }
      />

      {/* Summary Cards com KPIs Comparativos */}
      <PaymentSummaryCards
        pagamentos={pagamentosFiltradosTransformados}
        dadosMesAnterior={dadosMesAnterior}
      />

      {/* Filtros Mobile e Desktop Componentizados */}
      <PaymentFilters
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        search={search}
        setSearch={setSearch}
        tipoVisualizacao={tipoVisualizacao}
        setTipoVisualizacao={setTipoVisualizacao}
        selectedPeriodo={selectedPeriodo}
        setSelectedPeriodo={setSelectedPeriodo}
        periodosDisponiveis={periodosDisponiveis}
        formatPeriodoLabel={formatPeriodoLabel}
        motoristaFilter={motoristaFilter}
        setMotoristaFilter={setMotoristaFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        motoristas={motoristas}
        handleExportarGeralPDF={handleExportarGeralPDF}
        clearFilters={clearFilters}
        shortName={shortName}
      />

      {/* FAB: Novo Pagamento (Mobile) */}
      <Button
        onClick={handleOpenNewModal}
        className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg p-0"
        size="icon"
        aria-label="Novo Pagamento"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <PagamentosTable
        columns={columns}
        paginatedData={paginatedData}
        filteredData={filteredData}
        setSelectedPagamento={setSelectedPagamento}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />

      {/* Payment Detail Modal - Refatorado */}
      <PaymentDetailsDialog
        selectedPagamento={selectedPagamento}
        setSelectedPagamento={setSelectedPagamento}
        statusConfig={statusConfig}
        fretesDoPagamento={fretesDoPagamento}
        getCustosByFreteRef={getCustosByFreteRef}
        getTotalCustosByFreteRef={getTotalCustosByFreteRef}
        handleExportarPDF={handleExportarPDF}
        handleOpenEditModal={handleOpenEditModal}
        getComprovanteUrl={getComprovanteUrl}
        parseFileType={parseFileType}
        setComprovanteDialog={setComprovanteDialog}
        handleDeletePagamento={handleDeletePagamento}
      />

      <ComprovanteDialog
        comprovanteDialog={comprovanteDialog}
        setComprovanteDialog={setComprovanteDialog}
      />

      {/* Create/Edit Modal - Agora Componentizado */}
      <PagamentoFormModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        isEditing={isEditing}
        isSaving={isSaving}
        isShaking={isShaking}
        editedPagamento={editedPagamento}
        setEditedPagamento={setEditedPagamento}
        formErrors={formErrors}
        clearFormError={clearFormError}
        resetFormErrors={resetFormErrors}
        motoristasComPendentes={motoristasComPendentes}
        fretesDisponiveis={fretesDisponiveis}
        selectedFretes={selectedFretes}
        handleToggleFrete={handleToggleFrete}
        motoristaSelecionado={motoristaSelecionado}
        isInternalCostFlow={isInternalCostFlow}
        isInternalCostConfirmed={isInternalCostConfirmed}
        setIsInternalCostConfirmed={setIsInternalCostConfirmed}
        metodoPagamentoAtual={metodoPagamentoAtual}
        fretesNaoPagos={fretesNaoPagos}
        getCustosByFreteRef={getCustosByFreteRef}
        getTotalCustosByFreteRef={getTotalCustosByFreteRef}
        handleFileChange={handleFileChange}
        selectedFile={selectedFile}
        selectedFileIsImage={selectedFileIsImage}
        selectedFileIsPdf={selectedFileIsPdf}
        selectedFilePreview={selectedFilePreview}
        autoEmitirGuia={autoEmitirGuia}
        setAutoEmitirGuia={setAutoEmitirGuia}
        handleSave={handleSave}
        handleMotoristaChange={handleMotoristaChange}
      />
      <ConfirmDialog
        open={!!confirmDeletePagamento}
        onOpenChange={(open) => { if (!open) setConfirmDeletePagamento(null); }}
        title="Excluir Guia de Pagamento"
        description="Tem certeza que deseja excluir esta guia de pagamento? Os fretes vinculados voltarão a ficar pendentes e poderão ser incluídos em uma nova guia."
        confirmLabel="Sim, excluir"
        variant="danger"
        onConfirm={handleConfirmDeletePagamento}
      />
    </MainLayout>
  );
}
