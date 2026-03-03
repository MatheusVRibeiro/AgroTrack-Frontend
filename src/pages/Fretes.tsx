import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { ModalSubmitFooter } from "@/components/shared/ModalSubmitFooter";
import { FieldError, fieldErrorClass } from "@/components/shared/FieldError";
import { DatePicker } from "@/components/shared/DatePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { shortName } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import * as fretesService from "@/services/fretes";
import * as caminhoesService from "@/services/caminhoes";
import fazendasService from "@/services/fazendas";
import custosService from "@/services/custos";
import pagamentosService from "@/services/pagamentos";
import type { ApiResponse, Custo as CustoApi, Frete as FreteAPI } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, MapPin, ArrowRight, Truck, Package, DollarSign, TrendingUp, Edit, Save, X, Weight, Info, Calendar as CalendarIcon, Fuel, Wrench, AlertCircle, FileDown, FileText, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sortMotoristasPorNome, sortFazendasPorNome } from "@/lib/sortHelpers";
import { formatarCodigoFrete, toNumber, getTodayInputDate, parseLocalInputDate, normalizeInputDate, normalizeFreteRef, isCustoFromFrete } from "@/utils/formatters";
import { RefreshingIndicator } from "@/components/shared/RefreshingIndicator";
import { FreteFormModal } from "@/components/fretes/FreteFormModal";
import { FreteDetailsModal } from "@/components/fretes/FreteDetailsModal";
import { FretesTable } from "@/components/fretes/FretesTable";
import { useRefreshData } from "@/hooks/useRefreshData";
import { useShake } from "@/hooks/useShake";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useMotoristas } from "@/hooks/queries/useMotoristas";
import { useFretes, useCriarFrete, useDeletarFrete, useEstatisticasFretes } from "@/hooks/queries/useFretes";

interface Frete {
  id: string;
  codigoFrete?: string;
  pagamentoId?: string | null;
  isPago?: boolean;
  origem: string;
  destino: string;
  motorista: string;
  motoristaId: string;
  caminhao: string;
  caminhaoId: string;
  mercadoria: string;
  mercadoriaId: string;
  fazendaId?: string;
  fazendaNome?: string;
  variedade?: string;
  dataFrete: string;
  quantidadeSacas: number;
  toneladas: number;
  valorPorTonelada: number;
  receita: number;
  custos: number;
  resultado: number;
  ticket?: string;
  numeroNotaFiscal?: string;
}

interface EstoqueFazenda {
  id: string;
  fazendaId?: string;
  fazenda: string;
  estado: string;
  mercadoria: string;
  variedade: string;
  quantidadeSacas: number;
  quantidadeInicial: number;
  precoPorTonelada: number;  // Preço por tonelada
  pesoMedioSaca: number;
  safra: string;
  colheitaFinalizada?: boolean;
}

interface Motorista {
  id: string;
  nome: string;
}

interface Caminhao {
  id: string;
  placa: string;
}

interface Mercadoria {
  id: string;
  nome: string;
  tarifaPorSaca: number; // Tarifa por saca de amendoim
  pesoMedioSaca: number; // Peso médio em kg
}

interface CustoAbastecimento {
  id: string;
  custoLitro: number;
}

interface CustoMotorista {
  motoristaId: string;
  diaria: number;
  adicionalPernoite: number;
}

interface Custo {
  id: string;
  freteId: string;
  tipo: "combustivel" | "manutencao" | "pedagio" | "outros";
  descricao: string;
  valor: number;
  data: string;
  comprovante: boolean;
  motorista: string;
  caminhao: string;
  rota: string;
  observacoes?: string;
  litros?: number;
  tipoCombustivel?: "gasolina" | "diesel" | "etanol" | "gnv";
}

// Dados agora carregados via API (motoristas, caminhões, mercadorias, estoques, etc.)

// Dados de custos adicionais
const custosData: Custo[] = [
  {
    id: "1",
    freteId: "FRETE-2026-001",
    tipo: "combustivel",
    descricao: "Abastecimento completo",
    valor: 2500,
    data: "20/01/2025",
    comprovante: true,
    motorista: "Carlos Silva",
    caminhao: "ABC-1234",
    rota: "São Paulo → Rio de Janeiro",
    observacoes: "Posto Shell - Rodovia Presidente Dutra KM 180",
    litros: 450,
    tipoCombustivel: "diesel",
  },
  {
    id: "2",
    freteId: "FRETE-2026-001",
    tipo: "pedagio",
    descricao: "Via Dutra - trecho completo",
    valor: 850,
    data: "20/01/2025",
    comprovante: true,
    motorista: "Carlos Silva",
    caminhao: "ABC-1234",
    rota: "São Paulo → Rio de Janeiro",
    observacoes: "9 praças de pedágio no trajeto",
  },
  {
    id: "3",
    freteId: "FRETE-2026-002",
    tipo: "manutencao",
    descricao: "Troca de pneus dianteiros",
    valor: 3200,
    data: "18/01/2025",
    comprovante: true,
    motorista: "João Oliveira",
    caminhao: "XYZ-5678",
    rota: "Curitiba → Florianópolis",
    observacoes: "Borracharia São José - 2 pneus Pirelli novos",
  },
  {
    id: "4",
    freteId: "FRETE-2026-002",
    tipo: "combustivel",
    descricao: "Abastecimento parcial",
    valor: 1800,
    data: "17/01/2025",
    comprovante: false,
    motorista: "João Oliveira",
    caminhao: "XYZ-5678",
    rota: "Curitiba → Florianópolis",
    litros: 320,
    tipoCombustivel: "diesel",
  },
  {
    id: "5",
    freteId: "FRETE-2026-004",
    tipo: "outros",
    descricao: "Estacionamento",
    valor: 150,
    data: "15/01/2025",
    comprovante: true,
    motorista: "André Costa",
    caminhao: "DEF-9012",
    rota: "São Paulo → Rio de Janeiro",
    observacoes: "Estacionamento durante pernoite - 24h",
  },
  {
    id: "6",
    freteId: "FRETE-2026-004",
    tipo: "combustivel",
    descricao: "Abastecimento",
    valor: 1570,
    data: "15/01/2025",
    comprovante: true,
    motorista: "André Costa",
    caminhao: "DEF-9012",
    rota: "São Paulo → Rio de Janeiro",
    litros: 280,
    tipoCombustivel: "diesel",
  },
];

