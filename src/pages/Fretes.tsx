import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import * as fretesService from "@/services/fretes";
import * as motoristasService from "@/services/motoristas";
import * as caminhoesService from "@/services/caminhoes";
import fazendasService from "@/services/fazendas";
import type { Frete as FreteAPI } from "@/types";
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
import { Plus, MapPin, ArrowRight, Truck, Package, DollarSign, TrendingUp, Edit, Save, X, Weight, Info, Calendar as CalendarIcon, Fuel, Wrench, AlertCircle, FileDown, FileText, Lock, Unlock, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Frete {
  id: string;
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
}

interface EstoqueFazenda {
  id: string;
  fazendaId?: string;
  fazenda: string;
  localizacao: string;
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
  
  // Helper para converter valores para número
  const toNumber = (value: number | string | null | undefined): number => {
    if (typeof value === "number") return value;
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  
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
  const [newFrete, setNewFrete] = useState({
    origem: "",
    destino: "",
    motoristaId: "",
    caminhaoId: "",
    fazendaId: "",
    toneladas: "",
    valorPorTonelada: "",
    ticket: "",
  });
  const [estoquesFazendas, setEstoquesFazendas] = useState<EstoqueFazenda[]>([]);
  const [estoqueSelecionado, setEstoqueSelecionado] = useState<EstoqueFazenda | null>(null);
  
  // Estados para Exercício (Ano/Mês) e Fechamento
  const [tipoVisualizacao, setTipoVisualizacao] = useState<"mensal" | "trimestral" | "semestral" | "anual">("mensal");
  const [selectedPeriodo, setSelectedPeriodo] = useState(format(new Date(), "yyyy-MM")); // Mês atual
  const [mesesFechados, setMesesFechados] = useState<string[]>([]); // Meses que já foram fechados
  const [filtersOpen, setFiltersOpen] = useState(false); // Controle do Sheet de filtros mobile
  
  // Dados históricos para comparação (simulado - mes anterior)
  const dadosMesAnterior = {
    periodo: "2025-12",
    totalReceita: 45800,
    totalCustos: 8900,
    totalFretes: 12,
  };

  // Locais de entrega fixos
  const locaisEntregaFixos: string[] = [
    "Fazenda Santa Rosa - Secagem e Armazenagem",
    "Filial 1 - Secagem e Armazenagem",
  ];

  // ========== QUERIES ==========
  // Carregar Motoristas
  const { data: motoristasData, isLoading: isLoadingMotoristas } = useQuery({
    queryKey: ["motoristas"],
    queryFn: async () => {
      const res = await motoristasService.listarMotoristas();
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error(res.message || "Erro ao carregar motoristas");
    },
  });

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

  // Carregar Fretes
  const { data: fretesAPI, isLoading: isLoadingFretes } = useQuery({
    queryKey: ["fretes"],
    queryFn: async () => {
      const res = await fretesService.listarFretes();
      if (res.success && res.data) {
        // Mapear dados da API para o formato interno
        const fretesFormatados: Frete[] = res.data.map((freteAPI) => ({
          id: freteAPI.id,
          origem: freteAPI.origem,
          destino: freteAPI.destino,
          motorista: freteAPI.motorista_nome,
          motoristaId: freteAPI.motorista_id,
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
          receita: freteAPI.receita,
          custos: freteAPI.custos,
          resultado: freteAPI.resultado,
          ticket: freteAPI.ticket || undefined,
        }));
        return fretesFormatados;
      }
      throw new Error(res.message || "Erro ao carregar fretes");
    },
  });

  const motoristasState = Array.isArray(motoristasData) ? motoristasData : [];
  const caminhoesState = Array.isArray(caminhoesData) ? caminhoesData : [];
  const fretesState = Array.isArray(fretesAPI) ? fretesAPI : [];

  // Validar se período selecionado existe nos dados
  useEffect(() => {
    if (!Array.isArray(fretesState) || fretesState.length === 0) return;
    
    // Extrair períodos disponíveis
    const periodos = fretesState.map((f) => {
      const freteDate = parseDateBR(f.dataFrete);
      const anoFrete = freteDate.getFullYear();
      const mesFrete = freteDate.getMonth() + 1;
      
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
    });
    
    const periodosUnicos = Array.from(new Set(periodos)).filter(Boolean).sort();
    
    // Se período atual não existe, usar o mais recente
    if (!periodosUnicos.includes(selectedPeriodo) && periodosUnicos.length > 0) {
      setSelectedPeriodo(periodosUnicos[periodosUnicos.length - 1]);
    }
  }, [fretesState, tipoVisualizacao, selectedPeriodo]);

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
          localizacao: f.localizacao || "",
          mercadoria: f.mercadoria,
          variedade: f.variedade || "",
          quantidadeSacas: f.total_sacas_carregadas || 0,
          quantidadeInicial: f.total_sacas_carregadas || 0,
          precoPorTonelada: f.preco_por_tonelada || 0,
          pesoMedioSaca: f.peso_medio_saca || 25,
          safra: f.safra || "",
          colheitaFinalizada: f.colheita_finalizada || false,
        }));
      setEstoquesFazendas(fazendasFormatadas);
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
      origem: "",
      destino: "",
      motoristaId: "",
      caminhaoId: "",
      fazendaId: "",
      toneladas: "",
      valorPorTonelada: "",
      ticket: "",
    });
    setEstoqueSelecionado(null);
    setIsEditingFrete(false);
    setIsNewFreteOpen(true);
  };

  const handleOpenEditModal = () => {
    if (selectedFrete) {
      setNewFrete({
        origem: "",
        destino: selectedFrete.destino,
        motoristaId: selectedFrete.motoristaId,
        caminhaoId: selectedFrete.caminhaoId,
        fazendaId: selectedFrete.fazendaId || "",
        toneladas: selectedFrete.toneladas.toString(),
        valorPorTonelada: selectedFrete.valorPorTonelada.toString(),
        ticket: selectedFrete.ticket || "",
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
    if (!idParam) return;
    if (fretesState.length > 0) {
      const found = fretesState.find((f) => String(f.id) === String(idParam));
      if (found) {
        setNewFrete({
          origem: "",
          destino: found.destino,
          motoristaId: found.motoristaId,
          caminhaoId: found.caminhaoId,
          fazendaId: found.fazendaId || "",
          toneladas: String(found.toneladas),
          valorPorTonelada: String(found.valorPorTonelada),
          ticket: found.ticket || "",
        });
        setIsEditingFrete(true);
        setIsNewFreteOpen(true);
      }
    }
  }, [fretesParams.id, fretesState]);

  const handleSaveFrete = async () => {
    // Debug: mostrar estado atual ao tentar salvar
    console.debug("handleSaveFrete - newFrete:", newFrete, "estoqueSelecionado:", estoqueSelecionado);

    // Validar campos (trim strings, checar null/undefined)
    const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
    if (isEmpty(newFrete.destino) || isEmpty(newFrete.motoristaId) || 
        isEmpty(newFrete.caminhaoId) || isEmpty(newFrete.fazendaId) || isEmpty(newFrete.toneladas) || isEmpty(newFrete.valorPorTonelada)) {
      toast.error("❌ Preencha todos os campos obrigatórios!", {
        description: "Verifique destino, motorista, caminhão, fazenda, tonelagem e valor.",
      });
      return;
    }

    if (!estoqueSelecionado) {
      toast.error("❌ Nenhuma fazenda selecionada", {
        description: "Escolha uma fazenda com estoque disponível para continuar.",
      });
      return;
    }

    const toneladas = parseFloat(newFrete.toneladas);
    if (isNaN(toneladas) || toneladas <= 0) {
      toast.error("❌ Tonelagem inválida", {
        description: "Digite um valor maior que zero.",
      });
      return;
    }

    const valorPorTonelada = parseFloat(newFrete.valorPorTonelada);
    if (isNaN(valorPorTonelada) || valorPorTonelada <= 0) {
      toast.error("❌ Valor por tonelada inválido", {
        description: "Digite um valor maior que zero.",
      });
      return;
    }

    // Converter toneladas para sacas
    const quantidadeSacas = Math.round((toneladas * 1000) / estoqueSelecionado.pesoMedioSaca);

    // Buscar dados selecionados
    const motorista = motoristasState.find(m => m.id === newFrete.motoristaId);
    const caminhao = caminhoesState.find(c => c.id === newFrete.caminhaoId);
    const custoAbastecimento = undefined;
    const custoMotorista = undefined;

    if (!motorista || !caminhao) {
      toast.error("❌ Dados incompletos", {
        description: "Não foi possível encontrar informações do motorista ou caminhão.",
      });
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

    if (isEditingFrete) {
      toast.success("✅ Frete atualizado", {
        description: `Frete ID ${selectedFrete?.id} foi atualizado com sucesso.`,
        duration: 3000,
      });
      setIsNewFreteOpen(false);
      return;
    }

    // Preparar payload para API
    const payload = {
      origem: `${estoqueSelecionado.fazenda} - ${estoqueSelecionado.localizacao}`,
      destino: newFrete.destino,
      motorista_id: String(motorista.id),
      motorista_nome: motorista.nome,
      caminhao_id: String(caminhao.id),
      caminhao_placa: caminhao.placa,
      fazenda_id: String(newFrete.fazendaId),
      fazenda_nome: estoqueSelecionado.fazenda,
      mercadoria: estoqueSelecionado.mercadoria,
      mercadoria_id: String(estoqueSelecionado.id),
      variedade: estoqueSelecionado.variedade,
      data_frete: format(new Date(), "yyyy-MM-dd"),
      quantidade_sacas: quantidadeSacas,
      toneladas: toneladas,
      valor_por_tonelada: valorPorTonelada,
      custos: custos,
      ticket: newFrete.ticket || null,
    };

    // Criar frete via API
    const toastId = toast.loading("📦 Criando frete...");
    const res = await fretesService.criarFrete(payload);
    
    if (res.success) {
      toast.dismiss(toastId);
      const receitaTotal = toneladas * valorPorTonelada;
      toast.success("✅ Frete cadastrado com sucesso!", {
        description: `ID: ${res.data?.id} | ${toneladas}t | R$ ${receitaTotal.toLocaleString("pt-BR")}`,
        duration: 4000,
      });
      
      // Incrementar volume transportado da fazenda
      if (newFrete.fazendaId) {
        const incrementRes = await fazendasService.incrementarVolumeTransportado(
          newFrete.fazendaId,
          toneladas
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
    } else {
      toast.dismiss(toastId);
      toast.error("❌ Erro ao cadastrar frete", {
        description: res.message || "Tente novamente em alguns momentos.",
        duration: 4000,
      });
    }

    setIsNewFreteOpen(false);
    setNewFrete({
      origem: "",
      destino: "",
      motoristaId: "",
      caminhaoId: "",
      fazendaId: "",
      toneladas: "",
      valorPorTonelada: "",
      ticket: "",
    });
    setEstoqueSelecionado(null);
  };

  const parseDateBR = (value: string) => {
    if (!value) return new Date();
    
    // Formato brasileiro: dd/MM/yyyy
    if (value.includes("/")) {
      const [dia, mes, ano] = value.split("/");
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
    
    // Formato ISO completo: 2026-02-10T03:00:00.000Z ou ISO simples: 2026-02-10
    // O construtor new Date() já lida com ambos os formatos
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  };

  const formatDateDisplay = (value: string) => {
    const date = parseDateBR(value);
    if (Number.isNaN(date.getTime())) return value;
    return format(date, "dd MMM yyyy", { locale: ptBR });
  };

  const getFazendaNome = (frete: Frete) => frete.fazendaNome || frete.origem || "";

  // Normaliza nomes de fazenda removendo sufixos como " - Tupã" para evitar duplicatas
  const normalizeFazendaNome = (nome?: string) => {
    if (!nome) return "";
    return nome.split(" - ")[0].trim();
  };

  // Formata o código do frete para o padrão 'FRETE-YYYY-XXX' quando necessário
  const formatFreteCodigo = (frete: Frete) => {
    if (!frete) return "";
    // Se já estiver no padrão, retorna direto
    if (typeof frete.id === "string" && frete.id.startsWith("FRETE-")) return frete.id;

    // Tentar derivar do ano da data
    const date = parseDateBR(frete.dataFrete || "");
    const year = date.getFullYear() || new Date().getFullYear();

    // Encontrar índice entre fretesState para manter alguma estabilidade
    const idx = fretesState.findIndex((f) => f.id === frete.id);
    const seq = idx >= 0 ? idx + 1 : Math.floor(Math.random() * 900) + 100; // fallback

    return `FRETE-${year}-${String(seq).padStart(3, "0")}`;
  };

  // Função para fechar/abrir o mês
  const handleToggleFecharMes = () => {
    const mesFechado = mesesFechados.includes(selectedPeriodo);
    if (mesFechado) {
      setMesesFechados(mesesFechados.filter((m) => m !== selectedPeriodo));
      toast.success(`Mês ${selectedPeriodo} reaberto para edição`);
    } else {
      setMesesFechados([...mesesFechados, selectedPeriodo]);
      toast.success(`Mês ${selectedPeriodo} fechado com sucesso!`);
    }
  };

  // Função para exportar PDF profissional
  const handleExportarPDF = () => {
    const doc = new jsPDF();
    
    // ==================== CABEÇALHO ====================
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 50, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Caramello Logistica", 105, 18, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Fretes Inteligentes • Gestão de Fretes", 105, 25, { align: "center" });
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE FRETES", 105, 35, { align: "center" });
    
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
    doc.setFont("helvetica", "normal");
    doc.text(`Período de Referência: ${nomeFormatado}`, 105, 42, { align: "center" });
    
    doc.setFontSize(8);
    doc.text(`Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 47, { align: "center" });
    
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
    
    // Cálculos
    const totalReceita = filteredData.reduce((acc, f) => acc + toNumber(f.receita), 0);
    const totalCustos = filteredData.reduce((acc, f) => acc + toNumber(f.custos), 0);
    const totalLucro = totalReceita - totalCustos;
    const totalToneladas = filteredData.reduce((acc, f) => acc + toNumber(f.toneladas), 0);
    const qtdFretes = filteredData.length;
    
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
    const tableData = filteredData.map((f) => [
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
      head: [["ID", "Rota", "Motorista", "Carga", "Receita", "Custos", "Resultado"]],
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
      
      doc.text("Caramello Logistica - Sistema de Gestao de Fretes", 20, 285);
      doc.text(`Pagina ${i} de ${pageCount}`, 105, 285, { align: "center" });
      doc.text(`Relatorio Confidencial`, 190, 285, { align: "right" });
      
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text("Este documento foi gerado automaticamente e contem informacoes confidenciais", 105, 290, { align: "center" });
    }
    
    const nomeArquivo = `Caramello_Logistica_Fretes_${selectedPeriodo.replace("-", "_")}.pdf`;
    doc.save(nomeArquivo);
    toast.success(`PDF "${nomeArquivo}" gerado com sucesso!`, { duration: 4000 });
  };

  // Filtrar fretes por período selecionado
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

  const filteredData = fretesFiltradasPorPeriodo.filter((frete) => {
    const matchesSearch =
      frete.origem.toLowerCase().includes(search.toLowerCase()) ||
      frete.destino.toLowerCase().includes(search.toLowerCase()) ||
      frete.motorista.toLowerCase().includes(search.toLowerCase()) ||
      frete.id.toLowerCase().includes(search.toLowerCase());
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

  // Lógica de paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, motoristaFilter, caminhaoFilter, fazendaFilter, dateRange, selectedPeriodo]);

  const fazendasOptions = Array.from(
    new Set(
      fretesFiltradasPorPeriodo
        .map((f) => normalizeFazendaNome(getFazendaNome(f)))
        .filter(Boolean)
    )
  ) as string[];

  // Extrair períodos disponíveis baseado nos dados reais
  const periodosDisponiveis = useMemo(() => {
    if (!Array.isArray(fretesState)) return [];
    
    const periodos = fretesState.map((f) => {
      const freteDate = parseDateBR(f.dataFrete);
      const anoFrete = freteDate.getFullYear();
      const mesFrete = freteDate.getMonth() + 1; // 1-12
      
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
    });
    
    // Remover duplicatas e ordenar
    const periodosUnicos = Array.from(new Set(periodos)).filter(Boolean).sort();
    return periodosUnicos;
  }, [fretesState, tipoVisualizacao]);

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
            <p className="font-mono font-bold text-lg text-foreground">{formatFreteCodigo(item)}</p>
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
      header: "Motorista",
      render: (item: Frete) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-foreground truncate">{item.motorista}</span>
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
      <PageHeader
        title="Fretes"
        description="Receita é o valor total do frete. Custos são adicionais (pedágios, diárias, etc.)"
        actions={
          <div className="hidden lg:flex items-center gap-3">
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

            {/* Botão Fechar/Abrir Mês (apenas para mensal) */}
            {tipoVisualizacao === "mensal" && (
              <Button
                variant={mesesFechados.includes(selectedPeriodo) ? "outline" : "secondary"}
                onClick={handleToggleFecharMes}
                className="gap-2"
              >
                {mesesFechados.includes(selectedPeriodo) ? (
                  <>
                    <Unlock className="h-4 w-4" />
                    Reabrir Mês
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Fechar Mês
                  </>
                )}
              </Button>
            )}

            {/* Botão Exportar PDF */}
            <Button variant="outline" onClick={handleExportarPDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>

            {/* Botão Novo Frete */}
            <Button 
              onClick={handleOpenNewModal}
              disabled={tipoVisualizacao === "mensal" && mesesFechados.includes(selectedPeriodo)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Frete
            </Button>
          </div>
        }
      />

      {/* Badge de Status do Mês */}
      {tipoVisualizacao === "mensal" && mesesFechados.includes(selectedPeriodo) && (
        <div className="mb-4 flex items-center gap-2 p-2 md:p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <Lock className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs md:text-sm font-semibold text-blue-700 dark:text-blue-400">
            Este mês está fechado. Novos fretes e edições não são permitidos.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-6">
        <Card className="p-3 md:p-4 bg-muted/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Fretes no período</p>
            <Package className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground/60" />
          </div>
          <p className="text-2xl md:text-3xl font-bold">{filteredData.length}</p>
        </Card>
        <Card className="p-3 md:p-4 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Toneladas</p>
            <Weight className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-purple-600">
            {filteredData.reduce((acc, f) => acc + toNumber(f.toneladas), 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}t
          </p>
          <p className="text-xs md:text-sm font-medium text-purple-600/70 mt-1">
            {filteredData.reduce((acc, f) => acc + toNumber(f.quantidadeSacas), 0).toLocaleString("pt-BR")} sacas
          </p>
        </Card>
        <Card className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Receita total</p>
            <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
          </div>
          <p className="text-xl md:text-3xl font-bold text-blue-600">
            R$ {filteredData.reduce((acc, f) => acc + toNumber(f.receita), 0).toLocaleString("pt-BR")}
          </p>
        </Card>
        <Card className="p-3 md:p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Custos adicionais</p>
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
          </div>
          <p className="text-xl md:text-3xl font-bold text-red-600">
            R$ {filteredData.reduce((acc, f) => acc + toNumber(f.custos), 0).toLocaleString("pt-BR")}
          </p>
        </Card>
        <Card className="p-3 md:p-4 bg-profit/5 border-profit/20 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-base font-semibold text-muted-foreground">Lucro líquido</p>
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-profit" />
          </div>
          <p className="text-xl md:text-3xl font-bold text-profit">
            R$ {filteredData.reduce((acc, f) => acc + toNumber(f.resultado), 0).toLocaleString("pt-BR")}
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
                    placeholder="Ex: 0123"
                    value={newFrete.ticket}
                    onChange={(e) => setNewFrete({ ...newFrete, ticket: e.target.value })}
                  />
                </div>
              </div>

              {/* Seletor de Período */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                  <SelectTrigger>
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

              <Separator />

              {/* Filtro Motoristas */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Motoristas</Label>
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

                  {/* Botão Fechar/Abrir Mês (apenas para mensal) */}
                  {tipoVisualizacao === "mensal" && (
                    <Button
                      variant={mesesFechados.includes(selectedPeriodo) ? "outline" : "secondary"}
                      onClick={() => {
                        handleToggleFecharMes();
                        setFiltersOpen(false);
                      }}
                      className="w-full gap-2"
                    >
                      {mesesFechados.includes(selectedPeriodo) ? (
                        <>
                          <Unlock className="h-4 w-4" />
                          Reabrir Mês
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Fechar Mês
                        </>
                      )}
                    </Button>
                  )}
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
        searchPlaceholder="Buscar por ID, origem, destino ou motorista..."
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Motoristas</Label>
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
                  "w-[220px] justify-start text-left font-normal",
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
        disabled={tipoVisualizacao === "mensal" && mesesFechados.includes(selectedPeriodo)}
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

      {/* Data Table */}
      {!isLoadingFretes && fretesState.length > 0 && (
        <>
          <DataTable<Frete>
            columns={columns}
            data={paginatedData}
            onRowClick={(item) => setSelectedFrete(item)}
            highlightNegative={(item) => toNumber(item.resultado) < 0}
            emptyMessage="Nenhum frete encontrado com os filtros aplicados"
            mobileCardTitle={(item) => (
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">{formatFreteCodigo(item)}</span>
                <span className="text-xs text-muted-foreground">{item.dataFrete}</span>
              </div>
            )}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <>
              {/* Mobile Pagination: Simple Prev/Next */}
              <div className="mt-6 md:hidden">
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="outline"
                    size="sm"
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {filteredData.length} registros
                </p>
              </div>

              {/* Desktop Pagination: Full */}
              <div className="mt-6 hidden md:flex items-center justify-center gap-4">
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
          <div className="text-xs text-muted-foreground flex items-center">
            Página {currentPage} de {totalPages} • {filteredData.length} registros
          </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Frete Detail Modal */}
      <Dialog open={!!selectedFrete} onOpenChange={() => setSelectedFrete(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                Frete {selectedFrete?.id}
              </DialogTitle>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEditModal}
                  className="gap-2 mr-3"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-200px)] overflow-y-auto space-y-6 px-1">
          {selectedFrete && (
            <>
              {/* Route Info */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-l-4 border-l-primary">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Origem</p>
                      <p className="font-semibold">{selectedFrete.origem}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p className="font-semibold">{selectedFrete.destino}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <p className="text-xs text-muted-foreground">Motorista</p>
                  </div>
                  <p className="font-semibold text-lg text-foreground">{selectedFrete.motorista}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedFrete.caminhao}</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-green-600" />
                    <p className="text-xs text-muted-foreground">Mercadoria</p>
                  </div>
                  <p className="font-semibold text-foreground">{selectedFrete.mercadoria}</p>
                  <p className="text-xs text-muted-foreground mt-1">{toNumber(selectedFrete.quantidadeSacas)} sacas • {toNumber(selectedFrete.toneladas).toFixed(2)} ton • R$ {toNumber(selectedFrete.valorPorTonelada).toLocaleString("pt-BR")}/t</p>
                </Card>

                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">ID do Frete</p>
                  </div>
                  <p className="font-mono font-bold text-foreground">{selectedFrete.id}</p>
                </Card>
                <Card className="p-4 bg-primary/5 border-l-4 border-l-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Ticket (Romaneio)</p>
                  </div>
                  <p className="font-mono font-semibold text-foreground">{selectedFrete.ticket || "—"}</p>
                </Card>
              </div>

              <Separator />

              {/* Financial Summary */}
              <div>
                <h4 className="font-semibold mb-4">Resumo Financeiro</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">RECEITA TOTAL</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      R$ {toNumber(selectedFrete.receita).toLocaleString("pt-BR")}
                    </p>
                  </Card>

                  <Card className="p-4 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-red-600" />
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">CUSTOS ADICIONAIS</p>
                    </div>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      R$ {toNumber(selectedFrete.custos).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-[10px] text-red-600/80 mt-1">Pedágios, combustível, diárias, etc.</p>
                  </Card>

                  <Card className={`p-4 ${toNumber(selectedFrete.resultado) >= 0 
                    ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900" 
                    : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`h-4 w-4 ${toNumber(selectedFrete.resultado) >= 0 ? "text-green-600" : "text-red-600"}`} />
                      <p className={`text-xs font-semibold ${toNumber(selectedFrete.resultado) >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>LUCRO LÍQUIDO</p>
                    </div>
                    <p className={`text-3xl font-bold ${toNumber(selectedFrete.resultado) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {toNumber(selectedFrete.resultado) >= 0 ? "+" : ""}R$ {toNumber(selectedFrete.resultado).toLocaleString("pt-BR")}
                    </p>
                  </Card>
                </div>
              </div>

              {/* Custos Adicionais */}
              <div>
                <h4 className="font-semibold mb-4">Custos Adicionais</h4>
                {(() => {
                  const fretesCustos = custosData.filter(c => c.freteId === selectedFrete.id);
                  const totalCustos = fretesCustos.reduce((sum, c) => sum + c.valor, 0);
                  
                  if (fretesCustos.length === 0) {
                    return (
                      <Card className="p-6 border-dashed border-2 bg-muted/30">
                        <div className="flex flex-col items-center justify-center text-center">
                          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhum custo adicional registrado para este frete</p>
                        </div>
                      </Card>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {fretesCustos.map((custo) => {
                        const config = tipoConfig[custo.tipo];
                        const Icon = config.icon;
                        return (
                          <Card key={custo.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex gap-3 flex-1">
                                <div className={`${config.color} p-2 rounded-lg bg-muted`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-sm">{config.label}</p>
                                    {custo.comprovante && (
                                      <Badge variant="outline" className="text-[10px]">Comprovado</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{custo.descricao}</p>
                                  {custo.observacoes && (
                                    <p className="text-xs text-muted-foreground mt-1">{custo.observacoes}</p>
                                  )}
                                  {custo.tipo === "combustivel" && custo.litros && (
                                    <p className="text-xs text-muted-foreground mt-1">💧 {custo.litros.toLocaleString("pt-BR")} L de {custo.tipoCombustivel}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <p className="font-bold text-red-600">-R$ {custo.valor.toLocaleString("pt-BR")}</p>
                                <p className="text-[10px] text-muted-foreground">{custo.data}</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                      <Card className="p-4 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Total de Custos</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">R$ {totalCustos.toLocaleString("pt-BR")}</p>
                        </div>
                      </Card>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New/Edit Frete Modal */}
      <Dialog open={isNewFreteOpen} onOpenChange={setIsNewFreteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              {isEditingFrete ? "Editar Frete" : "Criar Novo Frete"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto px-1">
            {/* Seção: Fazenda de Origem */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-green-600" />
                <h3 className="font-semibold text-green-600">Fazenda de Origem</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="fazenda" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    Selecione a Fazenda de Origem *
                  </Label>
                  <Select 
                    value={newFrete.fazendaId} 
                    onValueChange={(v) => {
                      const estoque = estoquesFazendas.find(e => e.id === v);
                      setEstoqueSelecionado(estoque || null);
                      setNewFrete({ 
                        ...newFrete, 
                        fazendaId: estoque?.fazendaId || v,
                        valorPorTonelada: estoque ? estoque.precoPorTonelada.toString() : ""
                      });
                    }}
                  >
                    <SelectTrigger id="fazenda">
                      <SelectValue placeholder="Selecione a fazenda produtora" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {!Array.isArray(estoquesFazendas) || estoquesFazendas.length === 0 ? (
                        <SelectItem value="none" disabled>Nenhuma fazenda cadastrada</SelectItem>
                      ) : (
                        estoquesFazendas.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {normalizeFazendaNome(e.fazenda)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview do Estoque Selecionado */}
                {estoqueSelecionado && (
                  <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 dark:from-green-950/20 dark:to-green-900/10 dark:border-green-800">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-semibold text-green-700 dark:text-green-300">Informações da Fazenda Selecionada</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Localização:</p>
                          <p className="font-medium">{estoqueSelecionado.localizacao}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Mercadoria:</p>
                          <p className="font-medium">{estoqueSelecionado.mercadoria}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Variedade:</p>
                          <p className="font-medium">{estoqueSelecionado.variedade}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Safra:</p>
                          <p className="font-medium">{estoqueSelecionado.safra}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Preço por Tonelada:</p>
                          <p className="font-bold text-green-700 dark:text-green-400">R$ {estoqueSelecionado.precoPorTonelada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Peso Médio/Saca:</p>
                          <p className="font-medium">{estoqueSelecionado.pesoMedioSaca}kg</p>
                        </div>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>ℹ️ Nota:</strong> A produção desta fazenda será incrementada automaticamente ao cadastrar o frete.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Seção: Destino */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <h3 className="font-semibold text-foreground">Destino</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destino" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Local de Entrega *
                </Label>
                <Select
                  value={newFrete.destino}
                  onValueChange={(value) => setNewFrete({ ...newFrete, destino: value })}
                >
                  <SelectTrigger id="destino">
                    <SelectValue placeholder="Selecione o local de entrega" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {locaisEntregaFixos.map((local) => (
                      <SelectItem key={local} value={local}>
                        {local}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2 mt-2">
                  <Label htmlFor="ticket-frete" className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Ticket (balança)
                  </Label>
                  <Input
                    id="ticket-frete"
                    placeholder="Ex: TCK-12345"
                    value={newFrete.ticket}
                    onChange={(e) => setNewFrete({ ...newFrete, ticket: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Seção: Equipe */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <h3 className="font-semibold text-foreground">Equipe & Veículo</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="motorista" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Motorista *
                  </Label>
                  <Select 
                    value={newFrete.motoristaId} 
                    onValueChange={(v) => {
                      // Buscar caminhão que tem esse motorista como fixo
                      const caminhaoDoMotorista = caminhoesState.find(c => c.motorista_fixo_id === v);
                      
                      // Se encontrou caminhão fixo, preencher automaticamente
                      if (caminhaoDoMotorista) {
                        setNewFrete({ 
                          ...newFrete, 
                          motoristaId: v,
                          caminhaoId: caminhaoDoMotorista.id 
                        });
                        toast.info(`Caminhão ${caminhaoDoMotorista.placa} preenchido automaticamente`);
                      } else {
                        setNewFrete({ ...newFrete, motoristaId: v, caminhaoId: "" });
                      }
                    }}
                  >
                    <SelectTrigger id="motorista">
                      <SelectValue placeholder="Selecione um motorista" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {Array.isArray(motoristasState) && motoristasState.map((m) => {
                        const caminhaoFixo = caminhoesState.find(c => c.motorista_fixo_id === m.id);
                        return (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                            {caminhaoFixo && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({caminhaoFixo.placa})
                              </span>
                            )}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caminhao" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Caminhão *
                  </Label>
                  {(() => {
                    // Busca o caminhão que tem este motorista como fixo
                    const caminhaoFixo = caminhoesState.find(c => c.motorista_fixo_id === newFrete.motoristaId);
                    
                    if (caminhaoFixo) {
                      return (
                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="font-medium">{caminhaoFixo.placa}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Fixo</span>
                        </div>
                      );
                    }
                    
                    return (
                      <Select 
                        value={newFrete.caminhaoId} 
                        onValueChange={(v) => setNewFrete({ ...newFrete, caminhaoId: v })}
                      >
                        <SelectTrigger id="caminhao">
                          <SelectValue placeholder="Selecione um caminhão" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(caminhoesState) && caminhoesState.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.placa}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Seção: Carga */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-blue-600" />
                <h3 className="font-semibold text-blue-600">Quantidade de Carga</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="toneladas" className="flex items-center gap-2">
                    <Weight className="h-4 w-4 text-blue-600" />
                    Toneladas *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      t
                    </span>
                    <Input
                      id="toneladas"
                      type="number"
                      placeholder="Ex: 10.5"
                      step="0.1"
                      min="0.1"
                      className="pl-8"
                      value={newFrete.toneladas}
                      onChange={(e) => setNewFrete({ ...newFrete, toneladas: e.target.value })}
                      disabled={!estoqueSelecionado}
                    />
                  </div>
                  {estoqueSelecionado && newFrete.toneladas && (
                    <p className="text-xs text-blue-600">
                      ≈ {Math.round((parseFloat(newFrete.toneladas) * 1000) / estoqueSelecionado.pesoMedioSaca).toLocaleString("pt-BR")} sacas ({estoqueSelecionado.pesoMedioSaca}kg cada)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorTonelada" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Valor por Tonelada (R$) *
                  </Label>
                  <Input
                    id="valorTonelada"
                    type="number"
                    placeholder="Ex: 600.00"
                    step="0.01"
                    min="0.01"
                    value={newFrete.valorPorTonelada}
                    onChange={(e) => setNewFrete({ ...newFrete, valorPorTonelada: e.target.value })}
                    disabled={!estoqueSelecionado}
                    className="bg-blue-50 dark:bg-blue-950/20"
                  />
                  {estoqueSelecionado && (
                    <p className="text-xs text-blue-600">
                      ✓ Preço cadastrado na fazenda: R$ {estoqueSelecionado.precoPorTonelada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/ton
                    </p>
                  )}
                </div>

                {/* Preview da Carga */}
                {estoqueSelecionado && newFrete.toneladas && parseFloat(newFrete.toneladas) > 0 && newFrete.valorPorTonelada && parseFloat(newFrete.valorPorTonelada) > 0 && (
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-semibold text-blue-700">Estimativa do Frete</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Toneladas</p>
                          <p className="font-bold text-foreground">
                            {parseFloat(newFrete.toneladas).toFixed(2)} t
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Sacas (aproximado)</p>
                          <p className="font-bold text-foreground">
                            {Math.round((parseFloat(newFrete.toneladas) * 1000) / estoqueSelecionado.pesoMedioSaca).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Receita Estimada</p>
                          <p className="font-bold text-profit">
                            R$ {(parseFloat(newFrete.toneladas) * parseFloat(newFrete.valorPorTonelada)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setIsNewFreteOpen(false);
                setNewFrete({
                  origem: "",
                  destino: "",
                  motoristaId: "",
                  caminhaoId: "",
                  fazendaId: "",
                  toneladas: "",
                  valorPorTonelada: "",
                  ticket: "",
                });
                setEstoqueSelecionado(null);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveFrete}>
              <Save className="h-4 w-4 mr-2" />
              {isEditingFrete ? "Salvar Alterações" : "Criar Frete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}