import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Plus,
  FileText,
  Edit,
  Save,
  X,
  Calendar,
  DollarSign,
  Paperclip,
  Download,
  Check,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Página de Pagamentos - Gestão de Pagamentos Semanais aos Motoristas
 * 
 * FLUXO DE PAGAMENTO SEMANAL:
 * 1. Ao criar novo pagamento, seleciona-se o motorista
 * 2. Sistema busca automaticamente apenas fretes NÃO PAGOS daquele motorista
 *    (onde pagamentoId === null)
 * 3. Usuário seleciona quais fretes incluir no pagamento semanal
 * 4. Sistema calcula: receita bruta - custos = valor líquido a pagar
 * 5. Ao salvar pagamento, os fretes selecionados são vinculados (recebem pagamentoId)
 * 6. Fretes pagos não aparecem mais na lista de disponíveis
 * 
 * INTEGRAÇÃO COM BANCO:
 * - Campo pagamentoId na tabela fretes (FK para pagamentos)
 * - Trigger atualiza pagamentoId nos fretes quando pagamento é criado
 * - Query: SELECT * FROM fretes WHERE motorista_id = ? AND pagamento_id IS NULL
 */

interface PagamentoMotorista {
  id: string;
  motoristaId: string;
  motoristaNome: string;
  dataFrete: string;
  toneladas: number;
  fretes: number;
  valorUnitarioPorTonelada: number;
  valorTotal: number;
  fretesSelecionados?: string[];
  dataPagamento: string;
  statusPagamento: "pendente" | "processando" | "pago" | "cancelado";
  metodoPagamento: "pix" | "transferencia_bancaria";
  comprovante?: {
    nome: string;
    url: string;
    datadoUpload: string;
  };
  observacoes?: string;
}