export default function Fretes() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [motoristaFilter, setMotoristaFilter] = useState("all");
  const [caminhaoFilter, setCaminhaoFilter] = useState("all");
  const [fazendaFilter, setFazendaFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedFrete, setSelectedFrete] = useState<Frete | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isNewFreteOpen, setIsNewFreteOpen] = useState(false);
  const [isEditingFrete, setIsEditingFrete] = useState(false);
  const [isSavingFrete, setIsSavingFrete] = useState(false);

  const [newFrete, setNewFrete] = useState({
    id: "",
    origem: "",
    destino: "",
    motoristaId: "",
    caminhaoId: "",
    fazendaId: "",
    dataFrete: getTodayInputDate(),
    toneladas: "",
    valorPorTonelada: "",
    ticket: "",
    numeroNotaFiscal: "",
  });

  // Helper: parse various date formats to timestamp for sorting (dd/MM/yyyy, ISO)
  const dateToTimestamp = (value?: string) => {
    if (!value) return 0;
    if (value.includes("/")) {
      const [dia, mes, ano] = value.split("/");
      const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = parseLocalInputDate(value);
      return parsed ? parsed.getTime() : 0;
    }
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
  };

  const codigoNumero = (codigo?: string | undefined) => {
    if (!codigo) return -1;
    const m = codigo.match(/(\d+)\s*$/);
    if (m) return Number(m[1]);
    const digits = codigo.replace(/\D+/g, "");
    return digits ? Number(digits) : -1;
  };
  type FormErrors = {
    fazendaId: string;
    destino: string;
    motoristaId: string;
    caminhaoId: string;
    dataFrete: string;
    toneladas: string;
    valorPorTonelada: string;
  };
  const initialFormErrors: FormErrors = {
    fazendaId: "",
    destino: "",
    motoristaId: "",
    caminhaoId: "",
    dataFrete: "",
    toneladas: "",
    valorPorTonelada: "",
  };
  const [formErrors, setFormErrors] = useState<FormErrors>(initialFormErrors);
  const resetFormErrors = () => {
    setFormErrors(initialFormErrors);
  };
  const clearFormError = (field: keyof FormErrors) => {
    setFormErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };
  const applyBackendFieldError = (field?: string, message?: string) => {
    const fieldMap: Record<string, keyof FormErrors> = {
      motorista_id: "motoristaId",
      caminhao_id: "caminhaoId",
    };
    const mappedField = field ? fieldMap[field] : undefined;
    if (!mappedField) return false;
    setFormErrors((prev) => ({
      ...prev,
      [mappedField]: message || "Campo inválido.",
    }));
    triggerShake();
    return true;
  };
  const { isShaking, triggerShake } = useShake(220);
  const [estoquesFazendas, setEstoquesFazendas] = useState<EstoqueFazenda[]>([]);
  const [estoqueSelecionado, setEstoqueSelecionado] = useState<EstoqueFazenda | null>(null);
  const [caminhoesDoMotorista, setCaminhoesDoMotorista] = useState<any[]>([]);
  const [carregandoCaminhoes, setCarregandoCaminhoes] = useState(false);
  const [erroCaminhoes, setErroCaminhoes] = useState<string>("");
  const { isRefreshing, startRefresh, endRefresh } = useRefreshData();

  // Estados para Exercício (Ano/Mês) e Fechamento
  const [tipoVisualizacao, setTipoVisualizacao] = useState<"mensal" | "trimestral" | "semestral" | "anual">(() => {
    return (localStorage.getItem("fretes_tipoVisualizacao") as any) || "mensal";
  });
  const [selectedPeriodo, setSelectedPeriodo] = useState(() => {
    const salvo = localStorage.getItem("fretes_tipoVisualizacao") || "mensal";
    const hoje = new Date();
    if (salvo === "mensal") return format(hoje, "yyyy-MM");
    if (salvo === "trimestral") return `${hoje.getFullYear()}-T${Math.ceil((hoje.getMonth() + 1) / 3)}`;
    if (salvo === "semestral") return `${hoje.getFullYear()}-S${hoje.getMonth() + 1 <= 6 ? 1 : 2}`;
    return String(hoje.getFullYear());
  });

  useEffect(() => {
    localStorage.setItem("fretes_tipoVisualizacao", tipoVisualizacao);
  }, [tipoVisualizacao]);
  const [filtersOpen, setFiltersOpen] = useState(false); // Controle do Sheet de filtros mobile

  // Dados históricos para comparação (simulado - mes anterior)
  const dadosMesAnterior = {
    periodo: "2025-12",
    totalReceita: 45800,
    totalCustos: 8900,
    totalFretes: 12,
  };

  // ========== QUERIES ==========
  // Carregar Motoristas
  const { data: motoristasResponse, isLoading: isLoadingMotoristas } = useMotoristas();

  // Carregar Caminhões
  const { data: caminhoesData, isLoading: isLoadingCaminhoes } = useQuery({
    queryKey: ["caminhoes"],
    queryFn: async () => {
      const res = await caminhoesService.listarCaminhoes();
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error(res.message || "Erro ao carregar caminhões");
    },
  });

  // Hook para estatísticas
  const { data: estatisticasResponse } = useEstatisticasFretes();

  // Calcular data inicio/fim do periodo selecionado p/ enviar à API
  const periodoDatas = useMemo(() => {
    let data_inicio = "";
    let data_fim = "";
    if (selectedPeriodo && tipoVisualizacao) {
      const parts = selectedPeriodo.split("-");
      const ano = parseInt(parts[0]);
      if (tipoVisualizacao === "mensal" && parts[1]) {
        const mes = parseInt(parts[1]);
        const lastDay = new Date(ano, mes, 0).getDate();
        data_inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
        data_fim = `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else if (tipoVisualizacao === "trimestral" && parts[1]) {
        const tri = parseInt(parts[1].replace("T", ""));
        const mesInicio = (tri - 1) * 3 + 1;
        const mesFim = tri * 3;
        const lastDay = new Date(ano, mesFim, 0).getDate();
        data_inicio = `${ano}-${String(mesInicio).padStart(2, "0")}-01`;
        data_fim = `${ano}-${String(mesFim).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else if (tipoVisualizacao === "semestral" && parts[1]) {
        const sem = parseInt(parts[1].replace("S", ""));
        const mesInicio = sem === 1 ? 1 : 7;
        const mesFim = sem === 1 ? 6 : 12;
        const lastDay = new Date(ano, mesFim, 0).getDate();
        data_inicio = `${ano}-${String(mesInicio).padStart(2, "0")}-01`;
        data_fim = `${ano}-${String(mesFim).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else if (tipoVisualizacao === "anual") {
        data_inicio = `${ano}-01-01`;
        data_fim = `${ano}-12-31`;
      }
    }
    return { data_inicio, data_fim };
  }, [selectedPeriodo, tipoVisualizacao]);

  // Carregar todos os fretes DO MÊS ESPECÍFICO em background para paginação local/somatórios (+leve)
  const { data: fretesAllResponse, isLoading: isLoadingFretes } = useFretes({ fetchAll: true, ...periodoDatas });
  // Passaremos o fretesAllResponse para fretesResponse, afinal a tabela paginará no client
  const fretesResponse = fretesAllResponse;

  // Carregar pagamentos (usado para marcar fretes pagos)
  const { data: pagamentosResponse } = useQuery<ApiResponse<any[]>>({
    queryKey: ["pagamentos"],
    queryFn: () => pagamentosService.listarPagamentos(),
    staleTime: 1000 * 60 * 5,
  });

  const pagamentosApi: any[] = pagamentosResponse?.data || [];

  // Carregar Custos (para detalhamento no modal de visualização)
  const { data: custosResponse } = useQuery<ApiResponse<CustoApi[]>>({
    queryKey: ["custos"],
    queryFn: () => custosService.listarCustos(),
  });

  const custosState = Array.isArray(custosResponse?.data) ? custosResponse.data : [];

  const getTotalCustosByFreteRef = (freteId: unknown, codigoFrete?: unknown) =>
    custosState
      .filter((custo) => isCustoFromFrete((custo as any).frete_id, freteId, codigoFrete))
      .reduce((sum, custo) => sum + toNumber(custo.valor), 0);

  const fretesAPI: Frete[] = useMemo(
    () =>
      (fretesResponse?.data ?? [])
        .map((freteAPI) => {
          const custosVindosDosLancamentos = getTotalCustosByFreteRef(
            freteAPI.id,
            freteAPI.codigo_frete
          );
          const custos =
            custosVindosDosLancamentos > 0
              ? custosVindosDosLancamentos
              : toNumber(freteAPI.custos);
          const receita = toNumber(freteAPI.receita);

          const freteIdStr = String(freteAPI.id);
          const isPago = pagamentosApi.some((p) => {
            const fretes_incluidos: string | null | undefined = p.fretes_incluidos;
            if (!fretes_incluidos) return false;
            return (
              p.status === "pago" &&
              fretes_incluidos
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .includes(freteIdStr)
            );
          });

          return {
            id: freteAPI.id,
            codigoFrete: freteAPI.codigo_frete || undefined,
            pagamentoId: freteAPI.pagamento_id || undefined,
            isPago,
            origem: freteAPI.origem,
            destino: freteAPI.destino,
            motorista: freteAPI.proprietario_nome || freteAPI.motorista_nome,
            motoristaId: freteAPI.proprietario_id || freteAPI.motorista_id,
            caminhao: freteAPI.caminhao_placa,
            caminhaoId: freteAPI.caminhao_id,
            mercadoria: freteAPI.mercadoria,
            mercadoriaId: freteAPI.mercadoria_id || freteAPI.mercadoria,
            fazendaId: freteAPI.fazenda_id || undefined,
            fazendaNome: freteAPI.fazenda_nome || undefined,
            variedade: freteAPI.variedade || undefined,
            dataFrete: freteAPI.data_frete,
            quantidadeSacas: freteAPI.quantidade_sacas,
            toneladas: freteAPI.toneladas,
            valorPorTonelada: freteAPI.valor_por_tonelada,
            receita,
            custos,
            resultado: receita - custos,
            ticket: freteAPI.ticket || undefined,
          };
        })
        .sort((a, b) => {
          const na = codigoNumero(a.codigoFrete);
          const nb = codigoNumero(b.codigoFrete);
          if (nb !== na) return nb - na;
          return Number(b.id) - Number(a.id);
        }),
    [fretesResponse?.data, custosState, pagamentosResponse?.data]
  );

  // All fretes (full dataset) used for totals/periods
  const fretesAllAPI: Frete[] = useMemo(
    () =>
      (fretesAllResponse?.data ?? [])
        .map((freteAPI) => {
          const custosVindosDosLancamentos = getTotalCustosByFreteRef(
            freteAPI.id,
            freteAPI.codigo_frete
          );
          const custos =
            custosVindosDosLancamentos > 0
              ? custosVindosDosLancamentos
              : toNumber(freteAPI.custos);
          const receita = toNumber(freteAPI.receita);

          const freteIdStr = String(freteAPI.id);
          const isPago = pagamentosApi.some((p) => {
            const fretes_incluidos: string | null | undefined = p.fretes_incluidos;
            if (!fretes_incluidos) return false;
            return (
              p.status === "pago" &&
              fretes_incluidos
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .includes(freteIdStr)
            );
          });

          return {
            id: freteAPI.id,
            codigoFrete: freteAPI.codigo_frete || undefined,
            pagamentoId: freteAPI.pagamento_id || undefined,
            isPago,
            origem: freteAPI.origem,
            destino: freteAPI.destino,
            motorista: freteAPI.proprietario_nome || freteAPI.motorista_nome,
            motoristaId: freteAPI.proprietario_id || freteAPI.motorista_id,
            caminhao: freteAPI.caminhao_placa,
            caminhaoId: freteAPI.caminhao_id,
            mercadoria: freteAPI.mercadoria,
            mercadoriaId: freteAPI.mercadoria_id || freteAPI.mercadoria,
            fazendaId: freteAPI.fazenda_id || undefined,
            fazendaNome: freteAPI.fazenda_nome || undefined,
            variedade: freteAPI.variedade || undefined,
            dataFrete: freteAPI.data_frete,
            quantidadeSacas: freteAPI.quantidade_sacas,
            toneladas: freteAPI.toneladas,
            valorPorTonelada: freteAPI.valor_por_tonelada,
            receita,
            custos,
            resultado: receita - custos,
            ticket: freteAPI.ticket || undefined,
          };
        })
        .sort((a, b) => {
          const dt = dateToTimestamp(b.dataFrete) - dateToTimestamp(a.dataFrete);
          if (dt !== 0) return dt;
          const na = codigoNumero(a.codigoFrete);
          const nb = codigoNumero(b.codigoFrete);
          if (nb !== na) return nb - na;
          return String(b.id).localeCompare(String(a.id));
        }),
    [fretesAllResponse?.data, custosState, pagamentosResponse?.data]
  );

  const motoristasData = Array.isArray(motoristasResponse?.data) ? motoristasResponse.data : [];
  const motoristasState = (() => {
    const sorted = sortMotoristasPorNome(motoristasData);
    const isProprio = (motorista: any) =>
      String(motorista?.tipo ?? motorista?.proprietario_tipo ?? "")
        .toLowerCase()
        .trim() === "proprio";
    const proprios = sorted.filter(isProprio);
    const outros = sorted.filter((motorista) => !isProprio(motorista));
    return [...proprios, ...outros];
  })();
  const caminhoesState = Array.isArray(caminhoesData) ? caminhoesData : [];
  const fretesState = Array.isArray(fretesAPI) ? fretesAPI : [];
  const fretesAllState = Array.isArray(fretesAllAPI) ? fretesAllAPI : [];
  const editRouteHandledRef = useRef<string | null>(null);

  // Validar se período selecionado existe nos dados estatisticos
  useEffect(() => {
    // Extrair períodos disponíveis a partir do backend de estatisticas (onde vêm os meses exatos)
    const periodosApi = Array.isArray(estatisticasResponse?.data?.periodos_disponiveis)
      ? estatisticasResponse.data.periodos_disponiveis
      : [];

    const periodosConvertidos = periodosApi.map((pStr: string) => {
      // pStr é 'YYYY-MM'
      const dt = new Date(pStr + "-15"); // Dia 15 para evitar timezone
      if (Number.isNaN(dt.getTime())) return "";

      const anoFrete = dt.getFullYear();
      const mesFrete = dt.getMonth() + 1;

      if (tipoVisualizacao === "mensal") {
        return `${anoFrete}-${String(mesFrete).padStart(2, "0")}`;
      } else if (tipoVisualizacao === "trimestral") {
        const trimestreFrete = Math.ceil(mesFrete / 3);
        return `${anoFrete}-T${trimestreFrete}`;
      } else if (tipoVisualizacao === "semestral") {
        const semestreFrete = mesFrete <= 6 ? 1 : 2;
        return `${anoFrete}-S${semestreFrete}`;
      } else if (tipoVisualizacao === "anual") {
        return String(anoFrete);
      }
      return "";
    }).filter(Boolean);

    const hoje = new Date();
    let periodoAtual = "";
    if (tipoVisualizacao === "mensal") periodoAtual = format(hoje, "yyyy-MM");
    else if (tipoVisualizacao === "trimestral") periodoAtual = `${hoje.getFullYear()}-T${Math.ceil((hoje.getMonth() + 1) / 3)}`;
    else if (tipoVisualizacao === "semestral") periodoAtual = `${hoje.getFullYear()}-S${hoje.getMonth() <= 5 ? 1 : 2}`;
    else if (tipoVisualizacao === "anual") periodoAtual = String(hoje.getFullYear());

    periodosConvertidos.push(periodoAtual);

    const periodosUnicos = Array.from(new Set<string>(periodosConvertidos as string[])).sort();

    // Se período atual não existe e há períodos únicos, usar o mais recente, mas o atual foi incluído então manterá.  
    if (!periodosUnicos.includes(selectedPeriodo as string) && periodosUnicos.length > 0) {
      setSelectedPeriodo(periodosUnicos[periodosUnicos.length - 1] as string);
    }
  }, [estatisticasResponse, tipoVisualizacao, selectedPeriodo]);

  const handleOpenNewModal = async () => {
    toast.loading("📂 Carregando fazendas...");
    // Carregar fazendas disponíveis da API
    const res = await fazendasService.listarFazendas();
    toast.dismiss();
    if (res.success && res.data) {
      const fazendasFormatadas: EstoqueFazenda[] = res.data
        .filter((f) => !f.colheita_finalizada)
        .map((f) => ({
          id: f.id,
          fazendaId: f.id, // Usa id da fazenda
          fazenda: f.fazenda,
          estado: f.estado || "",
          mercadoria: f.mercadoria,
          variedade: f.variedade || "",
          quantidadeSacas: f.total_sacas_carregadas || 0,
          quantidadeInicial: f.total_sacas_carregadas || 0,
          precoPorTonelada: f.preco_por_tonelada || 0,
          pesoMedioSaca: f.peso_medio_saca || 25,
          safra: f.safra || "",
          colheitaFinalizada: f.colheita_finalizada || false,
        }));
      setEstoquesFazendas(sortFazendasPorNome(fazendasFormatadas));
      if (fazendasFormatadas.length === 0) {
        toast.warning("⚠️ Nenhuma fazenda com estoque disponível", {
          description: "Todas as fazendas já finalizaram a colheita.",
        });
      }
    } else {
      toast.error("❌ Erro ao carregar fazendas", {
        description: res.message || "Tente novamente em alguns momentos.",
      });
      setEstoquesFazendas([]);
    }

    setNewFrete({
      id: "",
      origem: "",
      destino: "",
      motoristaId: "",
      caminhaoId: "",
      fazendaId: "",
      dataFrete: getTodayInputDate(),
      toneladas: "",
      valorPorTonelada: "",
      ticket: "",
      numeroNotaFiscal: "",
    });
    setEstoqueSelecionado(null);
    setIsEditingFrete(false);
    setIsNewFreteOpen(true);
  };

  const loadEstoquesForEdit = async (frete: Frete) => {
    const res = await fazendasService.listarFazendas();
    let resolvedFazendaId = frete.fazendaId ? String(frete.fazendaId) : "";

    if (res.success && res.data) {
      const fazendasFormatadas: EstoqueFazenda[] = res.data
        .filter((f) => !f.colheita_finalizada)
        .map((f) => ({
          id: f.id,
          fazendaId: f.id,
          fazenda: f.fazenda,
          estado: f.estado || "",
          mercadoria: f.mercadoria,
          variedade: f.variedade || "",
          quantidadeSacas: f.total_sacas_carregadas || 0,
          quantidadeInicial: f.total_sacas_carregadas || 0,
          precoPorTonelada: f.preco_por_tonelada || 0,
          pesoMedioSaca: f.peso_medio_saca || 25,
          safra: f.safra || "",
          colheitaFinalizada: f.colheita_finalizada || false,
        }));

      let nextEstoques = sortFazendasPorNome(fazendasFormatadas);

      if (!resolvedFazendaId) {
        const normalize = (value: string) =>
          value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
        const origemNome = frete.origem ? frete.origem.split(" - ")[0] : "";
        const targetName = normalize(frete.fazendaNome || origemNome || "");
        if (targetName) {
          const match = nextEstoques.find((e) => normalize(e.fazenda) === targetName);
          if (match) resolvedFazendaId = String(match.id);
        }
      }

      const hasSelected = resolvedFazendaId && nextEstoques.some((e) => String(e.id) === resolvedFazendaId);
      if (resolvedFazendaId && !hasSelected) {
        nextEstoques = sortFazendasPorNome([
          ...nextEstoques,
          {
            id: resolvedFazendaId,
            fazendaId: resolvedFazendaId,
            fazenda: frete.fazendaNome || frete.origem || "Fazenda",
            estado: "",
            mercadoria: frete.mercadoria || "",
            variedade: frete.variedade || "",
            quantidadeSacas: 0,
            quantidadeInicial: 0,
            precoPorTonelada: frete.valorPorTonelada || 0,
            pesoMedioSaca: 25,
            safra: "",
            colheitaFinalizada: true,
          },
        ]);
      }

      setEstoquesFazendas(nextEstoques);
      const selected = resolvedFazendaId
        ? nextEstoques.find((e) => String(e.id) === resolvedFazendaId) || null
        : null;
      setEstoqueSelecionado(selected);
    } else {
      setEstoquesFazendas([]);
      setEstoqueSelecionado(null);
    }

    return resolvedFazendaId;
  };

  const loadCaminhoesForEdit = async (motoristaId: string, caminhaoId?: string) => {
    if (!motoristaId) return;
    setCarregandoCaminhoes(true);
    setErroCaminhoes("");
    setCaminhoesDoMotorista([]);

    try {
      const res = await caminhoesService.listarPorMotorista(motoristaId);
      if (res.success && res.data) {
        setCaminhoesDoMotorista(res.data);
        if (res.data.length === 0) {
          setErroCaminhoes("Motorista sem caminhões vinculados");
        } else if (caminhaoId && !res.data.some((c: any) => String(c.id) === String(caminhaoId))) {
          // Keep selection when the truck is not in the list
          setErroCaminhoes("Caminhão do frete não encontrado na lista");
        }
      } else {
        setErroCaminhoes("Motorista inválido");
      }
    } catch (err) {
      console.error("Erro ao buscar caminhões:", err);
      setErroCaminhoes("Erro ao carregar caminhões. Tente novamente.");
    } finally {
      setCarregandoCaminhoes(false);
    }
  };

  // Buscar caminhões do motorista selecionado
  const handleMotoristaChange = async (motoristaId: string) => {
    setCarregandoCaminhoes(true);
    setErroCaminhoes("");
    setCaminhoesDoMotorista([]);
    clearFormError("motoristaId");

    try {
      const res = await caminhoesService.listarPorMotorista(motoristaId);

      if (res.success && res.data) {
        setCaminhoesDoMotorista(res.data);

        if (res.data.length === 0) {
          setErroCaminhoes("Motorista sem caminhões vinculados");
          setNewFrete({ ...newFrete, motoristaId, caminhaoId: "" });
        } else {
          // Se só tem um caminhão, preenche automaticamente
          if (res.data.length === 1) {
            setNewFrete({
              ...newFrete,
              motoristaId,
              caminhaoId: String(res.data[0].id),
            });
            clearFormError("caminhaoId");
            toast.info(`Caminhão ${res.data[0].placa} preenchido automaticamente`);
          } else {
            // Se tiver mais de um, deixa o usuário escolher
            setNewFrete({ ...newFrete, motoristaId, caminhaoId: "" });
          }
        }
      } else {
        setErroCaminhoes("Motorista inválido");
        setNewFrete({ ...newFrete, motoristaId, caminhaoId: "" });
      }
    } catch (err) {
      console.error("Erro ao buscar caminhões:", err);
      setErroCaminhoes("Erro ao carregarcaminhões. Tente novamente.");
      setNewFrete({ ...newFrete, motoristaId, caminhaoId: "" });
    } finally {
      setCarregandoCaminhoes(false);
    }
  };

  const handleOpenEditModal = async () => {
    if (selectedFrete) {
      resetFormErrors();
      const resolvedFazendaId = await loadEstoquesForEdit(selectedFrete);
      await loadCaminhoesForEdit(selectedFrete.motoristaId, selectedFrete.caminhaoId);
      setNewFrete({
        id: String(selectedFrete.id),
        origem: "",
        destino: selectedFrete.destino,
        motoristaId: selectedFrete.motoristaId,
        caminhaoId: selectedFrete.caminhaoId,
        fazendaId: resolvedFazendaId || selectedFrete.fazendaId || "",
        dataFrete: normalizeInputDate(selectedFrete.dataFrete),
        toneladas: selectedFrete.toneladas.toString(),
        valorPorTonelada: selectedFrete.valorPorTonelada ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(selectedFrete.valorPorTonelada) : "",
        ticket: selectedFrete.ticket || "",
        numeroNotaFiscal: selectedFrete.numeroNotaFiscal || "",
      });
      setIsEditingFrete(true);
      setSelectedFrete(null);
      setIsNewFreteOpen(true);
    }
  };

  // Abrir modal de edição quando rota /fretes/editar/:id for acessada
  const fretesParams = useParams();
  useEffect(() => {
    const idParam = fretesParams.id;
    if (!idParam) {
      editRouteHandledRef.current = null;
      return;
    }
    if (editRouteHandledRef.current === String(idParam)) return;
    if (fretesState.length > 0) {
      const found = fretesState.find((f) => String(f.id) === String(idParam));
      if (found) {
        editRouteHandledRef.current = String(idParam);
        resetFormErrors();
        loadEstoquesForEdit(found).then((resolvedFazendaId) => {
          setNewFrete((prev) => ({
            ...prev,
            fazendaId: resolvedFazendaId || prev.fazendaId,
          }));
        });
        loadCaminhoesForEdit(found.motoristaId, found.caminhaoId);
        setNewFrete({
          id: String(found.id),
          origem: "",
          destino: found.destino,
          motoristaId: found.motoristaId,
          caminhaoId: found.caminhaoId,
          fazendaId: found.fazendaId || "",
          dataFrete: normalizeInputDate(found.dataFrete),
          toneladas: String(found.toneladas),
          valorPorTonelada: found.valorPorTonelada ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(found.valorPorTonelada) : "",
          ticket: found.ticket || "",
          numeroNotaFiscal: found.numeroNotaFiscal || "",
        });
        setIsEditingFrete(true);
        setIsNewFreteOpen(true);
      }
    }
  }, [fretesParams.id, fretesState]);

  const handleSaveFrete = async () => {
    if (isSavingFrete) return;
    setIsSavingFrete(true);

    // Debug: mostrar estado atual ao tentar salvar
    console.debug("handleSaveFrete - newFrete:", newFrete, "estoqueSelecionado:", estoqueSelecionado);

    // Validar campos (trim strings, checar null/undefined)
    const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
    const nextErrors: FormErrors = {
      fazendaId: "",
      destino: "",
      motoristaId: "",
      caminhaoId: "",
      dataFrete: "",
      toneladas: "",
      valorPorTonelada: "",
    };

    if (isEmpty(newFrete.fazendaId) || !estoqueSelecionado) {
      nextErrors.fazendaId = "Selecione a fazenda de origem.";
    }
    if (isEmpty(newFrete.destino)) {
      nextErrors.destino = "Informe o destino do frete.";
    }
    if (isEmpty(newFrete.motoristaId)) {
      nextErrors.motoristaId = "Selecione um motorista.";
    }
    if (isEmpty(newFrete.caminhaoId)) {
      nextErrors.caminhaoId = "Selecione um caminhão.";
    }
    if (isEmpty(newFrete.dataFrete)) {
      nextErrors.dataFrete = "Informe a data do frete.";
    }
    if (isEmpty(newFrete.toneladas)) {
      nextErrors.toneladas = "Informe o peso em toneladas.";
    }
    if (isEmpty(newFrete.valorPorTonelada)) {
      nextErrors.valorPorTonelada = "Informe o valor por tonelada.";
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setFormErrors(nextErrors);
      triggerShake();
      setIsSavingFrete(false);
      return;
    }

    const toneladas = toNumber(newFrete.toneladas);
    if (isNaN(toneladas) || toneladas <= 0) {
      setFormErrors((prev) => ({
        ...prev,
        toneladas: "Informe um peso valido (maior que zero).",
      }));
      triggerShake();
      setIsSavingFrete(false);
      return;
    }

    const valorPorTonelada = toNumber(newFrete.valorPorTonelada);
    if (isNaN(valorPorTonelada) || valorPorTonelada <= 0) {
      setFormErrors((prev) => ({
        ...prev,
        valorPorTonelada: "Informe um valor valido (maior que zero).",
      }));
      triggerShake();
      setIsSavingFrete(false);
      return;
    }

    // Converter toneladas para sacas (toneladas em t, pesoMedioSaca em KG)
    const quantidadeSacas = Math.round((toneladas * 1000) / estoqueSelecionado.pesoMedioSaca);

    // Buscar dados selecionados
    const motorista = motoristasState.find((m) => String(m.id) === String(newFrete.motoristaId));
    const caminhao =
      caminhoesState.find((c) => String(c.id) === String(newFrete.caminhaoId)) ||
      caminhoesDoMotorista.find((c) => String(c.id) === String(newFrete.caminhaoId));
    const custoAbastecimento = undefined;
    const custoMotorista = undefined;

    if (!motorista) {
      setFormErrors((prev) => ({
        ...prev,
        motoristaId: "Motorista não encontrado. Selecione novamente.",
      }));
      triggerShake();
      setIsSavingFrete(false);
      return;
    }
    if (!caminhao) {
      setFormErrors((prev) => ({
        ...prev,
        caminhaoId: "Caminhão não encontrado. Selecione novamente.",
      }));
      triggerShake();
      setIsSavingFrete(false);
      return;
    }

    // Calcular receita baseado no estoque (usar valores padrão se não encontrar custos específicos)
    const distanciaEstimada = 500;
    const combustivelNecess = distanciaEstimada / 5;
    const custoCombustivelLitro = custoAbastecimento?.custoLitro || 5.50; // valor padrão
    const custoCombustivel = combustivelNecess * custoCombustivelLitro;
    const custoMotoristaTotal = custoMotorista?.diaria || 150; // valor padrão

    // Usar 0 para custos - serão adicionados manualmente na tela de Custos
    const custos = 0;

    // Valores apenas para exibição no modal (cálculo estimado)
    const custoEstimado = Math.floor(custoCombustivel + custoMotoristaTotal);

    const toUpper = (value: string) => value.trim().toUpperCase();
    const toUpperOrUndefined = (value?: string | null) => {
      const trimmed = (value ?? "").trim();
      return trimmed ? trimmed.toUpperCase() : undefined;
    };

    // Preparar payload para API
    const payload = {
      origem: toUpper(`${estoqueSelecionado.fazenda} - ${estoqueSelecionado.estado}`),
      destino: toUpper(newFrete.destino || ""),
      motorista_id: String(motorista.id),
      motorista_nome: toUpper(motorista.nome),
      caminhao_id: String(caminhao.id),
      caminhao_placa: toUpper(caminhao.placa),
      fazenda_id: String(newFrete.fazendaId),
      fazenda_nome: toUpper(estoqueSelecionado.fazenda),
      mercadoria: toUpper(estoqueSelecionado.mercadoria),
      mercadoria_id: String(estoqueSelecionado.id),
      variedade: toUpperOrUndefined(estoqueSelecionado.variedade),
      data_frete: newFrete.dataFrete || getTodayInputDate(),
      quantidade_sacas: quantidadeSacas,
      toneladas: toneladas,
      valor_por_tonelada: valorPorTonelada,
      custos: custos,
      resultado: (toneladas * valorPorTonelada) - custos,
      ticket: newFrete.ticket || null,
      numero_nota_fiscal: newFrete.numeroNotaFiscal || null,
    };

    if (isEditingFrete) {
      startRefresh();
      const toastId = toast.loading("📦 Salvando edições...");
      fretesService.atualizarFrete(newFrete.id, payload).then((res) => {
        if (res.success) {
          toast.dismiss(toastId);
          toast.success("✅ Frete atualizado", {
            description: `Frete ID ${newFrete.id} foi atualizado com sucesso.`,
            duration: 3000,
          });
          queryClient.invalidateQueries({ queryKey: ["fretes"] });
          queryClient.invalidateQueries({ queryKey: ["fazendas"] });
          setIsNewFreteOpen(false);
        } else {
          toast.dismiss(toastId);
          const handleError = applyBackendFieldError(res.field, res.message);
          if (!handleError) {
            toast.error("❌ Erro ao atualizar frete", {
              description: res.message || "Tente novamente em alguns momentos.",
              duration: 4000,
            });
          }
        }
      }).finally(() => {
        setIsSavingFrete(false);
        endRefresh();
      });
      return;
    }



    // Criar frete via API
    startRefresh();
    const toastId = toast.loading("📦 Criando frete...");
    const res = await fretesService.criarFrete(payload);

    if (res.success) {
      toast.dismiss(toastId);
      const receitaTotal = toneladas * valorPorTonelada;
      toast.success("✅ Frete cadastrado com sucesso!", {
        description: `ID: ${res.data?.id} | ${toneladas}t | R$ ${receitaTotal.toLocaleString("pt-BR")}`,
        duration: 4000,
      });

      // Incrementar volume transportado da fazenda (toneladas, sacas e faturamento)
      if (newFrete.fazendaId) {
        const incrementRes = await fazendasService.incrementarVolumeTransportado(
          String(newFrete.fazendaId),
          toneladas,
          quantidadeSacas,
          receitaTotal
        );
        if (incrementRes.success) {
          toast.success("✅ Volume da fazenda atualizado!", { duration: 2000 });
        } else {
          toast.error("⚠️ Frete criado, mas volume não foi atualizado", {
            description: incrementRes.message,
            duration: 3000,
          });
        }
      }

      // Recarregar fretes e fazendas para refletir mudanças
      queryClient.invalidateQueries({ queryKey: ["fretes"] });
      queryClient.invalidateQueries({ queryKey: ["fazendas"] });

      setIsNewFreteOpen(false);
      setNewFrete({
        id: "",
        origem: "",
        destino: "",
        motoristaId: "",
        caminhaoId: "",
        fazendaId: "",
        dataFrete: getTodayInputDate(),
        toneladas: "",
        valorPorTonelada: "",
        ticket: "",
        numeroNotaFiscal: "",
      });
      setEstoqueSelecionado(null);
      endRefresh();
    } else {
      toast.dismiss(toastId);
      if (applyBackendFieldError(res.field, res.message)) {
        endRefresh();
        setIsSavingFrete(false);
        return;
      }
      toast.error("❌ Erro ao cadastrar frete", {
        description: res.message || "Tente novamente em alguns momentos.",
        duration: 4000,
      });
      endRefresh();
    }

    setIsSavingFrete(false);
  };

  const parseDateBR = (value: string) => {
    if (!value) return new Date();

    // Formato brasileiro: dd/MM/yyyy
    if (value.includes("/")) {
      const [dia, mes, ano] = value.split("/");
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }

    // Formato ISO simples: 2026-02-10 (parse local para evitar fuso -1 dia)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsedLocal = parseLocalInputDate(value);
      return parsedLocal || new Date();
    }

    // Formato ISO completo: 2026-02-10T03:00:00.000Z
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  };

  const formatDateDisplay = (value: string) => {
    const date = parseDateBR(value);
    if (Number.isNaN(date.getTime())) return value;
    return format(date, "dd MMM yyyy", { locale: ptBR });
  };

  const formatDateBRDisplay = (value: string) => {
    const date = parseDateBR(value);
    if (Number.isNaN(date.getTime())) return value;
    return format(date, "dd/MM/yyyy");
  };

  const getFazendaNome = (frete: Frete) => frete.fazendaNome || frete.origem || "";

  // Normaliza nomes de fazenda removendo sufixos como " - Tupã" para evitar duplicatas
  const normalizeFazendaNome = (nome?: string) => {
    if (!nome) return "";
    return nome.trim();
  };

  // Formata o código do frete para o padrão 'FRETE-YYYY-XXX' quando necessário
  const formatFreteCodigo = (frete: Frete) => {
    if (!frete) return "";
    // Sequência estável apenas como fallback visual, quando backend ainda não devolver codigo_frete
    const idx = fretesState.findIndex((f) => f.id === frete.id);
    const seq = idx >= 0 ? idx + 1 : undefined;
    return formatarCodigoFrete(frete.codigoFrete || frete.id, frete.dataFrete, seq);
  };


  // Função para exportar PDF profissional
  const handleExportarPDF = () => {
    const doc = new jsPDF();

    // ==================== CABEÇALHO ====================
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 50, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Transportadora Transcontelli", 105, 18, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE FRETES", 105, 30, { align: "center" });

    // Formatar nome do período baseado no tipo de visualização
    let nomeFormatado = "";
    if (tipoVisualizacao === "mensal") {
      const [ano, mes] = selectedPeriodo.split("-");
      const nomeMes = format(new Date(parseInt(ano), parseInt(mes) - 1), "MMMM yyyy", { locale: ptBR });
      nomeFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    } else if (tipoVisualizacao === "trimestral") {
      // Formato: "2026-T1" -> "1º Trimestre 2026"
      const [ano, trimestre] = selectedPeriodo.split("-T");
      nomeFormatado = `${trimestre}º Trimestre ${ano}`;
    } else if (tipoVisualizacao === "semestral") {
      // Formato: "2026-S1" -> "1º Semestre 2026"
      const [ano, semestre] = selectedPeriodo.split("-S");
      nomeFormatado = `${semestre}º Semestre ${ano}`;
    } else if (tipoVisualizacao === "anual") {
      // Formato: "2026" -> "Ano 2026"
      nomeFormatado = `Ano ${selectedPeriodo}`;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Período de Referência: ${nomeFormatado}`, 105, 39, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 45, { align: "center" });

    doc.setTextColor(0, 0, 0);

    // ==================== RESUMO EXECUTIVO ====================
    let yPosition = 60;

    doc.setFillColor(241, 245, 249);
    doc.rect(15, yPosition, 180, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("RESUMO DE FRETES", 20, yPosition + 5.5);

    yPosition += 12;

    // Cálculos (baseados no conjunto completo filtrado)
    const totalReceita = filteredAllData.reduce((acc, f) => acc + toNumber(f.receita), 0);
    const totalCustos = filteredAllData.reduce((acc, f) => acc + toNumber(f.custos), 0);
    const totalLucro = totalReceita - totalCustos;
    const totalToneladas = filteredAllData.reduce((acc, f) => acc + toNumber(f.toneladas), 0);
    const qtdFretes = filteredAllData.length;

    doc.setTextColor(0, 0, 0);

    // Cards de resumo em 4 colunas
    doc.setTextColor(0, 0, 0);

    // Card 1 - Fretes
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(15, yPosition, 42, 28, 2, 2, "F");
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, yPosition, 42, 28, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Fretes", 20, yPosition + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text(`${qtdFretes}`, 20, yPosition + 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`no período`, 20, yPosition + 19);

    // Card 2 - Toneladas
    doc.setFillColor(237, 233, 254);
    doc.roundedRect(62, yPosition, 42, 28, 2, 2, "F");
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.5);
    doc.roundedRect(62, yPosition, 42, 28, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Toneladas", 67, yPosition + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(139, 92, 246);
    doc.text(`${totalToneladas.toFixed(1)}t`, 67, yPosition + 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const totalSacas = filteredData.reduce((acc, f) => acc + f.quantidadeSacas, 0);
    doc.text(`${totalSacas.toLocaleString("pt-BR")} sacas`, 67, yPosition + 19);

    // Card 3 - Receita
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(109, yPosition, 42, 28, 2, 2, "F");
    doc.setDrawColor(59, 130, 246);
    doc.roundedRect(109, yPosition, 42, 28, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Receita", 114, yPosition + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text(`R$ ${(totalReceita / 1000).toFixed(1)}k`, 114, yPosition + 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Bruto`, 114, yPosition + 19);

    // Card 4 - Lucro
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(156, yPosition, 39, 28, 2, 2, "F");
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.8);
    doc.roundedRect(156, yPosition, 39, 28, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Lucro", 161, yPosition + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text(`R$ ${(totalLucro / 1000).toFixed(1)}k`, 161, yPosition + 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const margem = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;
    doc.text(`${margem.toFixed(1)}%`, 161, yPosition + 19);

    yPosition += 35;

    // ==================== DETALHAMENTO DE FRETES ====================
    doc.setFillColor(241, 245, 249);
    doc.rect(15, yPosition, 180, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("DETALHAMENTO DE FRETES", 20, yPosition + 5.5);

    yPosition += 12;

    // Tabela detalhada - USANDO FILTROS APLICADOS
    const tableData = filteredAllData.map((f) => [
      f.id,
      `${f.origem} para ${f.destino}`,
      f.motorista,
      `${toNumber(f.toneladas).toFixed(1)}t`,
      `R$ ${toNumber(f.receita).toLocaleString("pt-BR")}`,
      `R$ ${toNumber(f.custos).toLocaleString("pt-BR")}`,
      `R$ ${toNumber(f.resultado).toLocaleString("pt-BR")}`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["ID", "Rota", "Favorecido", "Carga", "Receita", "Custos", "Resultado"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
        halign: "center",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 22, halign: "center", fontStyle: "bold", fontSize: 9 },
        1: { cellWidth: 48, fontSize: 9 },
        2: { cellWidth: 32, fontSize: 9 },
        3: { cellWidth: 16, halign: "center", fontSize: 9 },
        4: { cellWidth: 20, halign: "right", fontSize: 9 },
        5: { cellWidth: 20, halign: "right", textColor: [220, 38, 38], fontSize: 9 },
        6: { cellWidth: 20, halign: "right", fontStyle: "bold", textColor: [22, 163, 74], fontSize: 9 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // ==================== FOOTER EM TODAS AS PÁGINAS ====================
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(15, 280, 195, 280);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);

      doc.text("Sistema de gestão de fretes", 20, 285);
      doc.text(`Pagina ${i} de ${pageCount}`, 105, 285, { align: "center" });
      doc.text(`Relatorio Confidencial`, 190, 285, { align: "right" });

      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text("Este documento foi gerado automaticamente e contem informacoes confidenciais", 105, 290, { align: "center" });
    }

    const nomeArquivo = `Relatorio_Fretes_Transcontelli_${selectedPeriodo.replace("-", "_")}.pdf`;
    doc.save(nomeArquivo);
    toast.success(`PDF "${nomeArquivo}" gerado com sucesso!`, { duration: 4000 });
  };

  // Filtrar fretes por período selecionado (apenas dados da página atual)
  const fretesFiltradasPorPeriodo = useMemo(() => {
    if (!Array.isArray(fretesState)) return [];
    return fretesState.filter((f) => {
      const freteDate = parseDateBR(f.dataFrete);
      const anoFrete = freteDate.getFullYear();
      const mesFrete = freteDate.getMonth() + 1; // 1-12

      if (tipoVisualizacao === "mensal") {
        // Formato: "2026-02"
        const periodoItem = `${anoFrete}-${String(mesFrete).padStart(2, "0")}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "trimestral") {
        // Formato: "2026-T1" (T1, T2, T3, T4)
        const trimestreFrete = Math.ceil(mesFrete / 3);
        const periodoItem = `${anoFrete}-T${trimestreFrete}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "semestral") {
        // Formato: "2026-S1" (S1, S2)
        const semestreFrete = mesFrete <= 6 ? 1 : 2;
        const periodoItem = `${anoFrete}-S${semestreFrete}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "anual") {
        // Formato: "2026"
        return String(anoFrete) === selectedPeriodo;
      }
      return false;
    });
  }, [selectedPeriodo, fretesState, tipoVisualizacao]);

  // Filtrar todos os fretes por período selecionado (full dataset) — usado para somatórios e opções
  const fretesFiltradasPorPeriodoAll = useMemo(() => {
    if (!Array.isArray(fretesAllState)) return [];
    return fretesAllState.filter((f) => {
      const freteDate = parseDateBR(f.dataFrete);
      const anoFrete = freteDate.getFullYear();
      const mesFrete = freteDate.getMonth() + 1; // 1-12

      if (tipoVisualizacao === "mensal") {
        const periodoItem = `${anoFrete}-${String(mesFrete).padStart(2, "0")}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "trimestral") {
        const trimestreFrete = Math.ceil(mesFrete / 3);
        const periodoItem = `${anoFrete}-T${trimestreFrete}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "semestral") {
        const semestreFrete = mesFrete <= 6 ? 1 : 2;
        const periodoItem = `${anoFrete}-S${semestreFrete}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "anual") {
        return String(anoFrete) === selectedPeriodo;
      }
      return false;
    });
  }, [selectedPeriodo, fretesAllState, tipoVisualizacao]);

  const filteredData = fretesFiltradasPorPeriodo.filter((frete) => {
    const matchesSearch =
      frete.origem.toLowerCase().includes(search.toLowerCase()) ||
      frete.destino.toLowerCase().includes(search.toLowerCase()) ||
      frete.motorista.toLowerCase().includes(search.toLowerCase()) ||
      String(frete.id || "").toLowerCase().includes(search.toLowerCase());
    const matchesMotorista = motoristaFilter === "all" || frete.motoristaId === motoristaFilter;
    const matchesCaminhao = caminhaoFilter === "all" || frete.caminhaoId === caminhaoFilter;
    const matchesFazenda =
      fazendaFilter === "all" || normalizeFazendaNome(getFazendaNome(frete)) === fazendaFilter;
    let matchesPeriodo = true;
    if (dateRange?.from || dateRange?.to) {
      const freteDate = parseDateBR(frete.dataFrete);
      if (dateRange?.from) {
        if (freteDate < dateRange.from) matchesPeriodo = false;
      }
      if (dateRange?.to) {
        if (freteDate > dateRange.to) matchesPeriodo = false;
      }
    }

    return matchesSearch && matchesMotorista && matchesCaminhao && matchesFazenda && matchesPeriodo;
  });

  // Filtrado aplicado sobre o conjunto completo (usado nos cards e export)
  const filteredAllData = fretesFiltradasPorPeriodoAll.filter((frete) => {
    const matchesSearch =
      frete.origem.toLowerCase().includes(search.toLowerCase()) ||
      frete.destino.toLowerCase().includes(search.toLowerCase()) ||
      frete.motorista.toLowerCase().includes(search.toLowerCase()) ||
      String(frete.id || "").toLowerCase().includes(search.toLowerCase());
    const matchesMotorista = motoristaFilter === "all" || frete.motoristaId === motoristaFilter;
    const matchesCaminhao = caminhaoFilter === "all" || frete.caminhaoId === caminhaoFilter;
    const matchesFazenda =
      fazendaFilter === "all" || normalizeFazendaNome(getFazendaNome(frete)) === fazendaFilter;
    let matchesPeriodo = true;
    if (dateRange?.from || dateRange?.to) {
      const freteDate = parseDateBR(frete.dataFrete);
      if (dateRange?.from) {
        if (freteDate < dateRange.from) matchesPeriodo = false;
      }
      if (dateRange?.to) {
        if (freteDate > dateRange.to) matchesPeriodo = false;
      }
    }

    return matchesSearch && matchesMotorista && matchesCaminhao && matchesFazenda && matchesPeriodo;
  });

  // Lógica de paginação (agora sempre client-side devido ao filtro de período do front)
  const isFiltering = true;

  const totalFiltered = filteredAllData.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAllData.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, motoristaFilter, caminhaoFilter, fazendaFilter, dateRange, selectedPeriodo]);

  const fazendasOptions = Array.from(
    new Set(
      fretesFiltradasPorPeriodoAll
        .map((f) => normalizeFazendaNome(getFazendaNome(f)))
        .filter(Boolean)
    )
  ) as string[];

  // Extrair períodos disponíveis baseado nos dados estáticos da API
  const periodosDisponiveis: string[] = useMemo(() => {
    const periodosApi = Array.isArray(estatisticasResponse?.data?.periodos_disponiveis)
      ? estatisticasResponse.data.periodos_disponiveis
      : [];

    const periodosConvertidos: string[] = periodosApi.map((pStr: any) => {
      // pStr é 'YYYY-MM'
      const dt = new Date(pStr + "-15"); // Dia 15 para evitar timezone
      if (Number.isNaN(dt.getTime())) return "";

      const anoFrete = dt.getFullYear();
      const mesFrete = dt.getMonth() + 1;

      if (tipoVisualizacao === "mensal") {
        return `${anoFrete}-${String(mesFrete).padStart(2, "0")}`;
      } else if (tipoVisualizacao === "trimestral") {
        const trimestreFrete = Math.ceil(mesFrete / 3);
        return `${anoFrete}-T${trimestreFrete}`;
      } else if (tipoVisualizacao === "semestral") {
        const semestreFrete = mesFrete <= 6 ? 1 : 2;
        return `${anoFrete}-S${semestreFrete}`;
      } else if (tipoVisualizacao === "anual") {
        return String(anoFrete);
      }
      return "";
    }).filter(Boolean);

    const hoje = new Date();
    let periodoAtual = "";
    if (tipoVisualizacao === "mensal") periodoAtual = format(hoje, "yyyy-MM");
    else if (tipoVisualizacao === "trimestral") periodoAtual = `${hoje.getFullYear()}-T${Math.ceil((hoje.getMonth() + 1) / 3)}`;
    else if (tipoVisualizacao === "semestral") periodoAtual = `${hoje.getFullYear()}-S${hoje.getMonth() <= 5 ? 1 : 2}`;
    else if (tipoVisualizacao === "anual") periodoAtual = String(hoje.getFullYear());

    periodosConvertidos.push(periodoAtual);

    // Remover duplicatas e ordenar
    return Array.from(new Set<string>(periodosConvertidos)).sort();
  }, [estatisticasResponse, tipoVisualizacao]);

  // Formatar label do período para exibição
  const formatPeriodoLabel = (periodo: string) => {
    if (tipoVisualizacao === "mensal") {
      const [ano, mes] = periodo.split("-");
      const nomeMes = format(new Date(parseInt(ano), parseInt(mes) - 1), "MMMM yyyy", { locale: ptBR });
      return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    } else if (tipoVisualizacao === "trimestral") {
      const [ano, trimestre] = periodo.split("-T");
      return `${trimestre}º Trimestre ${ano}`;
    } else if (tipoVisualizacao === "semestral") {
      const [ano, semestre] = periodo.split("-S");
      return `${semestre}º Semestre ${ano}`;
    } else if (tipoVisualizacao === "anual") {
      return periodo;
    }
    return periodo;
  };

  const clearFilters = () => {
    setSearch("");
    setMotoristaFilter("all");
    setCaminhaoFilter("all");
    setFazendaFilter("all");
    setDateRange(undefined);
  };

  const columns = [
    {
      key: "id",
      header: "Frete",
      render: (item: Frete) => (
        <div className="flex items-start gap-3 py-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-mono font-bold text-lg text-foreground">{formatFreteCodigo(item)}</p>
              {item.pagamentoId && (
                <Badge variant="success" className="text-xs">
                  Pago
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDateDisplay(item.dataFrete)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "rota",
      header: "Rota",
      render: (item: Frete) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{item.fazendaNome || "Fazenda"}</p>
              <p className="text-xs text-muted-foreground truncate">{item.origem}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0 pl-5 relative">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-muted" />
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 absolute left-1" />
            <span className="text-xs text-muted-foreground truncate">{item.destino}</span>
          </div>
        </div>
      ),
    },
    {
      key: "ticket",
      header: "Ticket",
      render: (item: Frete) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.ticket || "—"}</p>
            {item.mercadoria && !/amendoim em casca/i.test(item.mercadoria) ? (
              <p className="text-xs text-muted-foreground">{item.mercadoria}</p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "detalhes",
      header: "Favorecido",
      render: (item: Frete) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-foreground truncate">{shortName(item.motorista)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded font-mono">
              {item.caminhao}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "mercadoria",
      header: "Carga",
      render: (item: Frete) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-foreground">{item.mercadoria}</p>
            {item.variedade && (
              <Badge variant="outline" className="text-xs">
                {item.variedade}
              </Badge>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3 w-3 flex-shrink-0" />
              <span className="font-semibold text-primary">{toNumber(item.quantidadeSacas).toLocaleString("pt-BR")}</span>
              <span>sacas</span>
              <span className="mx-0.5">•</span>
              <Weight className="h-3 w-3 flex-shrink-0" />
              <span className="font-semibold text-primary">{toNumber(item.toneladas).toFixed(2)}t</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-profit flex-shrink-0" />
              <span className="font-semibold text-profit">R$ {toNumber(item.valorPorTonelada).toLocaleString("pt-BR")}/t</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "financeiro",
      header: "Resumo financeiro",
      render: (item: Frete) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">Receita total:</span>
            <span className="font-bold text-blue-600">R$ {toNumber(item.receita).toLocaleString("pt-BR")}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">Custos adicionais:</span>
            <span className="font-bold text-red-600">R$ {toNumber(item.custos).toLocaleString("pt-BR")}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Custos incluem pedágios, combustível, diárias, etc.
          </p>
        </div>
      ),
    },
    {
      key: "resultado",
      header: "Lucro líquido",
      render: (item: Frete) => {
        // Cálculo sempre receita - custos
        const receita = toNumber(item.receita);
        const custos = toNumber(item.custos);
        const resultado = receita - custos;
        const percentualLucro = receita > 0 ? ((resultado / receita) * 100).toFixed(0) : "0";
        return (
          <div className="space-y-2">
            <Badge
              variant={resultado >= 0 ? "profit" : "loss"}
              className="w-fit font-bold text-lg px-3 py-1"
            >
              {resultado >= 0 ? "+" : ""}R$ {resultado.toLocaleString("pt-BR")}
            </Badge>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${resultado >= 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(Math.abs(parseInt(percentualLucro)), 100)}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
                {percentualLucro}%
              </span>
            </div>
          </div>
        );
      },
    },
  ];

  const tipoConfig = {
    combustivel: { label: "Combustível", icon: Fuel, color: "text-amber-600" },
    manutencao: { label: "Manutenção", icon: Wrench, color: "text-orange-600" },
    pedagio: { label: "Pedágio", icon: Truck, color: "text-blue-600" },
    outros: { label: "Outros", icon: AlertCircle, color: "text-gray-600" },
  };

  return (
    <MainLayout title="Fretes" subtitle="Gestão de fretes e entregas">
      <RefreshingIndicator isRefreshing={isRefreshing} />
      <PageHeader
        title="Fretes"
        description="Receita é o valor total do frete. Custos são adicionais (pedágios, diárias, etc.)"
        actions={
          <div className="hidden w-full lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-3">
            {/* Seletor de Tipo de Visualização */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Visualizar:</Label>
              <Select
                value={tipoVisualizacao}
                onValueChange={(value) => {
                  const tipoAntigo = tipoVisualizacao;
                  setTipoVisualizacao(value as any);

                  // Aguardar próximo tick para que periodosDisponiveis seja recalculado
                  setTimeout(() => {
                    // Tentar usar período atual, senão usar o mais recente disponível
                    const hoje = new Date();
                    let periodoIdeal = "";

                    if (value === "mensal") {
                      periodoIdeal = format(hoje, "yyyy-MM");
                    } else if (value === "trimestral") {
                      const trimestre = Math.ceil((hoje.getMonth() + 1) / 3);
                      periodoIdeal = `${hoje.getFullYear()}-T${trimestre}`;
                    } else if (value === "semestral") {
                      const semestre = hoje.getMonth() + 1 <= 6 ? 1 : 2;
                      periodoIdeal = `${hoje.getFullYear()}-S${semestre}`;
                    } else if (value === "anual") {
                      periodoIdeal = String(hoje.getFullYear());
                    }

                    setSelectedPeriodo(periodoIdeal);
                  }, 0);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seletor de Período (dinâmico) */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Período:</Label>
              <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {periodosDisponiveis.length === 0 ? (
                    <SelectItem value="sem-dados" disabled>Nenhum dado disponível</SelectItem>
                  ) : (
                    periodosDisponiveis.map((periodo) => (
                      <SelectItem key={periodo} value={periodo}>
                        {formatPeriodoLabel(periodo)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Botão Exportar PDF */}
            <Button variant="outline" onClick={handleExportarPDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>

            {/* Botão Novo Frete */}
            <Button onClick={handleOpenNewModal}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Frete
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-6">
        <Card className="p-3 md:p-4 bg-muted/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Fretes no período</p>
            <Package className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground/60" />
          </div>
          <p className="text-2xl md:text-3xl font-bold">{filteredAllData.length}</p>
        </Card>
        <Card className="p-3 md:p-4 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Toneladas</p>
            <Weight className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-purple-600">
            {filteredAllData.reduce((acc, f) => acc + toNumber(f.toneladas), 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}t
          </p>
          <p className="text-xs md:text-sm font-medium text-purple-600/70 mt-1">
            {filteredAllData.reduce((acc, f) => acc + toNumber(f.quantidadeSacas), 0).toLocaleString("pt-BR")} sacas
          </p>
        </Card>
        <Card className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Receita total</p>
            <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
          </div>
          <p className="text-xl md:text-3xl font-bold text-blue-600">
            R$ {filteredAllData.reduce((acc, f) => acc + toNumber(f.receita), 0).toLocaleString("pt-BR")}
          </p>
        </Card>
        <Card className="p-3 md:p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Custos adicionais</p>
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
          </div>
          <p className="text-xl md:text-3xl font-bold text-red-600">
            R$ {filteredAllData.reduce((acc, f) => acc + toNumber(f.custos), 0).toLocaleString("pt-BR")}
          </p>
        </Card>
        <Card className="p-3 md:p-4 bg-profit/5 border-profit/20 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Lucro líquido</p>
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-profit" />
          </div>
          <p className="text-xl md:text-3xl font-bold text-profit">
            R$ {filteredAllData.reduce((acc, f) => acc + toNumber(f.resultado), 0).toLocaleString("pt-BR")}
          </p>
        </Card>
      </div>

      {/* Filters - Desktop & Mobile */}
      {/* Mobile: Sheet Button */}
      <div className="lg:hidden mb-4">
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Filter className="h-4 w-4" />
              Filtros Avançados
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filtros e Configurações</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Tipo de Visualização */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Visualização</Label>
                <Select
                  value={tipoVisualizacao}
                  onValueChange={(value) => {
                    setTipoVisualizacao(value as any);
                    setTimeout(() => {
                      const hoje = new Date();
                      let periodoIdeal = "";

                      if (value === "mensal") {
                        periodoIdeal = format(hoje, "yyyy-MM");
                      } else if (value === "trimestral") {
                        const trimestre = Math.ceil((hoje.getMonth() + 1) / 3);
                        periodoIdeal = `${hoje.getFullYear()}-T${trimestre}`;
                      } else if (value === "semestral") {
                        const semestre = hoje.getMonth() + 1 <= 6 ? 1 : 2;
                        periodoIdeal = `${hoje.getFullYear()}-S${semestre}`;
                      } else if (value === "anual") {
                        periodoIdeal = String(hoje.getFullYear());
                      }

                      setSelectedPeriodo(periodoIdeal);
                    }, 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2 mt-2">
                  <Label htmlFor="ticket" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Ticket (romaneio)
                  </Label>
                  <Input
                    id="ticket"
                    placeholder="0123"
                    value={newFrete.ticket}
                    onChange={(e) => setNewFrete({ ...newFrete, ticket: e.target.value })}
                  />
                </div>
              </div>

              {/* Seletor de Período */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {periodosDisponiveis.length === 0 ? (
                      <SelectItem value="sem-dados" disabled>Nenhum dado...</SelectItem>
                    ) : (
                      periodosDisponiveis.map((periodo) => (
                        <SelectItem key={periodo} value={periodo}>
                          {formatPeriodoLabel(periodo)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Filtro Proprietários/Favorecidos */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Proprietário / Favorecido</Label>
                <Select value={motoristaFilter} onValueChange={setMotoristaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.isArray(motoristasState) && motoristasState.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Placas */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Placas</Label>
                <Select value={caminhaoFilter} onValueChange={setCaminhaoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.isArray(caminhoesState) && caminhoesState.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Fazendas */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fazendas</Label>
                <Select value={fazendaFilter} onValueChange={setFazendaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    <SelectItem value="all">Todas</SelectItem>
                    {fazendasOptions.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Período */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && !dateRange?.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from
                        ? `${format(dateRange.from, "dd/MM")} - ${dateRange.to ? format(dateRange.to, "dd/MM") : "..."}`
                        : "Selecionar"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Ações */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ações</Label>
                <div className="space-y-2">
                  {/* Botão Exportar PDF */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleExportarPDF();
                      setFiltersOpen(false);
                    }}
                    className="w-full gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar PDF
                  </Button>

                </div>
              </div>

              {/* Botões de ação */}
              <div className="pt-4 flex gap-2">
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

      {/* Desktop: Inline Filters */}
      <FilterBar
        className="hidden lg:flex"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por ID, origem, destino ou favorecido..."
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Proprietário / Favorecido</Label>
          <Select value={motoristaFilter} onValueChange={setMotoristaFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="all">Todos</SelectItem>
              {Array.isArray(motoristasState) && motoristasState.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Placas</Label>
          <Select value={caminhaoFilter} onValueChange={setCaminhaoFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Array.isArray(caminhoesState) && caminhoesState.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.placa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Fazendas</Label>
          <Select value={fazendaFilter} onValueChange={setFazendaFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="all">Todas</SelectItem>
              {fazendasOptions.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Período</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[220px] justify-start text-left font-normal",
                  !dateRange?.from && !dateRange?.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from
                  ? `${format(dateRange.from, "dd/MM")} - ${dateRange.to ? format(dateRange.to, "dd/MM") : "..."}`
                  : "Selecionar"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button variant="outline" onClick={clearFilters} className="gap-2">
          Limpar filtros
        </Button>
      </FilterBar>

      {/* FAB: Novo Frete (Mobile Only) */}
      <Button
        onClick={handleOpenNewModal}
        className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg p-0"
        size="icon"
        aria-label="Novo Frete"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Loading State */}
      {isLoadingFretes && (
        <div className="space-y-4">
          <SkeletonTable rows={5} />
          <div className="flex justify-center items-center py-8 text-muted-foreground gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-r-transparent rounded-full" />
            <span className="text-sm font-medium">Carregando fretes...</span>
          </div>
        </div>
      )}

      {/* Error/Empty State */}
      {!isLoadingMotoristas && !isLoadingCaminhoes && !isLoadingFretes && fretesState.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <div className="flex flex-col items-center gap-3">
            <Package className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhum frete encontrado</h3>
            <p className="text-sm text-muted-foreground">Comece criando seu primeiro frete</p>
          </div>
        </Card>
      )}

      {/* Data Table & Pagination Extracted */}
      {!isLoadingFretes && fretesState.length > 0 && (
        <FretesTable
          columns={columns}
          paginatedData={paginatedData}
          filteredData={isFiltering ? filteredAllData : filteredData}
          setSelectedFrete={setSelectedFrete}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      )}

      {/* Frete Detail Modal */}
      <FreteDetailsModal
        selectedFrete={selectedFrete}
        setSelectedFrete={setSelectedFrete}
        custosState={custosState}
        handleOpenEditModal={handleOpenEditModal}
      />

      {/* New/Edit Frete Modal */}
      <FreteFormModal
        isOpen={isNewFreteOpen}
        isEditing={isEditingFrete}
        isSaving={isSavingFrete}
        isShaking={isShaking}
        newFrete={newFrete}
        setNewFrete={setNewFrete}
        formErrors={formErrors}
        clearFormError={clearFormError}
        resetFormErrors={resetFormErrors}
        estoquesFazendas={estoquesFazendas}
        estoqueSelecionado={estoqueSelecionado}
        setEstoqueSelecionado={setEstoqueSelecionado}
        motoristasState={motoristasState}
        caminhoesState={caminhoesState}
        caminhoesDoMotorista={caminhoesDoMotorista}
        carregandoCaminhoes={carregandoCaminhoes}
        erroCaminhoes={erroCaminhoes}
        handleMotoristaChange={handleMotoristaChange}
        handleSaveFrete={handleSaveFrete}
        onClose={() => setIsNewFreteOpen(false)}
      />
    </MainLayout>
  );
}