import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { Plus, MapPin, ArrowRight, Truck, Package, DollarSign, TrendingUp, Edit, Save, X, Weight, Info, Calendar as CalendarIcon, Fuel, Wrench, AlertCircle, FileDown, Lock, Unlock } from "lucide-react";
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
}

interface EstoqueFazenda {
  id: string;
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

interface NotaFiscal {
  id: string;
  freteId: string;
  numeroNf: string;
  serieNf: string;
  dataEmissao: string;
  dataSaida?: string;
  dataEntrega?: string;
  status: "emitida" | "cancelada" | "devolvida";
  chaveAcesso?: string;
  valorBruto: number;
  icmsAliquota: number;
  icmsValor: number;
  valorLiquido: number;
  arquivoPdf?: string;
  arquivoXml?: string;
  observacoes?: string;
}

const fretesData: Frete[] = [
  {
    id: "FRETE-2026-001",
    origem: "Fazenda Santa Rita",
    destino: "Secador Central - Filial 1",
    motorista: "Carlos Silva",
    motoristaId: "1",
    caminhao: "ABC-1234",
    caminhaoId: "1",
    mercadoria: "Amendoim em Casca",
    mercadoriaId: "1",
    fazendaNome: "Fazenda Santa Rita",
    dataFrete: "20/01/2026",
    quantidadeSacas: 450,
    toneladas: 11.25,
    valorPorTonelada: 600,
    receita: 6750, // 11.25t × R$ 600/t
    custos: 1720,
    resultado: 5030,
  },
  {
    id: "FRETE-2026-002",
    origem: "Fazenda Boa Esperança",
    destino: "Secador Central - Filial 2",
    motorista: "João Oliveira",
    motoristaId: "2",
    caminhao: "DEF-5678",
    caminhaoId: "2",
    mercadoria: "Amendoim Descascado",
    mercadoriaId: "2",
    fazendaNome: "Fazenda Boa Esperança",
    dataFrete: "18/01/2026",
    quantidadeSacas: 380,
    toneladas: 9.5,
    valorPorTonelada: 800,
    receita: 7600, // 9.5t × R$ 800/t
    custos: 1690,
    resultado: 5910,
  },
  {
    id: "FRETE-2026-003",
    origem: "Fazenda Vale Verde",
    destino: "Secador Central - Filial 1",
    motorista: "Pedro Santos",
    motoristaId: "3",
    caminhao: "GHI-9012",
    caminhaoId: "3",
    mercadoria: "Amendoim em Casca",
    mercadoriaId: "1",
    fazendaNome: "Fazenda Vale Verde",
    dataFrete: "15/01/2026",
    quantidadeSacas: 500,
    toneladas: 12.5,
    valorPorTonelada: 600,
    receita: 7500, // 12.5t × R$ 600/t
    custos: 0,
    resultado: 7500,
  },
  {
    id: "FRETE-2026-004",
    origem: "Fazenda São João",
    destino: "Secador Central - Filial 3",
    motorista: "André Costa",
    motoristaId: "4",
    caminhao: "JKL-3456",
    caminhaoId: "4",
    mercadoria: "Amendoim Premium",
    mercadoriaId: "3",
    fazendaNome: "Fazenda São João",
    dataFrete: "12/01/2026",
    quantidadeSacas: 300,
    toneladas: 7.5,
    valorPorTonelada: 1000,
    receita: 7500, // 7.5t × R$ 1000/t
    custos: 1720,
    resultado: 5780,
  },
  {
    id: "FRETE-2026-005",
    origem: "Fazenda Recanto",
    destino: "Secador Central - Filial 2",
    motorista: "Lucas Ferreira",
    motoristaId: "5",
    caminhao: "MNO-7890",
    caminhaoId: "5",
    mercadoria: "Amendoim em Casca",
    mercadoriaId: "1",
    fazendaNome: "Fazenda Recanto",
    dataFrete: "10/01/2026",
    quantidadeSacas: 0,
    toneladas: 0,
    valorPorTonelada: 0,
    receita: 0,
    custos: 0,
    resultado: 0,
  },
];

// Data demo de motoristas
const motoristasData: Motorista[] = [
  { id: "1", nome: "Carlos Silva" },
  { id: "2", nome: "João Oliveira" },
  { id: "3", nome: "Pedro Santos" },
  { id: "4", nome: "André Costa" },
  { id: "5", nome: "Lucas Ferreira" },
];

// Data demo de caminhões
const caminhoesData: Caminhao[] = [
  { id: "1", placa: "ABC-1234" },
  { id: "2", placa: "DEF-5678" },
  { id: "3", placa: "GHI-9012" },
  { id: "4", placa: "JKL-3456" },
  { id: "5", placa: "MNO-7890" },
];

const locaisEntregaFixos = [
  "Matriz, Tupã SP",
  "Filial 1, Tupã SP",
  "Filial 2, Tupã SP",
  "Filial 3 - MT",
  "Filial 4, Tupã SP",
];

// Data demo de mercadorias com tarifas
const mercadoriasData: Mercadoria[] = [
  { id: "1", nome: "Amendoim em Casca", tarifaPorSaca: 15, pesoMedioSaca: 25 },
  { id: "2", nome: "Amendoim Descascado", tarifaPorSaca: 20, pesoMedioSaca: 25 },
  { id: "3", nome: "Amendoim Premium", tarifaPorSaca: 25, pesoMedioSaca: 25 },
  { id: "4", nome: "Amendoim Tipo 1", tarifaPorSaca: 18, pesoMedioSaca: 25 },
  { id: "5", nome: "Amendoim Tipo 2", tarifaPorSaca: 16, pesoMedioSaca: 25 },
];

// Custos de abastecimento por caminhão (litro)
const custosAbastecimentoPorCaminhao: CustoAbastecimento[] = [
  { id: "1", custoLitro: 5.50 }, // ABC-1234
  { id: "2", custoLitro: 5.30 }, // DEF-5678
  { id: "3", custoLitro: 5.80 }, // GHI-9012
  { id: "4", custoLitro: 5.40 }, // JKL-3456
  { id: "5", custoLitro: 5.60 }, // MNO-7890
];

// Custos de motorista (diária + adicional pernoite)
const custosPorMotorista: CustoMotorista[] = [
  { motoristaId: "1", diaria: 150, adicionalPernoite: 80 }, // Carlos Silva
  { motoristaId: "2", diaria: 140, adicionalPernoite: 75 }, // João Oliveira
  { motoristaId: "3", diaria: 160, adicionalPernoite: 85 }, // Pedro Santos
  { motoristaId: "4", diaria: 145, adicionalPernoite: 78 }, // André Costa
  { motoristaId: "5", diaria: 155, adicionalPernoite: 82 }, // Lucas Ferreira
];

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

// Dados demo de notas fiscais
const notasFiscaisData: NotaFiscal[] = [
  {
    id: "NF-2026-001",
    freteId: "FRETE-2026-001",
    numeroNf: "1001",
    serieNf: "1",
    dataEmissao: "20/01/2026",
    dataSaida: "2026-01-20T06:30",
    dataEntrega: "2026-01-20T14:45",
    status: "emitida",
    chaveAcesso: "35260193151816000160550010001001001234567890",
    valorBruto: 7600,
    icmsAliquota: 18,
    icmsValor: 1368,
    valorLiquido: 6232,
    arquivoPdf: "/docs/nf/NF-2026-001.pdf",
    observacoes: "Frete realizado conforme contrato. Carga verificada.",
  },
  {
    id: "NF-2026-002",
    freteId: "FRETE-2026-002",
    numeroNf: "1002",
    serieNf: "1",
    dataEmissao: "18/01/2026",
    dataSaida: "2026-01-18T07:00",
    dataEntrega: "2026-01-18T15:20",
    status: "emitida",
    chaveAcesso: "35260193151816000160550010001002001234567891",
    valorBruto: 7600,
    icmsAliquota: 18,
    icmsValor: 1368,
    valorLiquido: 6232,
    arquivoPdf: "/docs/nf/NF-2026-002.pdf",
    observacoes: "Produto de qualidade premium. Entrega no horário.",
  },
  {
    id: "NF-2026-003",
    freteId: "FRETE-2026-003",
    numeroNf: "1003",
    serieNf: "1",
    dataEmissao: "15/01/2026",
    dataSaida: "2026-01-15T06:00",
    dataEntrega: "2026-01-15T13:30",
    status: "emitida",
    chaveAcesso: "35260193151816000160550010001003001234567892",
    valorBruto: 7500,
    icmsAliquota: 18,
    icmsValor: 1350,
    valorLiquido: 6150,
    arquivoPdf: "/docs/nf/NF-2026-003.pdf",
    observacoes: "Rota executada sem incidentes.",
  },
  {
    id: "NF-2026-004",
    freteId: "FRETE-2026-004",
    numeroNf: "1004",
    serieNf: "1",
    dataEmissao: "12/01/2026",
    dataSaida: "2026-01-12T08:00",
    dataEntrega: "2026-01-12T18:15",
    status: "emitida",
    chaveAcesso: "35260193151816000160550010001004001234567893",
    valorBruto: 7500,
    icmsAliquota: 18,
    icmsValor: 1350,
    valorLiquido: 6150,
    arquivoPdf: "/docs/nf/NF-2026-004.pdf",
    observacoes: "Produto com certificação especial.",
  },
  {
    id: "NF-2026-005",
    freteId: "FRETE-2026-005",
    numeroNf: "1005",
    serieNf: "1",
    dataEmissao: "10/01/2026",
    dataSaida: "2026-01-10T05:30",
    dataEntrega: "2026-01-10T14:00",
    status: "emitida",
    chaveAcesso: "35260193151816000160550010001005001234567894",
    valorBruto: 8400,
    icmsAliquota: 18,
    icmsValor: 1512,
    valorLiquido: 6888,
    arquivoPdf: "/docs/nf/NF-2026-005.pdf",
    observacoes: "Frete de retorno com carga completa.",
  },
];

export default function Fretes() {
  const [search, setSearch] = useState("");
  const [motoristaFilter, setMotoristaFilter] = useState("all");
  const [caminhaoFilter, setCaminhaoFilter] = useState("all");
  const [fazendaFilter, setFazendaFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedFrete, setSelectedFrete] = useState<Frete | null>(null);
  const [isNewFreteOpen, setIsNewFreteOpen] = useState(false);
  const [isEditingFrete, setIsEditingFrete] = useState(false);
  const [fretesState, setFretesState] = useState<Frete[]>(fretesData);
  const [newFrete, setNewFrete] = useState({
    origem: "",
    destino: "",
    motoristaId: "",
    caminhaoId: "",
    fazendaId: "",
    toneladas: "",
    valorPorTonelada: "",
  });
  const [estoquesFazendas, setEstoquesFazendas] = useState<EstoqueFazenda[]>([]);
  const [estoqueSelecionado, setEstoqueSelecionado] = useState<EstoqueFazenda | null>(null);
  
  // Estados para Exercício (Ano/Mês) e Fechamento
  const [selectedPeriodo, setSelectedPeriodo] = useState("2026-01"); // Janeiro 2026
  const [mesesFechados, setMesesFechados] = useState<string[]>([]); // Meses que já foram fechados
  
  // Dados históricos para comparação (simulado - mes anterior)
  const dadosMesAnterior = {
    periodo: "2025-12",
    totalReceita: 45800,
    totalCustos: 8900,
    totalFretes: 12,
  };

  const handleOpenNewModal = () => {
    // Buscar fazendas de produção disponíveis
    const getProducao = (window as any).getProducaoFazendas;
    if (getProducao) {
      const producao = getProducao() as EstoqueFazenda[];
      setEstoquesFazendas(producao.filter((p) => !p.colheitaFinalizada));
    }
    
    setNewFrete({
      origem: "",
      destino: "",
      motoristaId: "",
      caminhaoId: "",
      fazendaId: "",
      toneladas: "",
      valorPorTonelada: "",
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
      });
      setIsEditingFrete(true);
      setSelectedFrete(null);
      setIsNewFreteOpen(true);
    }
  };