// Motoristas disponíveis (simulado)
const motoristas = [
  {
    id: "1",
    nome: "Carlos Silva",
    tipoPagamento: "pix" as const,
    chavePixTipo: "cpf" as const,
    chavePix: "123.456.789-00",
  },
  {
    id: "2",
    nome: "João Oliveira",
    tipoPagamento: "transferencia_bancaria" as const,
    banco: "Banco do Brasil",
    agencia: "1234",
    conta: "567890-1",
    tipoConta: "corrente" as const,
  },
  {
    id: "3",
    nome: "Pedro Santos",
    tipoPagamento: "pix" as const,
    chavePixTipo: "email" as const,
    chavePix: "pedro.santos@email.com",
  },
  {
    id: "4",
    nome: "André Costa",
    tipoPagamento: "pix" as const,
    chavePixTipo: "aleatoria" as const,
    chavePix: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
  {
    id: "5",
    nome: "Lucas Ferreira",
    tipoPagamento: "transferencia_bancaria" as const,
    banco: "Caixa Econômica Federal",
    agencia: "5678",
    conta: "123456-9",
    tipoConta: "poupanca" as const,
  },
];

// Fretes dos motoristas (simulado)
const fretesData: {
  id: string;
  motoristaId: string;
  dataFrete: string;
  rota: string;
  toneladas: number;
  valorGerado: number;
  pagamentoId: string | null; // null = frete não pago ainda
}[] = [
  { id: "F001", motoristaId: "1", dataFrete: "15/01/2025", rota: "SP → RJ", toneladas: 35, valorGerado: 5250, pagamentoId: "PAG-2026-001" },
  { id: "F002", motoristaId: "1", dataFrete: "20/01/2025", rota: "SP → MG", toneladas: 50, valorGerado: 7500, pagamentoId: "PAG-2026-001" },
  { id: "F003", motoristaId: "2", dataFrete: "18/01/2025", rota: "RJ → ES", toneladas: 45, valorGerado: 6750, pagamentoId: "PAG-2026-002" },
  { id: "F004", motoristaId: "3", dataFrete: "17/01/2025", rota: "PR → SC", toneladas: 40, valorGerado: 6000, pagamentoId: "PAG-2026-003" },
  { id: "F005", motoristaId: "4", dataFrete: "19/01/2025", rota: "MG → DF", toneladas: 55, valorGerado: 8250, pagamentoId: "PAG-2026-004" },
  // Fretes não pagos (para demonstrar o fluxo semanal)
  { id: "F006", motoristaId: "1", dataFrete: "28/01/2026", rota: "SP → RJ", toneladas: 42, valorGerado: 6300, pagamentoId: null },
  { id: "F007", motoristaId: "1", dataFrete: "30/01/2026", rota: "MG → SP", toneladas: 38, valorGerado: 5700, pagamentoId: null },
  { id: "F008", motoristaId: "2", dataFrete: "29/01/2026", rota: "RJ → MG", toneladas: 50, valorGerado: 7500, pagamentoId: null },
  { id: "F009", motoristaId: "3", dataFrete: "27/01/2026", rota: "PR → RS", toneladas: 45, valorGerado: 6750, pagamentoId: null },
  { id: "F010", motoristaId: "5", dataFrete: "31/01/2026", rota: "DF → GO", toneladas: 48, valorGerado: 7200, pagamentoId: null },
];

// Dados de custos adicionais para cada frete
interface CustoAdicional {
  freteId: string;
  valor: number;
  descricao: string;
}

const custosAdicionaisData: CustoAdicional[] = [
  { freteId: "F001", valor: 1200, descricao: "Combustível" },
  { freteId: "F001", valor: 400, descricao: "Pedágio" },
  { freteId: "F002", valor: 1500, descricao: "Combustível" },
  { freteId: "F002", valor: 850, descricao: "Pedágio" },
  { freteId: "F003", valor: 1100, descricao: "Combustível" },
  { freteId: "F003", valor: 590, descricao: "Pedágio" },
  { freteId: "F004", valor: 950, descricao: "Combustível" },
  { freteId: "F004", valor: 770, descricao: "Pedágio" },
];

const pagamentosData: PagamentoMotorista[] = [
  {
    id: "PAG-2026-001",
    motoristaId: "1",
    motoristaNome: "Carlos Silva",
    dataFrete: "15-20/01/2026",
    toneladas: 85,
    fretes: 2,
    valorUnitarioPorTonelada: 150,
    valorTotal: 12750,
    fretesSelecionados: ["F001", "F002"],
    dataPagamento: "22/01/2026",
    statusPagamento: "pago",
    metodoPagamento: "pix",
    comprovante: {
      nome: "comprovante_pix_001.pdf",
      url: "#",
      datadoUpload: "22/01/2026",
    },
    observacoes: "Pagamento via PIX realizado com sucesso",
  },
  {
    id: "PAG-2026-002",
    motoristaId: "2",
    motoristaNome: "João Oliveira",
    dataFrete: "18/01/2026",
    toneladas: 45,
    fretes: 1,
    valorUnitarioPorTonelada: 150,
    valorTotal: 6750,
    fretesSelecionados: ["F003"],
    dataPagamento: "25/01/2026",
    statusPagamento: "processando",
    metodoPagamento: "transferencia_bancaria",
    observacoes: "Em processamento - transferência bancária",
  },
  {
    id: "PAG-2026-003",
    motoristaId: "3",
    motoristaNome: "Pedro Santos",
    dataFrete: "17/01/2026",
    toneladas: 40,
    fretes: 1,
    valorUnitarioPorTonelada: 150,
    valorTotal: 6000,
    fretesSelecionados: ["F004"],
    dataPagamento: "28/01/2026",
    statusPagamento: "pendente",
    metodoPagamento: "pix",
    observacoes: "",
  },
  {
    id: "PAG-2026-004",
    motoristaId: "4",
    motoristaNome: "André Costa",
    dataFrete: "12/01/2026",
    toneladas: 55,
    fretes: 1,
    valorUnitarioPorTonelada: 150,
    valorTotal: 8250,
    fretesSelecionados: ["F005"],
    dataPagamento: "15/01/2026",
    statusPagamento: "pago",
    metodoPagamento: "pix",
    comprovante: {
      nome: "comprovante_pix_004.pdf",
      url: "#",
      datadoUpload: "15/01/2026",
    },
    observacoes: "Pagamento antecipado",
  },
  {
    id: "PAG-2026-005",
    motoristaId: "5",
    motoristaNome: "Lucas Ferreira",
    dataFrete: "05-10/01/2026",
    toneladas: 92,
    fretes: 2,
    valorUnitarioPorTonelada: 145,
    valorTotal: 13340,
    fretesSelecionados: ["F001", "F003"],
    dataPagamento: "18/01/2026",
    statusPagamento: "pago",
    metodoPagamento: "transferencia_bancaria",
    comprovante: {
      nome: "ted_005.pdf",
      url: "#",
      datadoUpload: "18/01/2026",
    },
    observacoes: "Transferência bancária confirmada",
  },
  {
    id: "PAG-2026-006",
    motoristaId: "1",
    motoristaNome: "Carlos Silva",
    dataFrete: "23-25/01/2026",
    toneladas: 65,
    fretes: 2,
    valorUnitarioPorTonelada: 148,
    valorTotal: 9620,
    fretesSelecionados: ["F002", "F004"],
    dataPagamento: "30/01/2026",
    statusPagamento: "pendente",
    metodoPagamento: "pix",
    observacoes: "Aguardando confirmação do motorista",
  },
  {
    id: "PAG-2026-007",
    motoristaId: "2",
    motoristaNome: "João Oliveira",
    dataFrete: "08-12/01/2026",
    toneladas: 78,
    fretes: 3,
    valorUnitarioPorTonelada: 152,
    valorTotal: 11856,
    fretesSelecionados: ["F001", "F002", "F003"],
    dataPagamento: "20/01/2026",
    statusPagamento: "pago",
    metodoPagamento: "pix",
    comprovante: {
      nome: "pix_007_joao.pdf",
      url: "#",
      datadoUpload: "20/01/2026",
    },
    observacoes: "Pagamento múltiplos fretes",
  },
  {
    id: "PAG-2026-008",
    motoristaId: "3",
    motoristaNome: "Pedro Santos",
    dataFrete: "14/01/2026",
    toneladas: 48,
    fretes: 1,
    valorUnitarioPorTonelada: 155,
    valorTotal: 7440,
    fretesSelecionados: ["F004"],
    dataPagamento: "29/01/2026",
    statusPagamento: "cancelado",
    metodoPagamento: "pix",
    observacoes: "Pagamento cancelado - erro nos dados",
  },
];

const statusConfig = {
  pendente: { label: "Pendente", variant: "pending" as const },
  processando: { label: "Processando", variant: "inTransit" as const },
  pago: { label: "Pago", variant: "completed" as const },
  cancelado: { label: "Cancelado", variant: "cancelled" as const },
};

export default function Pagamentos() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [motoristaFilter, setMotoristaFilter] = useState<string>("all");
  const [selectedPagamento, setSelectedPagamento] = useState<PagamentoMotorista | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPagamento, setEditedPagamento] = useState<Partial<PagamentoMotorista>>({});
  const [dataPagamentoSelected, setDataPagamentoSelected] = useState<Date | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFretes, setSelectedFretes] = useState<string[]>([]);
  
  // Novos estados para Exercício (Ano/Mês) e Fechamento
  const [selectedPeriodo, setSelectedPeriodo] = useState("2026-01"); // Janeiro 2026
  const [mesesFechados, setMesesFechados] = useState<string[]>([]); // Meses que já foram fechados
  
  // Dados históricos para comparação (simulado - mes anterior)
  const dadosMesAnterior = {
    periodo: "2025-12",
    totalPago: 21500, // Dezembro 2025 pagou R$ 21.500
    totalMotoristas: 4,
  };

  const handleOpenNewModal = () => {
    setEditedPagamento({
      motoristaId: "",
      motoristaNome: "",
      dataFrete: new Date().toLocaleDateString("pt-BR"),
      toneladas: 0,
      fretes: 0,
      valorUnitarioPorTonelada: 150,
      valorTotal: 0,
      fretesSelecionados: [],
      dataPagamento: new Date().toLocaleDateString("pt-BR"),
      statusPagamento: "pendente",
      metodoPagamento: "pix",
      observacoes: "",
    });
    setSelectedFile(null);
    setSelectedFretes([]);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pagamento: PagamentoMotorista) => {
    setEditedPagamento(pagamento);
    setSelectedFretes(pagamento.fretesSelecionados || []);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleMotoristaChange = (motoristaId: string) => {
    const motorista = motoristas.find((m) => m.id === motoristaId);
    setSelectedFretes([]);
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
  };

  // Buscar fretes não pagos do motorista selecionado
  const fretesNaoPagos = useMemo(() => {
    if (!editedPagamento.motoristaId) return [];
    return fretesData.filter(
      (f) => f.motoristaId === editedPagamento.motoristaId && f.pagamentoId === null
    );
  }, [editedPagamento.motoristaId]);

  const handleToggleFrete = (freteId: string) => {
    const isSelected = selectedFretes.includes(freteId);
    const nextSelected = isSelected
      ? selectedFretes.filter((id) => id !== freteId)
      : [...selectedFretes, freteId];

    const fretesSelecionados = fretesData.filter((f) => nextSelected.includes(f.id));
    const toneladas = fretesSelecionados.reduce((acc, f) => acc + f.toneladas, 0);
    const valorBruto = fretesSelecionados.reduce((acc, f) => acc + f.valorGerado, 0);
    const custosTotais = nextSelected.reduce((acc, freteId) => {
      return acc + custosAdicionaisData
        .filter(c => c.freteId === freteId)
        .reduce((sum, c) => sum + c.valor, 0);
    }, 0);
    const valorTotal = valorBruto - custosTotais;
    const dataFrete = fretesSelecionados.map((f) => f.dataFrete).join(", ");
    const valorUnitario = toneladas > 0 ? valorTotal / toneladas : 0;

    setSelectedFretes(nextSelected);
    setEditedPagamento({
      ...editedPagamento,
      toneladas,
      fretes: fretesSelecionados.length,
      valorTotal,
      dataFrete: dataFrete || new Date().toLocaleDateString("pt-BR"),
      valorUnitarioPorTonelada: Number(valorUnitario.toFixed(2)),
      fretesSelecionados: nextSelected,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máximo 5MB)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSave = () => {
    if (!editedPagamento.motoristaId) {
      toast.error("Selecione um motorista");
      return;
    }

    if (selectedFretes.length === 0) {
      toast.error("Selecione pelo menos um frete para pagamento");
      return;
    }

    if (isEditing) {
      toast.success("Pagamento atualizado com sucesso!");
    } else {
      toast.success("Pagamento registrado com sucesso!");
      if (selectedFile) {
        toast.success(`Comprovante "${selectedFile.name}" anexado!`);
      }
    }
    setIsModalOpen(false);
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

  // Função para exportar PDF profissional e completo
  const handleExportarPDF = () => {
    const doc = new jsPDF();
    
    // ==================== CABEÇALHO PREMIUM ====================
    // Fundo azul do cabeçalho
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 50, "F");
    
    // Logo/Nome da empresa em branco
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("RN LOGÍSTICA", 105, 18, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE PAGAMENTOS A MOTORISTAS", 105, 35, { align: "center" });
    
    const [ano, mes] = selectedPeriodo.split("-");
    const nomeMes = format(new Date(parseInt(ano), parseInt(mes) - 1), "MMMM yyyy", { locale: ptBR });
    const nomeFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período de Referência: ${nomeFormatado}`, 105, 42, { align: "center" });
    
    doc.setFontSize(8);
    doc.text(`Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 47, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    
    // Cálculos gerais
    const totalPago = filteredData.filter((p) => p.statusPagamento === "pago").reduce((acc, p) => acc + p.valorTotal, 0);
    const totalPendente = filteredData.filter((p) => p.statusPagamento === "pendente").reduce((acc, p) => acc + p.valorTotal, 0);
    const totalBruto = filteredData.reduce((acc, p) => {
      const fretes = p.fretesSelecionados || [];
      return acc + fretes.reduce((sum, freteId) => {
        const frete = fretesData.find((f) => f.id === freteId);
        return sum + (frete?.valorGerado || 0);
      }, 0);
    }, 0);
    const totalDescontos = filteredData.reduce((acc, p) => {
      const fretes = p.fretesSelecionados || [];
      return acc + fretes.reduce((sum, freteId) => {
        return sum + custosAdicionaisData.filter((c) => c.freteId === freteId).reduce((s, c) => s + c.valor, 0);
      }, 0);
    }, 0);
    const totalLiquido = totalBruto - totalDescontos;
    const qtdMotoristas = new Set(filteredData.map((p) => p.motoristaId)).size;
    const qtdFretes = filteredData.reduce((acc, p) => acc + p.fretes, 0);
    const totalToneladas = filteredData.reduce((acc, p) => acc + p.toneladas, 0);
    const fretesSelecionadosIds = new Set(
      filteredData.flatMap((p) => p.fretesSelecionados || [])
    );
    const ultimoFreteDate = fretesData
      .filter((f) => fretesSelecionadosIds.has(f.id))
      .map((f) => parse(f.dataFrete, "dd/MM/yyyy", new Date(0)))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const ultimoFreteFormatado = ultimoFreteDate
      ? format(ultimoFreteDate, "dd/MM/yyyy")
      : "—";
    
    // ==================== INFORMAÇÕES DO RELATÓRIO ====================
    let yPosition = 56;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, yPosition, 180, 22, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, yPosition, 180, 22, 2, 2, "S");
    
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.text("Período:", 20, yPosition + 7);
    doc.setFont("helvetica", "normal");
    doc.text(nomeFormatado, 40, yPosition + 7);
    doc.setFont("helvetica", "bold");
    doc.text("Último frete:", 140, yPosition + 7);
    doc.setFont("helvetica", "normal");
    doc.text(ultimoFreteFormatado, 175, yPosition + 7);
    
    doc.setFont("helvetica", "bold");
    doc.text("Motoristas:", 20, yPosition + 15);
    doc.setFont("helvetica", "normal");
    doc.text(`${qtdMotoristas}`, 50, yPosition + 15);
    doc.setFont("helvetica", "bold");
    doc.text("Fretes:", 90, yPosition + 15);
    doc.setFont("helvetica", "normal");
    doc.text(`${qtdFretes}`, 108, yPosition + 15);
    doc.setFont("helvetica", "bold");
    doc.text("Toneladas:", 140, yPosition + 15);
    doc.setFont("helvetica", "normal");
    doc.text(`${totalToneladas.toFixed(0)}t`, 170, yPosition + 15);
    
    yPosition += 28;
    
    // ==================== RESUMO EXECUTIVO ====================
    doc.setFillColor(241, 245, 249);
    doc.rect(15, yPosition, 180, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("RESUMO DE PAGAMENTOS", 20, yPosition + 5.5);
    
    yPosition += 12;
    
    // Cards de resumo em 3 colunas
    doc.setTextColor(0, 0, 0);
    
    // Card 1 - Valores Brutos
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(15, yPosition, 58, 28, 2, 2, "F");
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, yPosition, 58, 28, 2, 2, "S");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Valor Bruto (Fretes)", 20, yPosition + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text(`R$ ${totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 20, yPosition + 13);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${qtdFretes} frete(s) • ${qtdMotoristas} motorista(s)`, 20, yPosition + 19);
    doc.text(`${filteredData.length} pagamento(s) • ${totalToneladas.toFixed(0)}t`, 20, yPosition + 24);
    
    // Card 2 - Descontos
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(78, yPosition, 58, 28, 2, 2, "F");
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(78, yPosition, 58, 28, 2, 2, "S");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Total de Descontos", 83, yPosition + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(220, 38, 38);
    doc.text(`-R$ ${totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 83, yPosition + 13);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const percDesconto = totalBruto > 0 ? (totalDescontos / totalBruto) * 100 : 0;
    doc.text(`${percDesconto.toFixed(1)}% do valor bruto`, 83, yPosition + 19);
    doc.text("Combustivel e pedagios", 83, yPosition + 24);
    
    // Card 3 - Valor Líquido
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(141, yPosition, 54, 28, 2, 2, "F");
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.8);
    doc.roundedRect(141, yPosition, 54, 28, 2, 2, "S");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Valor Liquido a Pagar", 146, yPosition + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74);
    doc.text(`R$ ${totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 146, yPosition + 13);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Pago: R$ ${totalPago.toLocaleString("pt-BR")}`, 146, yPosition + 19);
    doc.text(`Pendente: R$ ${totalPendente.toLocaleString("pt-BR")}`, 146, yPosition + 24);
    
    yPosition += 35;
    
    // ==================== DETALHAMENTO POR MOTORISTA ====================
    doc.setFillColor(241, 245, 249);
    doc.rect(15, yPosition, 180, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("DETALHAMENTO POR MOTORISTA", 20, yPosition + 5.5);
    
    yPosition += 12;
    
    // Tabela detalhada de pagamentos
    const tableData = filteredData.map((p) => {
      const fretesIds = (p.fretesSelecionados || []).join(", ");
      const valorBruto = (p.fretesSelecionados || []).reduce((sum, freteId) => {
        const frete = fretesData.find((f) => f.id === freteId);
        return sum + (frete?.valorGerado || 0);
      }, 0);
      const descontos = (p.fretesSelecionados || []).reduce((sum, freteId) => {
        return sum + custosAdicionaisData.filter((c) => c.freteId === freteId).reduce((s, c) => s + c.valor, 0);
      }, 0);
      
      return [
        p.id,
        p.motoristaNome,
        fretesIds,
        `${p.toneladas}t`,
        `R$ ${valorBruto.toLocaleString("pt-BR")}`,
        `R$ ${descontos.toLocaleString("pt-BR")}`,
        `R$ ${p.valorTotal.toLocaleString("pt-BR")}`,
        statusConfig[p.statusPagamento].label,
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [["ID", "Motorista", "Fretes Realiz.", "Carga", "Val. Bruto", "Descontos", "Val. Liquido", "Status"]],
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
        1: { cellWidth: 32, fontSize: 9 },
        2: { cellWidth: 28, halign: "center", fontSize: 9 },
        3: { cellWidth: 14, halign: "center", fontSize: 9 },
        4: { cellWidth: 20, halign: "right", fontSize: 9 },
        5: { cellWidth: 20, halign: "right", textColor: [220, 38, 38], fontSize: 9 },
        6: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [22, 163, 74], fontSize: 9 },
        7: { cellWidth: 17, halign: "center", fontSize: 9 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          if ([0, 1].includes(data.column.index)) {
            data.cell.styles.fontStyle = "bold";
          }
          if ([4, 5, 6].includes(data.column.index)) {
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    
    // ==================== DETALHAMENTO DE CUSTOS POR TIPO ====================
    const finalY = (doc as any).lastAutoTable.finalY || yPosition;
    yPosition = finalY + 10;
    
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFillColor(254, 243, 199);
    doc.rect(15, yPosition, 180, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("DESCONTOS POR CATEGORIA", 20, yPosition + 5.5);
    
    yPosition += 12;
    
    // Calcular custos por tipo
    const custosPorTipo: { [key: string]: number } = {};
    filteredData.forEach((pag) => {
      (pag.fretesSelecionados || []).forEach((freteId) => {
        custosAdicionaisData.filter((c) => c.freteId === freteId).forEach((custo) => {
          custosPorTipo[custo.descricao] = (custosPorTipo[custo.descricao] || 0) + custo.valor;
        });
      });
    });
    
    const custosTable = Object.entries(custosPorTipo).map(([tipo, valor]) => {
      const percentual = totalDescontos > 0 ? (valor / totalDescontos) * 100 : 0;
      return [
        tipo,
        `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        `${percentual.toFixed(1)}%`,
      ];
    });
    
    // Adicionar linha de total
    custosTable.push([
      "TOTAL",
      `R$ ${totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      "100.0%",
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [["Tipo de Custo", "Valor Total", "% do Total"]],
      body: custosTable,
      theme: "striped",
      headStyles: {
        fillColor: [251, 191, 36],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 11,
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 100, fontSize: 10 },
        1: { cellWidth: 50, halign: "right", fontStyle: "bold", fontSize: 10 },
        2: { cellWidth: 30, halign: "center", fontSize: 10 },
      },
      didParseCell: (data) => {
        // Destacar linha de total
        if (data.row.index === custosTable.length - 1) {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = [30, 41, 59];
        }
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
    
    // ==================== DOWNLOAD ====================
    const nomeArquivo = `RN_Logistica_Pagamentos_${selectedPeriodo.replace("-", "_")}.pdf`;
    doc.save(nomeArquivo);
    toast.success(`PDF "${nomeArquivo}" gerado com sucesso!`, { duration: 4000 });
  };

  // Filtrar dados por período selecionado
  const dadosFiltradosPorPeriodo = useMemo(() => {
    return pagamentosData.filter((p) => {
      const [dia, mes, ano] = p.dataPagamento.split("/");
      const periodoItem = `${ano}-${mes}`;
      return periodoItem === selectedPeriodo;
    });
  }, [selectedPeriodo]);

  const filteredData = dadosFiltradosPorPeriodo.filter((pagamento) => {
    const matchesSearch =
      pagamento.motoristaNome.toLowerCase().includes(search.toLowerCase()) ||
      pagamento.id.includes(search);
    const matchesStatus =
      statusFilter === "all" || pagamento.statusPagamento === statusFilter;
    const matchesMotorista =
      motoristaFilter === "all" || pagamento.motoristaId === motoristaFilter;
    return matchesSearch && matchesStatus && matchesMotorista;
  });

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
      header: "Motorista",
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
            <p className="font-semibold text-foreground">{item.motoristaNome}</p>
            <p className="text-xs text-muted-foreground">{item.dataFrete}</p>
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
            R$ {item.valorTotal.toLocaleString("pt-BR")}
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
              size="sm"
              className="gap-2 text-xs"
              title={`Download: ${item.comprovante.nome}`}
            >
              <Download className="h-4 w-4" />
              Baixar
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

  const motoristaSelecionado = editedPagamento.motoristaId
    ? motoristas.find((m) => m.id === editedPagamento.motoristaId)
    : undefined;

  const fretesDoPagamento = selectedPagamento?.fretesSelecionados
    ? fretesData.filter((f) => selectedPagamento.fretesSelecionados?.includes(f.id))
    : [];

  return (
    <MainLayout title="Pagamentos" subtitle="Registro de pagamentos de motoristas">
      <PageHeader
        title="Pagamentos de Motoristas"
        description="Registre e acompanhe os pagamentos pelos fretes realizados"
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

            {/* Botão Novo Pagamento */}
            <Button 
              onClick={handleOpenNewModal}
              disabled={mesesFechados.includes(selectedPeriodo)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Pagamento
            </Button>
          </div>
        }
      />

      {/* Badge de Status do Mês */}
      {mesesFechados.includes(selectedPeriodo) && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <Lock className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
            Este mês está fechado. Novos pagamentos e edições não são permitidos.
          </p>
        </div>
      )}

      {/* Summary Cards com KPIs Comparativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-l-4 border-l-primary hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total de Registros</p>
              <p className="text-4xl font-bold mt-2 text-foreground">{dadosFiltradosPorPeriodo.length}</p>
              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                {dadosFiltradosPorPeriodo.length === 0 ? "Nenhum pagamento neste período" : "Pagamentos cadastrados"}
              </p>
            </div>
            <FileText className="h-12 w-12 text-primary/20" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-50/30 dark:from-yellow-950/20 dark:to-yellow-950/10 border-l-4 border-l-yellow-600 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">Pendente de Pagamento</p>
              <p className="text-4xl font-bold mt-2 text-yellow-700 dark:text-yellow-400">
                R$ {dadosFiltradosPorPeriodo
                  .filter((p) => p.statusPagamento === "pendente")
                  .reduce((acc, p) => acc + p.valorTotal, 0)
                  .toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                {dadosFiltradosPorPeriodo.filter(p => p.statusPagamento === "pendente").length} pagamentos
              </p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600/20" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-profit/5 to-profit/5 dark:from-profit/5 dark:to-profit/5 border-l-4 border-l-profit hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-profit/70 uppercase tracking-wide">Já Pago</p>
              <p className="text-4xl font-bold mt-2 text-profit">
                R$ {dadosFiltradosPorPeriodo
                  .filter((p) => p.statusPagamento === "pago")
                  .reduce((acc, p) => acc + p.valorTotal, 0)
                  .toLocaleString("pt-BR")}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-profit/70 flex items-center gap-1">
                  {dadosFiltradosPorPeriodo.filter(p => p.statusPagamento === "pago").length} pagamentos
                </p>
                {(() => {
                  const totalAtual = dadosFiltradosPorPeriodo
                    .filter((p) => p.statusPagamento === "pago")
                    .reduce((acc, p) => acc + p.valorTotal, 0);
                  const variacao = dadosMesAnterior.totalPago > 0
                    ? ((totalAtual - dadosMesAnterior.totalPago) / dadosMesAnterior.totalPago) * 100
                    : 0;
                  const temDados = totalAtual > 0;
                  
                  return temDados && Math.abs(variacao) > 0 ? (
                    <Badge
                      variant={variacao < 0 ? "completed" : "cancelled"}
                      className={cn(
                        "text-xs px-2 py-0.5 flex items-center gap-1",
                        variacao < 0
                          ? "bg-profit/10 text-profit border-profit/20"
                          : "bg-loss/10 text-loss border-loss/20"
                      )}
                    >
                      {variacao < 0 ? (
                        <>
                          <TrendingDown className="h-3 w-3" />
                          {Math.abs(variacao).toFixed(0)}% vs mês anterior
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-3 w-3" />
                          +{variacao.toFixed(0)}% vs mês anterior
                        </>
                      )}
                    </Badge>
                  ) : null;
                })()}
              </div>
            </div>
            <Check className="h-12 w-12 text-profit/20" />
          </div>
        </Card>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por motorista ou ID de pagamento..."
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Motorista</Label>
          <Select value={motoristaFilter} onValueChange={setMotoristaFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Motorista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {motoristas.map((motorista) => (
                <SelectItem key={motorista.id} value={motorista.id}>
                  {motorista.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground block">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="processando">Processando</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <DataTable<PagamentoMotorista>
        columns={columns}
        data={filteredData}
        onRowClick={(item) => setSelectedPagamento(item)}
        emptyMessage="Nenhum pagamento encontrado"
      />

      {/* Payment Detail Modal */}
      <Dialog open={!!selectedPagamento} onOpenChange={() => setSelectedPagamento(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalhes do Pagamento</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedPagamento) {
                    handleOpenEditModal(selectedPagamento);
                    setSelectedPagamento(null);
                  }
                }}
                disabled={mesesFechados.includes(selectedPeriodo)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-1">
            {selectedPagamento && (
              <div className="space-y-6">
                {/* Header */}
                <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ID Pagamento</p>
                      <p className="text-base font-semibold font-mono text-primary">
                        {selectedPagamento.id}
                      </p>
                    </div>
                    <Badge variant={statusConfig[selectedPagamento.statusPagamento].variant} className="text-xs px-2 py-1">
                      {statusConfig[selectedPagamento.statusPagamento].label}
                    </Badge>
                  </div>
                </Card>

                {/* Motorista Info */}
                <div>
                  <h3 className="font-semibold mb-3">Informações do Motorista</h3>
                  <Card className="p-4 flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                        {selectedPagamento.motoristaNome
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-bold">{selectedPagamento.motoristaNome}</p>
                      <p className="text-sm text-muted-foreground">
                        Período: {selectedPagamento.dataFrete}
                      </p>
                    </div>
                  </Card>
                </div>

                <Separator />

                {/* Fretes Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <p className="text-sm text-muted-foreground mb-1">Toneladas</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {selectedPagamento.toneladas}t
                    </p>
                  </Card>
                  <Card className="p-4 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
                    <p className="text-sm text-muted-foreground mb-1">Fretes</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {selectedPagamento.fretes}
                    </p>
                  </Card>
                  <Card className="p-4 bg-profit/5 border-profit/20">
                    <p className="text-sm text-muted-foreground mb-1">Valor/Tonelada</p>
                    <p className="text-3xl font-bold text-profit">
                      R$ {selectedPagamento.valorUnitarioPorTonelada}
                    </p>
                  </Card>
                </div>

                {/* Fretes com Descontos */}
                {fretesDoPagamento.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Fretes com Detalhamento de Custos</h3>
                    <div className="space-y-3">
                      {fretesDoPagamento.map((frete) => {
                        const custosFrete = custosAdicionaisData.filter((c) => c.freteId === frete.id);
                        const totalCustos = custosFrete.reduce((sum, c) => sum + c.valor, 0);
                        const valorLiquido = frete.valorGerado - totalCustos;
                        return (
                          <Card key={frete.id} className="p-4 bg-muted/30">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {frete.id} • {frete.rota}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {frete.dataFrete} • {frete.toneladas}t
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                  Bruto
                                </Badge>
                              </div>
                              
                              <div className="bg-background p-3 rounded border border-blue-200 dark:border-blue-900">
                                <p className="text-sm font-semibold text-blue-600">
                                  R$ {frete.valorGerado.toLocaleString("pt-BR")}
                                </p>
                              </div>

                              {custosFrete.length > 0 && (
                                <>
                                  <div className="border-t pt-3 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Descontos (Custos Adicionais):</p>
                                    {custosFrete.map((custo, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-loss/5 p-2 rounded">
                                        <span className="text-muted-foreground">• {custo.descricao}</span>
                                        <span className="font-semibold text-loss">
                                          -R$ {custo.valor.toLocaleString("pt-BR")}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="flex items-center justify-between text-xs font-semibold pt-2 border-t border-loss/20">
                                      <span className="text-loss">Total de Descontos:</span>
                                      <span className="text-loss">-R$ {totalCustos.toLocaleString("pt-BR")}</span>
                                    </div>
                                  </div>

                                  <div className="bg-profit/5 border border-profit/20 p-3 rounded">
                                    <p className="text-xs text-muted-foreground mb-1">Valor Líquido (após descontos)</p>
                                    <p className="text-lg font-bold text-profit">
                                      R$ {valorLiquido.toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Resumo de Valores com Descontos */}
                <div>
                  <h3 className="font-semibold mb-3">Resumo Financeiro</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                      <p className="text-xs text-muted-foreground mb-1">Valor Bruto (Fretes)</p>
                      <p className="text-2xl font-bold text-blue-600">
                        R$ {fretesDoPagamento.reduce((acc, f) => acc + f.valorGerado, 0).toLocaleString("pt-BR")}
                      </p>
                    </Card>
                    <Card className="p-4 bg-loss/10 border-loss/20">
                      <p className="text-xs text-muted-foreground mb-1">Total de Descontos</p>
                      <p className="text-2xl font-bold text-loss">
                        -R$ {fretesDoPagamento
                          .reduce((acc, frete) => {
                            return (
                              acc +
                              custosAdicionaisData
                                .filter((c) => c.freteId === frete.id)
                                .reduce((sum, c) => sum + c.valor, 0)
                            );
                          }, 0)
                          .toLocaleString("pt-BR")}
                      </p>
                    </Card>
                    <Card className="p-4 bg-profit/5 border-profit/20">
                      <p className="text-xs text-muted-foreground mb-1">Valor Líquido a Pagar</p>
                      <p className="text-2xl font-bold text-profit">
                        R$ {(selectedPagamento.valorTotal || 0).toLocaleString("pt-BR")}
                      </p>
                    </Card>
                  </div>
                </div>

                {/* Value */}
                <Card className="p-6 bg-gradient-to-br from-profit/10 to-transparent border-profit/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Valor Total a Pagar</p>
                      <p className="text-4xl font-bold text-profit">
                        R$ {selectedPagamento.valorTotal.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <DollarSign className="h-16 w-16 text-profit/20" />
                  </div>
                </Card>

                {/* Payment Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">Data do Pagamento</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{selectedPagamento.dataPagamento}</p>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">Método de Pagamento</p>
                    <p className="font-semibold">
                      {selectedPagamento.metodoPagamento === "pix"
                        ? "PIX"
                        : "Transferência Bancária"}
                    </p>
                  </Card>
                </div>

                {/* Comprovante */}
                {selectedPagamento.comprovante && (
                  <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground mb-0.5">
                            Comprovante de Pagamento
                          </p>
                          <p className="font-semibold text-green-600">
                            {selectedPagamento.comprovante.nome}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Enviado em {selectedPagamento.comprovante.datadoUpload}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Observações */}
                {selectedPagamento.observacoes && (
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Observações</p>
                    <p className="text-foreground">{selectedPagamento.observacoes}</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Pagamento" : "Registrar Novo Pagamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto px-1">
            {/* Motorista Selection */}
            <div className="space-y-2">
              <Label htmlFor="motorista">Motorista *</Label>
              <Select
                value={editedPagamento.motoristaId || ""}
                onValueChange={handleMotoristaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map((motorista) => (
                    <SelectItem key={motorista.id} value={motorista.id}>
                      {motorista.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dados de Pagamento do Motorista */}
            {motoristaSelecionado && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">Dados para pagamento</p>
                  <Badge variant="outline">
                    {motoristaSelecionado.tipoPagamento === "pix" ? "PIX" : "Transferência"}
                  </Badge>
                </div>
                {motoristaSelecionado.tipoPagamento === "pix" ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Tipo de chave: {motoristaSelecionado.chavePixTipo?.toUpperCase()}
                    </div>
                    <div className="font-mono text-sm bg-background px-3 py-2 rounded border">
                      {motoristaSelecionado.chavePix}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Banco</p>
                      <p className="font-semibold">{motoristaSelecionado.banco}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Agência</p>
                      <p className="font-mono font-semibold">{motoristaSelecionado.agencia}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conta</p>
                      <p className="font-mono font-semibold">{motoristaSelecionado.conta}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="font-semibold">
                        {motoristaSelecionado.tipoConta === "corrente" ? "Corrente" : "Poupança"}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Seleção de Fretes */}
            {editedPagamento.motoristaId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Selecione os fretes para pagamento *</Label>
                  {fretesNaoPagos.length > 0 && (
                    <Badge className="bg-gradient-to-r from-blue-300 to-blue-400 text-slate-900 border-0">
                      {fretesNaoPagos.length} frete{fretesNaoPagos.length > 1 ? 's' : ''} aguardando
                    </Badge>
                  )}
                </div>
                {fretesNaoPagos.length === 0 ? (
                  <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Este motorista não possui fretes pendentes de pagamento
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {fretesNaoPagos.map((frete) => (
                      <Card 
                        key={frete.id} 
                        className={cn(
                          "p-4 cursor-pointer transition-all border-2 backdrop-blur-sm",
                          selectedFretes.includes(frete.id)
                            ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 shadow-md shadow-blue-200 dark:shadow-blue-900"
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              id={`frete-${frete.id}`}
                              checked={selectedFretes.includes(frete.id)}
                              onCheckedChange={() => handleToggleFrete(frete.id)}
                              className="h-5 w-5"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {frete.id}
                                </p>
                                <span className="text-slate-400 dark:text-slate-500">•</span>
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                  {frete.rota}
                                </p>
                                <Badge className="bg-gradient-to-r from-amber-300 to-orange-300 text-amber-800 text-xs border-0 ml-auto">
                                  Aguardando
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                📅 {frete.dataFrete} • 📦 {frete.toneladas} toneladas
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 min-w-max">
                            <div className={cn(
                              "text-base font-bold px-3 py-1 rounded-lg",
                              selectedFretes.includes(frete.id)
                                ? "bg-gradient-to-r from-emerald-400 to-green-400 text-white"
                                : "text-emerald-600"
                            )}>
                              R$ {frete.valorGerado.toLocaleString("pt-BR")}
                            </div>
                            <p className={cn(
                              "text-xs font-semibold px-2 py-1 rounded",
                              selectedFretes.includes(frete.id)
                                ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                                : "text-slate-400 dark:text-slate-500"
                            )}>
                              {selectedFretes.includes(frete.id) ? "✓ Selecionado" : "○ Não selecionado"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fretes Info */}
            {editedPagamento.toneladas ? (
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Toneladas</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {editedPagamento.toneladas}t
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fretes</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {editedPagamento.fretes}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              editedPagamento.motoristaId && fretesNaoPagos.length === 0 && (
                <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Este motorista não possui fretes pendentes de pagamento
                  </p>
                </Card>
              )
            )}

            <Separator />

            {/* Resumo de Valores com Descontos */}
            {selectedFretes.length > 0 && (
              <div className="space-y-4">
                {/* Detalhamento por Frete */}
                <div className="space-y-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Detalhamento de Custos por Frete</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {fretesNaoPagos
                      .filter((f) => selectedFretes.includes(f.id))
                      .map((frete) => {
                        const custosFrete = custosAdicionaisData.filter((c) => c.freteId === frete.id);
                        const totalCustos = custosFrete.reduce((sum, c) => sum + c.valor, 0);
                        const valorLiquido = frete.valorGerado - totalCustos;
                        return (
                          <Card key={frete.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{frete.id}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{frete.rota}</p>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Bruto</p>
                                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    R$ {frete.valorGerado.toLocaleString("pt-BR")}
                                  </p>
                                </div>
                              </div>
                              {custosFrete.length > 0 && (
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 pl-2 space-y-1">
                                  {custosFrete.map((custo, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                      <span className="text-slate-600 dark:text-slate-400">📌 {custo.descricao}</span>
                                      <span className="font-semibold text-red-600 dark:text-red-400">
                                        -R$ {custo.valor.toLocaleString("pt-BR")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {totalCustos > 0 && (
                                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2 bg-emerald-50 dark:bg-emerald-950/30 -mx-3 px-3 py-2 rounded">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Líquido do Frete</span>
                                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">R$ {valorLiquido.toLocaleString("pt-BR")}</span>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                </div>

                <Separator />

                {/* Resumo Final de Valores */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">Resumo Financeiro</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Valor Bruto</Label>
                      <Card className="p-4 bg-gradient-to-br from-blue-300 to-blue-400 text-slate-900 border-0 shadow-lg">
                        <p className="text-2xl font-bold">
                          R$ {fretesNaoPagos
                            .filter((f) => selectedFretes.includes(f.id))
                            .reduce((acc, f) => acc + f.valorGerado, 0)
                            .toLocaleString("pt-BR")}
                        </p>
                        <p className="text-xs text-blue-100 mt-1">Receita dos fretes</p>
                      </Card>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Total de Descontos</Label>
                      <Card className="p-4 bg-gradient-to-br from-red-300 to-red-400 text-slate-900 border-0 shadow-lg">
                        <p className="text-2xl font-bold">
                          -R$ {selectedFretes
                            .reduce((acc, freteId) => {
                              return (
                                acc +
                                custosAdicionaisData
                                  .filter((c) => c.freteId === freteId)
                                  .reduce((sum, c) => sum + c.valor, 0)
                              );
                            }, 0)
                            .toLocaleString("pt-BR")}
                        </p>
                        <p className="text-xs text-red-100 mt-1">Combustível, pedágio, etc</p>
                      </Card>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Valor a Pagar</Label>
                      <Card className="p-4 bg-gradient-to-br from-emerald-300 to-emerald-400 text-slate-900 border-0 shadow-lg">
                        <p className="text-2xl font-bold">
                          R$ {(editedPagamento.valorTotal || 0).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-xs text-emerald-100 mt-1">Líquido ao motorista</p>
                      </Card>
                    </div>
                  </div>
                </div>

                <Card className="p-5 bg-gradient-to-br from-purple-300 to-indigo-300 text-slate-900 border-0 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-700 font-semibold mb-1">Valor Unitário por Tonelada</p>
                      <p className="text-3xl font-bold">
                        R$ {(editedPagamento.valorUnitarioPorTonelada || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-700 mt-2">
                        📊 {editedPagamento.toneladas.toFixed(2)}t • Já com descontos incluídos
                      </p>
                    </div>
                    <DollarSign className="h-12 w-12 text-slate-400 opacity-50" />
                  </div>
                </Card>
              </div>
            )}

            <Separator />

            {/* Data do Pagamento e Status */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">Informações do Pagamento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">📅 Data do Pagamento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal gap-2 px-3 h-11 border-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        <Calendar className="h-4 w-4 text-blue-600" />
                        {editedPagamento.dataPagamento
                          ? new Date(
                              editedPagamento.dataPagamento.split("/").reverse().join("-")
                            ).toLocaleDateString("pt-BR")
                          : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 align-start" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={
                          editedPagamento.dataPagamento
                            ? new Date(
                                editedPagamento.dataPagamento.split("/").reverse().join("-")
                              )
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            const formattedDate = date.toLocaleDateString("pt-BR");
                            setEditedPagamento({
                              ...editedPagamento,
                              dataPagamento: formattedDate,
                            });
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2025-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statusPagamento" className="text-sm font-semibold">📌 Status *</Label>
                  <Select
                    value={editedPagamento.statusPagamento || "pendente"}
                    onValueChange={(value: "pendente" | "processando" | "pago" | "cancelado") =>
                      setEditedPagamento({
                        ...editedPagamento,
                        statusPagamento: value,
                      })
                    }
                  >
                    <SelectTrigger className="border-2 hover:border-blue-400 transition-colors h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">⏳ Pendente</SelectItem>
                      <SelectItem value="processando">⚙️ Processando</SelectItem>
                      <SelectItem value="pago">✓ Pago</SelectItem>
                      <SelectItem value="cancelado">✗ Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Método de Pagamento */}
            <div className="space-y-3">
              <Label htmlFor="metodoPagamento" className="text-sm font-semibold">💳 Método de Pagamento *</Label>
              <Select
                value={editedPagamento.metodoPagamento || "pix"}
                onValueChange={(value: "pix" | "transferencia_bancaria") =>
                  setEditedPagamento({
                    ...editedPagamento,
                    metodoPagamento: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia_bancaria">
                    Transferência Bancária
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Comprovante Upload */}
            <div className="space-y-3">
              <Label>Comprovante de Pagamento</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                <input
                  type="file"
                  id="comprovante"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="comprovante"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Paperclip className="h-6 w-6 text-muted-foreground/60" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {selectedFile ? selectedFile.name : "Clique para selecionar ou arraste"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG ou PNG (máx. 5MB)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                className="w-full min-h-24 px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Digite qualquer observação sobre este pagamento..."
                value={editedPagamento.observacoes || ""}
                onChange={(e) =>
                  setEditedPagamento({
                    ...editedPagamento,
                    observacoes: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Salvar Alterações" : "Registrar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