  const handleSaveFrete = () => {
    // Validar campos
    if (!newFrete.destino || !newFrete.motoristaId || 
        !newFrete.caminhaoId || !newFrete.fazendaId || !newFrete.toneladas || !newFrete.valorPorTonelada) {
      toast.error("Preencha todos os campos!");
      return;
    }

    if (!estoqueSelecionado) {
      toast.error("Selecione uma fazenda com estoque disponível!");
      return;
    }

    const toneladas = parseFloat(newFrete.toneladas);
    if (isNaN(toneladas) || toneladas <= 0) {
      toast.error("Tonelagem inválida!");
      return;
    }

    const valorPorTonelada = parseFloat(newFrete.valorPorTonelada);
    if (isNaN(valorPorTonelada) || valorPorTonelada <= 0) {
      toast.error("Valor por tonelada inválido!");
      return;
    }

    // Converter toneladas para sacas
    const quantidadeSacas = Math.round((toneladas * 1000) / estoqueSelecionado.pesoMedioSaca);

    // Buscar dados selecionados
    const motorista = motoristasData.find(m => m.id === newFrete.motoristaId);
    const caminhao = caminhoesData.find(c => c.id === newFrete.caminhaoId);
    const custoAbastecimento = custosAbastecimentoPorCaminhao.find(c => c.id === newFrete.caminhaoId);
    const custoMotorista = custosPorMotorista.find(m => m.motoristaId === newFrete.motoristaId);

    if (!motorista || !caminhao || !custoAbastecimento || !custoMotorista) return;

    // Calcular receita
    const receita = toneladas * valorPorTonelada;
    const distanciaEstimada = 500;
    const combustivelNecess = distanciaEstimada / 5;
    const custoCombustivel = combustivelNecess * custoAbastecimento.custoLitro;
    const custoMotoristaTotal = custoMotorista.diaria;
    const custos = Math.floor(custoCombustivel + custoMotoristaTotal);
    const resultado = receita - custos;

    if (isEditingFrete) {
      toast.success("Frete atualizado com sucesso!");
    } else {
      // Adicionar produção à fazenda (incrementa sacas, toneladas e faturamento)
      const adicionarProducao = (window as any).adicionarProducao;
      if (adicionarProducao) {
        adicionarProducao(estoqueSelecionado.id, quantidadeSacas, receita, toneladas);
      }

      // Buscar o ID da fazenda a partir dos dados do window
      const getFazendas = (window as any).getFazendas;
      let fazendaIdReal = newFrete.fazendaId;
      if (getFazendas) {
        const fazendas = getFazendas();
        const fazendaEncontrada = fazendas.find((f: any) => 
          f.nome.toLowerCase() === estoqueSelecionado.fazenda.toLowerCase()
        );
        if (fazendaEncontrada) {
          fazendaIdReal = fazendaEncontrada.id;
        }
      }

      const novoFrete: Frete = {
        id: `#${Math.floor(Math.random() * 1000) + 1200}`,
        origem: `${estoqueSelecionado.fazenda} - ${estoqueSelecionado.localizacao}`,
        destino: newFrete.destino,
        motorista: motorista.nome,
        motoristaId: motorista.id,
        caminhao: caminhao.placa,
        caminhaoId: caminhao.id,
        mercadoria: estoqueSelecionado.mercadoria,
        mercadoriaId: estoqueSelecionado.id,
        fazendaId: fazendaIdReal,
        fazendaNome: estoqueSelecionado.fazenda,
        variedade: estoqueSelecionado.variedade,
        dataFrete: new Date().toLocaleDateString("pt-BR"),
        quantidadeSacas: quantidadeSacas,
        toneladas: toneladas,
        valorPorTonelada: valorPorTonelada,
        receita,
        custos,
        resultado,
      };

      setFretesState([novoFrete, ...fretesState]);
      toast.success(`Frete cadastrado! Produção da fazenda atualizada: +${quantidadeSacas.toLocaleString("pt-BR")} sacas (+${toneladas.toFixed(2)}t)`);
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
    });
    setEstoqueSelecionado(null);
  };

  const parseDateBR = (value: string) => {
    const [dia, mes, ano] = value.split("/");
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  };

  const formatDateDisplay = (value: string) => {
    const date = parseDateBR(value);
    if (Number.isNaN(date.getTime())) return value;
    return format(date, "dd MMM yyyy", { locale: ptBR });
  };

  const getFazendaNome = (frete: Frete) => frete.fazendaNome || frete.origem || "";

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
    doc.text("RN LOGÍSTICA", 105, 18, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Fretes Inteligentes • Gestão de Fretes", 105, 25, { align: "center" });
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE FRETES", 105, 35, { align: "center" });
    
    const [ano, mes] = selectedPeriodo.split("-");
    const nomeMes = format(new Date(parseInt(ano), parseInt(mes) - 1), "MMMM yyyy", { locale: ptBR });
    const nomeFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    
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
    const totalReceita = filteredData.reduce((acc, f) => acc + f.receita, 0);
    const totalCustos = filteredData.reduce((acc, f) => acc + f.custos, 0);
    const totalLucro = filteredData.reduce((acc, f) => acc + f.resultado, 0);
    const totalToneladas = filteredData.reduce((acc, f) => acc + f.toneladas, 0);
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
      `${f.toneladas}t`,
      `R$ ${f.receita.toLocaleString("pt-BR")}`,
      `R$ ${f.custos.toLocaleString("pt-BR")}`,
      `R$ ${f.resultado.toLocaleString("pt-BR")}`,
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
      
      doc.text("RN Logistica - Sistema de Gestao de Fretes", 20, 285);
      doc.text(`Pagina ${i} de ${pageCount}`, 105, 285, { align: "center" });
      doc.text(`Relatorio Confidencial`, 190, 285, { align: "right" });
      
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text("Este documento foi gerado automaticamente e contem informacoes confidenciais", 105, 290, { align: "center" });
    }
    
    const nomeArquivo = `RN_Logistica_Fretes_${selectedPeriodo.replace("-", "_")}.pdf`;
    doc.save(nomeArquivo);
    toast.success(`PDF "${nomeArquivo}" gerado com sucesso!`, { duration: 4000 });
  };

  // Filtrar fretes por período selecionado
  const fretesFiltradasPorPeriodo = useMemo(() => {
    return fretesState.filter((f) => {
      const [dia, mes, ano] = f.dataFrete.split("/");
      const periodoItem = `${ano}-${mes}`;
      return periodoItem === selectedPeriodo;
    });
  }, [selectedPeriodo, fretesState]);

  const filteredData = fretesFiltradasPorPeriodo.filter((frete) => {
    const matchesSearch =
      frete.origem.toLowerCase().includes(search.toLowerCase()) ||
      frete.destino.toLowerCase().includes(search.toLowerCase()) ||
      frete.motorista.toLowerCase().includes(search.toLowerCase()) ||
      frete.id.toLowerCase().includes(search.toLowerCase());
    const matchesMotorista = motoristaFilter === "all" || frete.motoristaId === motoristaFilter;
    const matchesCaminhao = caminhaoFilter === "all" || frete.caminhaoId === caminhaoFilter;
    const matchesFazenda = fazendaFilter === "all" || getFazendaNome(frete) === fazendaFilter;
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

  const fazendasOptions = Array.from(
    new Set(fretesFiltradasPorPeriodo.map((f) => getFazendaNome(f)).filter(Boolean))
  ) as string[];

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
            <p className="font-mono font-bold text-lg text-foreground">{item.id}</p>
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
              <span className="font-semibold text-primary">{item.quantidadeSacas.toLocaleString("pt-BR")}</span>
              <span>sacas</span>
              <span className="mx-0.5">•</span>
              <Weight className="h-3 w-3 flex-shrink-0" />
              <span className="font-semibold text-primary">{item.toneladas.toFixed(2)}t</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-profit flex-shrink-0" />
              <span className="font-semibold text-profit">R$ {item.valorPorTonelada.toLocaleString("pt-BR")}/t</span>
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
            <span className="font-bold text-blue-600">R$ {item.receita.toLocaleString("pt-BR")}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">Custos adicionais:</span>
            <span className="font-bold text-red-600">R$ {item.custos.toLocaleString("pt-BR")}</span>
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
        const percentualLucro = item.receita > 0 ? ((item.resultado / item.receita) * 100).toFixed(0) : "0";
        return (
          <div className="space-y-2">
            <Badge 
              variant={item.resultado >= 0 ? "profit" : "loss"} 
              className="w-fit font-bold text-lg px-3 py-1"
            >
              {item.resultado >= 0 ? "+" : ""}R$ {item.resultado.toLocaleString("pt-BR")}
            </Badge>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.resultado >= 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(Math.abs(parseInt(percentualLucro)), 100)}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${item.resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
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
          <div className="flex items-center gap-3">
            {/* Seletor de Exercício (Ano/Mês) */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Exercício:</Label>
              <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-11">Novembro 2025</SelectItem>
                  <SelectItem value="2025-12">Dezembro 2025</SelectItem>
                  <SelectItem value="2026-01">Janeiro 2026</SelectItem>
                  <SelectItem value="2026-02">Fevereiro 2026</SelectItem>
                  <SelectItem value="2026-03">Março 2026</SelectItem>
                  <SelectItem value="2027-01">Janeiro 2027</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Fechar/Abrir Mês */}
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

            {/* Botão Exportar PDF */}
            <Button variant="outline" onClick={handleExportarPDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>

            {/* Botão Novo Frete */}
            <Button 
              onClick={handleOpenNewModal}
              disabled={mesesFechados.includes(selectedPeriodo)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Frete
            </Button>
          </div>
        }
      />

      {/* Badge de Status do Mês */}
      {mesesFechados.includes(selectedPeriodo) && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <Lock className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
            Este mês está fechado. Novos fretes e edições não são permitidos.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <Card className="p-4 bg-muted/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-muted-foreground">Fretes no período</p>
            <Package className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <p className="text-3xl font-bold">{filteredData.length}</p>
        </Card>
        <Card className="p-4 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-muted-foreground">Toneladas</p>
            <Weight className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {filteredData.reduce((acc, f) => acc + f.toneladas, 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}t
          </p>
          <p className="text-sm font-medium text-purple-600/70 mt-1">
            {filteredData.reduce((acc, f) => acc + f.quantidadeSacas, 0).toLocaleString("pt-BR")} sacas
          </p>
        </Card>
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-muted-foreground">Receita total</p>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            R$ {filteredData.reduce((acc, f) => acc + f.receita, 0).toLocaleString("pt-BR")}
          </p>
        </Card>
        <Card className="p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-muted-foreground">Custos adicionais</p>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            R$ {filteredData.reduce((acc, f) => acc + f.custos, 0).toLocaleString("pt-BR")}
          </p>
        </Card>
        <Card className="p-4 bg-profit/5 border-profit/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-muted-foreground">Lucro líquido</p>
            <TrendingUp className="h-5 w-5 text-profit" />
          </div>
          <p className="text-3xl font-bold text-profit">
            R$ {filteredData.reduce((acc, f) => acc + f.resultado, 0).toLocaleString("pt-BR")}
          </p>
        </Card>
      </div>

      <FilterBar
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
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {motoristasData.map((m) => (
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
              {caminhoesData.map((c) => (
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
            <SelectContent>
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

      <DataTable<Frete>
        columns={columns}
        data={filteredData}
        onRowClick={(item) => setSelectedFrete(item)}
        highlightNegative={(item) => item.resultado < 0}
        emptyMessage="Nenhum frete encontrado"
      />

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
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditModal}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
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
                  <p className="text-xs text-muted-foreground mt-1">{selectedFrete.quantidadeSacas} sacas • {selectedFrete.toneladas.toFixed(2)} ton • R$ {selectedFrete.valorPorTonelada.toLocaleString("pt-BR")}/t</p>
                </Card>

                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">ID do Frete</p>
                  </div>
                  <p className="font-mono font-bold text-foreground">{selectedFrete.id}</p>
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
                      R$ {selectedFrete.receita.toLocaleString("pt-BR")}
                    </p>
                  </Card>

                  <Card className="p-4 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-red-600" />
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">CUSTOS ADICIONAIS</p>
                    </div>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      R$ {selectedFrete.custos.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-[10px] text-red-600/80 mt-1">Pedágios, combustível, diárias, etc.</p>
                  </Card>

                  <Card className={`p-4 ${selectedFrete.resultado >= 0 
                    ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900" 
                    : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`h-4 w-4 ${selectedFrete.resultado >= 0 ? "text-green-600" : "text-red-600"}`} />
                      <p className={`text-xs font-semibold ${selectedFrete.resultado >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>LUCRO LÍQUIDO</p>
                    </div>
                    <p className={`text-3xl font-bold ${selectedFrete.resultado >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {selectedFrete.resultado >= 0 ? "+" : ""}R$ {selectedFrete.resultado.toLocaleString("pt-BR")}
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

              <Separator />

              {/* Notas Fiscais */}
              <div>
                <h4 className="font-semibold mb-4">Documentação Fiscal</h4>
                {(() => {
                  const nfsDoFrete = notasFiscaisData.filter(nf => nf.freteId === selectedFrete.id);
                  
                  if (nfsDoFrete.length === 0) {
                    return (
                      <Card className="p-6 border-dashed border-2 bg-muted/30">
                        <div className="flex flex-col items-center justify-center text-center">
                          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhuma nota fiscal registrada para este frete</p>
                        </div>
                      </Card>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {nfsDoFrete.map((nf) => (
                        <Card key={nf.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                          <div className="space-y-3">
                            {/* Header: NF Info */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                                    <FileDown className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-lg">{nf.numeroNf}/{nf.serieNf}</p>
                                    <p className="text-xs text-muted-foreground">{nf.dataEmissao}</p>
                                  </div>
                                </div>
                              </div>
                              <Badge className={`${
                                nf.status === 'emitida' 
                                  ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300'
                                  : nf.status === 'cancelada'
                                  ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                                  : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300'
                              }`}>
                                {nf.status === 'emitida' ? '✓ Emitida' : nf.status === 'cancelada' ? '✗ Cancelada' : '⟲ Devolvida'}
                              </Badge>
                            </div>

                            {/* Chave de Acesso */}
                            {nf.chaveAcesso && (
                              <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Chave de Acesso</p>
                                <p className="font-mono text-xs break-all text-foreground">{nf.chaveAcesso}</p>
                              </div>
                            )}

                            {/* Datas de Saída e Entrega */}
                            {(nf.dataSaida || nf.dataEntrega) && (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {nf.dataSaida && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Saída</p>
                                    <p className="font-semibold">{new Date(nf.dataSaida).toLocaleString('pt-BR')}</p>
                                  </div>
                                )}
                                {nf.dataEntrega && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Entrega</p>
                                    <p className="font-semibold">{new Date(nf.dataEntrega).toLocaleString('pt-BR')}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Valores */}
                            <div className="grid grid-cols-3 gap-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/40 p-3 rounded-lg">
                              <div>
                                <p className="text-xs text-muted-foreground">Valor Bruto</p>
                                <p className="font-bold text-blue-600 dark:text-blue-400">R$ {nf.valorBruto.toLocaleString('pt-BR')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">ICMS ({nf.icmsAliquota}%)</p>
                                <p className="font-bold text-red-600 dark:text-red-400">-R$ {nf.icmsValor.toLocaleString('pt-BR')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Valor Líquido</p>
                                <p className="font-bold text-green-600 dark:text-green-400">R$ {nf.valorLiquido.toLocaleString('pt-BR')}</p>
                              </div>
                            </div>

                            {/* Arquivos */}
                            <div className="flex gap-2">
                              {nf.arquivoPdf && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 gap-2"
                                  onClick={() => window.open(nf.arquivoPdf, '_blank')}
                                >
                                  <FileDown className="h-4 w-4" />
                                  PDF
                                </Button>
                              )}
                              {nf.chaveAcesso && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 gap-2"
                                  onClick={() => toast.info('Recurso de consulta SEFAZ em implementação')}
                                >
                                  🔍 Consultar
                                </Button>
                              )}
                            </div>

                            {/* Observações */}
                            {nf.observacoes && (
                              <div className="text-xs text-muted-foreground border-t pt-2">
                                <p className="font-semibold mb-1">Observações:</p>
                                <p>{nf.observacoes}</p>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
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
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-green-600" />
                <h3 className="font-semibold text-green-600">Fazenda de Origem</h3>
              </div>
              <div className="space-y-4">
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
                        fazendaId: v,
                        valorPorTonelada: estoque ? estoque.precoPorTonelada.toString() : ""
                      });
                    }}
                  >
                    <SelectTrigger id="fazenda">
                      <SelectValue placeholder="Selecione a fazenda produtora" />
                    </SelectTrigger>
                    <SelectContent>
                      {estoquesFazendas.length === 0 ? (
                        <SelectItem value="none" disabled>Nenhuma fazenda cadastrada</SelectItem>
                      ) : (
                        estoquesFazendas.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.fazenda} - {e.mercadoria} ({e.variedade})
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

            <Separator className="my-2" />

            {/* Seção: Destino */}
            <div className="space-y-3">
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
                  <SelectContent>
                    {locaisEntregaFixos.map((local) => (
                      <SelectItem key={local} value={local}>
                        {local}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Seção: Equipe */}
            <div className="space-y-3">
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
                    onValueChange={(v) => setNewFrete({ ...newFrete, motoristaId: v })}
                  >
                    <SelectTrigger id="motorista">
                      <SelectValue placeholder="Selecione um motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {motoristasData.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caminhao" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Caminhão *
                  </Label>
                  <Select 
                    value={newFrete.caminhaoId} 
                    onValueChange={(v) => setNewFrete({ ...newFrete, caminhaoId: v })}
                  >
                    <SelectTrigger id="caminhao">
                      <SelectValue placeholder="Selecione um caminhão" />
                    </SelectTrigger>
                    <SelectContent>
                      {caminhoesData.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.placa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Seção: Carga */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-blue-600" />
                <h3 className="font-semibold text-blue-600">Quantidade de Carga</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="toneladas" className="flex items-center gap-2">
                    <Weight className="h-4 w-4 text-blue-600" />
                    Toneladas *
                  </Label>
                  <Input
                    id="toneladas"
                    type="number"
                    placeholder="Ex: 10.5"
                    step="0.1"
                    min="0.1"
                    value={newFrete.toneladas}
                    onChange={(e) => setNewFrete({ ...newFrete, toneladas: e.target.value })}
                    disabled={!estoqueSelecionado}
                  />
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

              {/* Seção: Documentação Fiscal */}
              {!isEditingFrete && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-blue-600" />
                    <h3 className="font-semibold text-blue-600">Nota Fiscal (Opcional)</h3>
                  </div>
                  <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-semibold">Número da Nota Fiscal</Label>
                        <Input 
                          placeholder="Ex: 1001"
                          className="mt-1"
                          disabled
                        />
                        <p className="text-xs text-muted-foreground mt-1">Será gerado automaticamente após criação do frete</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground mb-1">ℹ️ Informações:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>A nota fiscal será criada automaticamente ao salvar o frete</li>
                          <li>Valor bruto: R$ (toneladas × valor por tonelada)</li>
                          <li>ICMS: 18% (alíquota padrão)</li>
                          <li>Você pode gerenciar a documentação fiscal nos detalhes do frete</li>
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
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
