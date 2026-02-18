import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, shortName } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  Download,
  FileSpreadsheet,
  FileText,
  Truck,
  TrendingUp,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  Fuel,
  Wrench,
  Coffee,
  Zap,
} from "lucide-react";

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

interface Gasto {
  tipo: string;
  valor: number;
  quantidade: number;
}

interface RelatorioMotorista {
  motorista: string;
  periodo: string;
  fretes: Frete[];
  gastos: Record<string, number>;
  totalGastos: number;
  totalReceita: number;
  totalMercadoria: number;
  totalFretes: number;
  resultado: number;
}

interface PagamentoRelatorio {
  id: string;
  motorista: string;
  dataPagamento: string;
  toneladas: number;
  valorTotal: number;
  metodo: "pix" | "transferencia_bancaria";
  status: "pendente" | "processando" | "pago" | "cancelado";
  fretes: string[];
}

const fretesData: Frete[] = [
  {
    id: "FRETE-2026-001",
    origem: "Fazenda Santa Rita - Marília, SP",
    destino: "Secador Central - Filial 1",
    motorista: "Carlos Silva",
    motoristaId: "1",
    caminhao: "ABC-1234",
    caminhaoId: "1",
    mercadoria: "Amendoim",
    mercadoriaId: "1",
    fazendaId: "1",
    fazendaNome: "Fazenda Santa Rita",
    variedade: "Runner IAC 886",
    dataFrete: "20/01/2025",
    quantidadeSacas: 600,
    toneladas: 15,
    valorPorTonelada: 1000,
    receita: 15000,
    custos: 3200,
    resultado: 11800,
  },
  {
    id: "FRETE-2026-002",
    origem: "Fazenda Boa Esperança - Tupã, SP",
    destino: "Cooperativa Central",
    motorista: "João Oliveira",
    motoristaId: "2",
    caminhao: "DEF-5678",
    caminhaoId: "2",
    mercadoria: "Amendoim",
    mercadoriaId: "1",
    fazendaId: "2",
    fazendaNome: "Fazenda Boa Esperança",
    variedade: "Runner IAC 886",
    dataFrete: "18/01/2025",
    quantidadeSacas: 400,
    toneladas: 10,
    valorPorTonelada: 950,
    receita: 9500,
    custos: 2100,
    resultado: 7400,
  },
  {
    id: "FRETE-2026-003",
    origem: "Fazenda Santa Rita - Marília, SP",
    destino: "Armazém Regional",
    motorista: "Carlos Silva",
    motoristaId: "1",
    caminhao: "ABC-1234",
    caminhaoId: "1",
    mercadoria: "Amendoim",
    mercadoriaId: "1",
    fazendaId: "1",
    fazendaNome: "Fazenda Santa Rita",
    variedade: "Granoleico",
    dataFrete: "15/01/2025",
    quantidadeSacas: 500,
    toneladas: 12.5,
    valorPorTonelada: 1100,
    receita: 13750,
    custos: 2800,
    resultado: 10950,
  },
  {
    id: "FRETE-2026-004",
    origem: "Fazenda Vale Verde - Assis, SP",
    destino: "Terminal de Grãos",
    motorista: "André Costa",
    motoristaId: "3",
    caminhao: "GHI-9012",
    caminhaoId: "3",
    mercadoria: "Amendoim",
    mercadoriaId: "1",
    fazendaId: "3",
    fazendaNome: "Fazenda Vale Verde",
    variedade: "Runner IAC 886",
    dataFrete: "12/01/2025",
    quantidadeSacas: 550,
    toneladas: 13.75,
    valorPorTonelada: 980,
    receita: 13475,
    custos: 3100,
    resultado: 10375,
  },
  {
    id: "FRETE-2026-006",
    origem: "Fazenda Boa Esperança - Tupã, SP",
    destino: "Secador Central - Filial 2",
    motorista: "Carlos Silva",
    motoristaId: "1",
    caminhao: "ABC-1234",
    caminhaoId: "1",
    mercadoria: "Amendoim",
    mercadoriaId: "1",
    fazendaId: "2",
    fazendaNome: "Fazenda Boa Esperança",
    variedade: "Granoleico",
    dataFrete: "22/01/2025",
    quantidadeSacas: 350,
    toneladas: 8.75,
    valorPorTonelada: 1050,
    receita: 9187.5,
    custos: 1900,
    resultado: 7287.5,
  },
];

const gastosData: Record<string, Record<string, number>> = {
  "Carlos Silva": {
    combustivel: 3200,
    pedagio: 800,
    manutencao: 500,
    alimentacao: 300,
  },
  "João Oliveira": {
    combustivel: 2100,
    pedagio: 600,
    manutencao: 0,
    alimentacao: 200,
  },
  "André Costa": {
    combustivel: 2800,
    pedagio: 900,
    manutencao: 2200,
    alimentacao: 350,
  },
};

const pagamentosData: PagamentoRelatorio[] = [
  {
    id: "P001",
    motorista: "Carlos Silva",
    dataPagamento: "22/01/2025",
    toneladas: 85,
    valorTotal: 12750,
    metodo: "pix",
    status: "pago",
    fretes: ["FRETE-2026-001", "FRETE-2026-003"],
  },
  {
    id: "P002",
    motorista: "João Oliveira",
    dataPagamento: "25/01/2025",
    toneladas: 45,
    valorTotal: 6750,
    metodo: "transferencia_bancaria",
    status: "processando",
    fretes: ["FRETE-2026-002"],
  },
  {
    id: "P003",
    motorista: "André Costa",
    dataPagamento: "28/01/2025",
    toneladas: 55,
    valorTotal: 8250,
    metodo: "pix",
    status: "pendente",
    fretes: ["FRETE-2026-004"],
  },
];

export default function Relatorios() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [motorista, setMotorista] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("resumo");

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setMotorista("all");
  };

  // Verificar se algum filtro está ativo
  const hasActiveFilters = dateFrom || dateTo || motorista !== "all";

  // Filtrar dados com base nos filtros (se não houver filtros, mostra tudo)
  const filteredFretes = useMemo(() => {
    return fretesData.filter((frete) => {
      // Filtro de motorista
      if (motorista !== "all" && frete.motorista !== motorista) return false;
      
      // Filtro de data (opcional)
      if (dateFrom || dateTo) {
        const [dia, mes, ano] = frete.dataFrete.split("/");
        const freteDate = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        
        if (dateFrom && freteDate < dateFrom) return false;
        if (dateTo && freteDate > dateTo) return false;
      }
      
      return true;
    });
  }, [motorista, dateFrom, dateTo]);

  // Calcular resumo do motorista selecionado
  const relatorioMotorista = useMemo(() => {
    const motoristasSelecionados =
      motorista === "all" ? ["Carlos Silva", "João Oliveira", "André Costa"] : [motorista];
    
    const resumo: RelatorioMotorista = {
      motorista: motorista === "all" ? "Todos os motoristas" : motorista,
      periodo: dateFrom || dateTo 
        ? `${dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Início"} - ${dateTo ? format(dateTo, "dd/MM/yyyy") : "Fim"}`
        : "Todo o período",
      fretes: filteredFretes,
      gastos: {},
      totalGastos: 0,
      totalReceita: 0,
      totalMercadoria: 0,
      totalFretes: filteredFretes.length,
      resultado: 0,
    };

    // Agregar gastos
    motoristasSelecionados.forEach((m) => {
      const gastosMotorista = gastosData[m] || {};
      Object.entries(gastosMotorista).forEach(([tipo, valor]) => {
        resumo.gastos[tipo] = (resumo.gastos[tipo] || 0) + valor;
      });
    });

    // Calcular totais
    resumo.totalGastos = Object.values(resumo.gastos).reduce((a, b) => a + b, 0);
    resumo.totalReceita = filteredFretes.reduce((acc, f) => acc + f.receita, 0);
    resumo.totalMercadoria = filteredFretes.reduce((acc, f) => acc + f.quantidadeSacas, 0);
    resumo.resultado = resumo.totalReceita - resumo.totalGastos;

    return resumo;
  }, [motorista, dateFrom, dateTo, filteredFretes]);

  const filteredPagamentos = useMemo(() => {
    return pagamentosData.filter((pagamento) => {
      if (motorista !== "all" && pagamento.motorista !== motorista) return false;

      if (dateFrom || dateTo) {
        const [dia, mes, ano] = pagamento.dataPagamento.split("/");
        const pagamentoDate = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));

        if (dateFrom && pagamentoDate < dateFrom) return false;
        if (dateTo && pagamentoDate > dateTo) return false;
      }

      return true;
    });
  }, [motorista, dateFrom, dateTo]);

  const pagamentosResumo = useMemo(() => {
    const total = filteredPagamentos.reduce((acc, p) => acc + p.valorTotal, 0);
    const pago = filteredPagamentos
      .filter((p) => p.status === "pago")
      .reduce((acc, p) => acc + p.valorTotal, 0);
    const pendente = filteredPagamentos
      .filter((p) => p.status !== "pago")
      .reduce((acc, p) => acc + p.valorTotal, 0);
    return { total, pago, pendente };
  }, [filteredPagamentos]);

  const pagamentosColumns = [
    {
      key: "id",
      header: "ID Pagamento",
      render: (item: PagamentoRelatorio) => (
        <span className="font-mono font-bold text-primary">{item.id}</span>
      ),
    },
    { key: "motorista", header: "Motorista", render: (item: PagamentoRelatorio) => (
      <span className="font-medium">{shortName(item.motorista)}</span>
    ) },
    {
      key: "dataPagamento",
      header: "Data",
      render: (item: PagamentoRelatorio) => (
        <span className="text-sm text-muted-foreground">{item.dataPagamento}</span>
      ),
    },
    {
      key: "toneladas",
      header: "Toneladas",
      render: (item: PagamentoRelatorio) => (
        <span className="font-semibold">{item.toneladas}t</span>
      ),
    },
    {
      key: "valorTotal",
      header: "Valor",
      render: (item: PagamentoRelatorio) => (
        <span className="font-semibold text-profit">
          R$ {item.valorTotal.toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: PagamentoRelatorio) => (
        <Badge
          variant={
            item.status === "pago"
              ? "completed"
              : item.status === "processando"
              ? "inTransit"
              : item.status === "pendente"
              ? "pending"
              : "cancelled"
          }
        >
          {item.status === "pago"
            ? "Pago"
            : item.status === "processando"
            ? "Processando"
            : item.status === "pendente"
            ? "Pendente"
            : "Cancelado"}
        </Badge>
      ),
    },
    {
      key: "fretes",
      header: "Fretes",
      render: (item: PagamentoRelatorio) => (
        <span className="text-xs text-muted-foreground">
          {item.fretes.join(", ")}
        </span>
      ),
    },
  ];

  const columns = [
    {
      key: "id",
      header: "ID Frete",
      render: (item: Frete) => (
        <span className="font-mono font-bold">{item.id}</span>
      ),
    },
    { 
      key: "origem", 
      header: "Origem",
      render: (item: Frete) => (
        <div>
          <p className="font-semibold text-sm">{item.fazendaNome}</p>
          <p className="text-xs text-muted-foreground">{item.origem}</p>
        </div>
      ),
    },
    { key: "destino", header: "Destino" },
    { 
      key: "mercadoria", 
      header: "Mercadoria",
      render: (item: Frete) => (
        <div>
          <p className="font-medium">{item.mercadoria}</p>
          {item.variedade && (
            <p className="text-xs text-muted-foreground">{item.variedade}</p>
          )}
        </div>
      ),
    },
    {
      key: "quantidade",
      header: "Quantidade",
      render: (item: Frete) => (
        <div>
          <p className="font-semibold">{item.quantidadeSacas} sacas</p>
          <p className="text-xs text-muted-foreground">{item.toneladas.toFixed(2)}t</p>
        </div>
      ),
    },
    { key: "dataFrete", header: "Data" },
    {
      key: "receita",
      header: "Receita",
      render: (item: Frete) => (
        <span className="font-medium text-profit">
          R$ {item.receita.toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "resultado",
      header: "Resultado",
      render: (item: Frete) => (
        <Badge variant={item.resultado >= 0 ? "profit" : "loss"}>
          {item.resultado >= 0 ? "+" : ""}R${" "}
          {(item.resultado / 1000).toFixed(1)}k
        </Badge>
      ),
    },
  ];

  return (
    <MainLayout title="Relatórios" subtitle="Análise detalhada por motorista">
      <div className="space-y-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios Inteligentes</h1>
            <p className="text-muted-foreground mt-1">Acompanhe fretes, custos e desempenho com precisão</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
        
        {motorista !== "all" && (
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Motorista Selecionado</p>
                <p className="text-lg font-bold text-blue-600">{motorista}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Filters - Improved Design */}
      <div className="mb-8 p-6 bg-gradient-to-r from-card to-card/50 rounded-xl border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm text-muted-foreground">FILTROS</h3>
            {hasActiveFilters ? (
              <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">
                Filtros ativos
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Mostrando todos os dados
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
              <AlertCircle className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Data Início */}
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Data Início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal hover:bg-primary/5",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {dateFrom
                    ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data Fim */}
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Data Fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal hover:bg-primary/5",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {dateTo
                    ? format(dateTo, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Motorista */}
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Motorista</label>
            <Select value={motorista} onValueChange={setMotorista}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                <SelectItem value="Carlos Silva">Carlos Silva</SelectItem>
                <SelectItem value="João Oliveira">João Oliveira</SelectItem>
                <SelectItem value="André Costa">André Costa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão Gerar */}
          <Button className="gap-2 shadow-sm hover:shadow-md transition-shadow w-full lg:w-auto">
            <Zap className="h-4 w-4" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Tabs - Improved */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2 h-auto p-2 bg-muted/30 border rounded-xl">
          <TabsTrigger 
            value="resumo" 
            className={cn(
              "gap-2 py-4 px-4 rounded-lg transition-all duration-200",
              activeTab === "resumo" 
                ? "bg-blue-500 text-white shadow-lg scale-105" 
                : "hover:bg-blue-500/10 text-foreground"
            )}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="font-semibold">Resumo</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="viagens"
            className={cn(
              "gap-2 py-4 px-4 rounded-lg transition-all duration-200",
              activeTab === "viagens" 
                ? "bg-purple-500 text-white shadow-lg scale-105" 
                : "hover:bg-purple-500/10 text-foreground"
            )}
          >
            <Truck className="h-5 w-5" />
            <span className="font-semibold">Fretes</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="gastos"
            className={cn(
              "gap-2 py-4 px-4 rounded-lg transition-all duration-200",
              activeTab === "gastos" 
                ? "bg-orange-500 text-white shadow-lg scale-105" 
                : "hover:bg-orange-500/10 text-foreground"
            )}
          >
            <DollarSign className="h-5 w-5" />
            <span className="font-semibold">Gastos</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="mercadorias"
            className={cn(
              "gap-2 py-4 px-4 rounded-lg transition-all duration-200",
              activeTab === "mercadorias" 
                ? "bg-green-500 text-white shadow-lg scale-105" 
                : "hover:bg-green-500/10 text-foreground"
            )}
          >
            <Package className="h-5 w-5" />
            <span className="font-semibold">Cargas</span>
          </TabsTrigger>

          <TabsTrigger 
            value="pagamentos"
            className={cn(
              "gap-2 py-4 px-4 rounded-lg transition-all duration-200",
              activeTab === "pagamentos" 
                ? "bg-emerald-500 text-white shadow-lg scale-105" 
                : "hover:bg-emerald-500/10 text-foreground"
            )}
          >
            <DollarSign className="h-5 w-5" />
            <span className="font-semibold">Pagamentos</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: RESUMO GERAL */}
        <TabsContent value="resumo" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-semibold text-lg">Resumo Geral</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fretes */}
            <Card 
              onClick={() => setActiveTab("viagens")}
              className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 cursor-pointer hover:scale-105 hover:bg-blue-100/50 dark:hover:bg-blue-950/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total de Fretes</p>
                  <p className="text-4xl font-bold text-blue-600">{relatorioMotorista.totalFretes}</p>
                  <p className="text-xs text-muted-foreground mt-2">Clique para ver detalhes</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            {/* Receita */}
            <Card 
              onClick={() => setActiveTab("viagens")}
              className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-profit bg-gradient-to-br from-profit/5 to-transparent cursor-pointer hover:scale-105 hover:bg-profit/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Receita Total</p>
                  <p className="text-4xl font-bold text-profit">
                    R$ {(relatorioMotorista.totalReceita / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Clique para ver detalhes</p>
                </div>
                <div className="bg-profit/10 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-profit" />
                </div>
              </div>
            </Card>

            {/* Gastos */}
            <Card 
              onClick={() => setActiveTab("gastos")}
              className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-loss bg-gradient-to-br from-loss/5 to-transparent cursor-pointer hover:scale-105 hover:bg-loss/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Gastos Totais</p>
                  <p className="text-4xl font-bold text-loss">
                    R$ {(relatorioMotorista.totalGastos / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Clique para ver detalhes</p>
                </div>
                <div className="bg-loss/10 p-3 rounded-lg">
                  <Zap className="h-6 w-6 text-loss" />
                </div>
              </div>
            </Card>

            {/* Resultado */}
            <Card
              onClick={() => setActiveTab("resumo")}
              className={cn(
                "p-6 hover:shadow-lg transition-all duration-300 border-l-4 cursor-pointer hover:scale-105",
                relatorioMotorista.resultado >= 0
                  ? "border-l-profit bg-gradient-to-br from-profit/5 to-transparent hover:bg-profit/10"
                  : "border-l-loss bg-gradient-to-br from-loss/5 to-transparent hover:bg-loss/10"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Resultado Líquido</p>
                  <p
                    className={cn(
                      "text-4xl font-bold",
                      relatorioMotorista.resultado >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {relatorioMotorista.resultado >= 0 ? "+" : ""}R${" "}
                    {(relatorioMotorista.resultado / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {relatorioMotorista.resultado >= 0 ? "✓ Lucro" : "✗ Prejuízo"}
                  </p>
                </div>
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    relatorioMotorista.resultado >= 0
                      ? "bg-profit/10"
                      : "bg-loss/10"
                  )}
                >
                  {relatorioMotorista.resultado >= 0 ? (
                    <CheckCircle2 className="h-6 w-6 text-profit" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-loss" />
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Período */}
            <Card className="p-6 border-dashed">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-2">Período do Relatório</h3>
                  <p className="text-lg font-mono text-foreground">{relatorioMotorista.periodo}</p>
                </div>
              </div>
            </Card>

            {/* Motorista */}
            <Card 
              onClick={() => setActiveTab("viagens")}
              className="p-6 border-dashed cursor-pointer hover:shadow-md hover:bg-muted/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-2">Motorista Selecionado</h3>
                  <p className="text-lg font-semibold text-foreground">
                    {relatorioMotorista.motorista}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Clique para ver viagens</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Indicador de Saúde */}
          <Card 
            onClick={() => setActiveTab("gastos")}
            className="p-6 cursor-pointer hover:shadow-lg hover:bg-muted/30 transition-all"
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Eficiência Operacional</h3>
                  <Badge variant={relatorioMotorista.resultado >= 0 ? "profit" : "loss"}>
                    {(
                      ((relatorioMotorista.totalReceita - relatorioMotorista.totalGastos) /
                        relatorioMotorista.totalReceita) *
                      100
                    ).toFixed(1)}
                    % de margem
                  </Badge>
                </div>
                <Progress
                  value={Math.max(
                    0,
                    Math.min(
                      100,
                      ((relatorioMotorista.totalReceita - relatorioMotorista.totalGastos) /
                        relatorioMotorista.totalReceita) *
                        100
                    )
                  )}
                  className="h-3"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Proporção entre lucro e receita total - Clique para ver análise de gastos
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* TAB: FRETES */}
        <TabsContent value="viagens">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="font-semibold text-lg">Relatório de Fretes</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <Card className="p-4">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Todos os Fretes</h3>
              <p className="text-sm text-muted-foreground">
                Clique em qualquer frete para ver mais detalhes
              </p>
            </div>
            <DataTable<Frete>
              columns={columns}
              data={relatorioMotorista.fretes}
              emptyMessage="Nenhum frete encontrado no período"
            />
          </Card>
        </TabsContent>

        {/* TAB: GASTOS POR CATEGORIA */}
        <TabsContent value="gastos" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-semibold text-lg">Relatório de Gastos</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Combustível */}
            {relatorioMotorista.gastos["combustivel"] && (
              <Card className="p-4 hover:shadow-lg transition-all border-t-4 border-t-orange-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Combustível</p>
                    <p className="text-2xl font-bold text-orange-600">
                      R$ {relatorioMotorista.gastos["combustivel"].toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                    <Fuel className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((relatorioMotorista.gastos["combustivel"] / relatorioMotorista.totalGastos) * 100).toFixed(1)}% dos gastos
                </p>
              </Card>
            )}

            {/* Manutenção */}
            {relatorioMotorista.gastos["manutencao"] && (
              <Card className="p-4 hover:shadow-lg transition-all border-t-4 border-t-red-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Manutenção</p>
                    <p className="text-2xl font-bold text-red-600">
                      R$ {relatorioMotorista.gastos["manutencao"].toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <Wrench className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((relatorioMotorista.gastos["manutencao"] / relatorioMotorista.totalGastos) * 100).toFixed(1)}% dos gastos
                </p>
              </Card>
            )}

            {/* Pedágio */}
            {relatorioMotorista.gastos["pedagio"] && (
              <Card className="p-4 hover:shadow-lg transition-all border-t-4 border-t-purple-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Pedágio</p>
                    <p className="text-2xl font-bold text-purple-600">
                      R$ {relatorioMotorista.gastos["pedagio"].toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((relatorioMotorista.gastos["pedagio"] / relatorioMotorista.totalGastos) * 100).toFixed(1)}% dos gastos
                </p>
              </Card>
            )}

            {/* Alimentação */}
            {relatorioMotorista.gastos["alimentacao"] && (
              <Card className="p-4 hover:shadow-lg transition-all border-t-4 border-t-green-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Alimentação</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {relatorioMotorista.gastos["alimentacao"].toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                    <Coffee className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((relatorioMotorista.gastos["alimentacao"] / relatorioMotorista.totalGastos) * 100).toFixed(1)}% dos gastos
                </p>
              </Card>
            )}
          </div>

          {/* Total e Média */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 bg-gradient-to-br from-loss/5 to-transparent border-2 border-loss/20">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Total de Gastos</h3>
                <p className="text-4xl font-bold text-loss">
                  R$ {relatorioMotorista.totalGastos.toLocaleString("pt-BR")}
                </p>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Média por viagem: <span className="font-semibold text-foreground">
                      R$ {(relatorioMotorista.totalGastos / relatorioMotorista.totalFretes).toLocaleString("pt-BR")}
                    </span>
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Distribuição de Gastos</h3>
                <div className="space-y-2">
                  {Object.entries(relatorioMotorista.gastos).map(([tipo, valor]) => (
                    <div key={tipo} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{tipo}</span>
                        <span className="font-semibold">
                          {((valor / relatorioMotorista.totalGastos) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={(valor / relatorioMotorista.totalGastos) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: MERCADORIAS */}
        <TabsContent value="mercadorias" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-xl">Relatório de Cargas Transportadas</h3>
              <p className="text-sm text-muted-foreground mt-1">Análise detalhada de mercadorias e volume</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Carregado */}
            <Card className="p-6 bg-gradient-to-br from-green-50/80 to-green-100/30 dark:from-green-950/30 dark:to-green-900/10 border-2 border-green-200 dark:border-green-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Volume Total</p>
                  <p className="text-4xl font-bold text-green-600 mb-1">
                    {relatorioMotorista.totalMercadoria.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-green-700 font-semibold">sacas</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ≈ <span className="font-bold">{(relatorioMotorista.totalMercadoria * 60 / 1000).toFixed(2)}</span> toneladas
                  </p>
                </div>
                <div className="bg-green-500/10 p-3 rounded-xl">
                  <Package className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </Card>

            {/* Média por Frete */}
            <Card className="p-6 bg-gradient-to-br from-blue-50/80 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/10 border-2 border-blue-200 dark:border-blue-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Média por Frete</p>
                  <p className="text-4xl font-bold text-blue-600 mb-1">
                    {relatorioMotorista.totalFretes > 0
                      ? (relatorioMotorista.totalMercadoria / relatorioMotorista.totalFretes).toFixed(0)
                      : 0}
                  </p>
                  <p className="text-sm text-blue-700 font-semibold">sacas/frete</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ≈ <span className="font-bold">{relatorioMotorista.totalFretes > 0 ? ((relatorioMotorista.totalMercadoria / relatorioMotorista.totalFretes) * 60 / 1000).toFixed(2) : 0}</span> ton/frete
                  </p>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </Card>

            {/* Maior Carga */}
            <Card className="p-6 bg-gradient-to-br from-purple-50/80 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/10 border-2 border-purple-200 dark:border-purple-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Maior Carga</p>
                  <p className="text-4xl font-bold text-purple-600 mb-1">
                    {relatorioMotorista.fretes.length > 0 ? Math.max(...relatorioMotorista.fretes.map(f => f.quantidadeSacas)) : 0}
                  </p>
                  <p className="text-sm text-purple-700 font-semibold">sacas</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ≈ <span className="font-bold">{relatorioMotorista.fretes.length > 0 ? Math.max(...relatorioMotorista.fretes.map(f => f.toneladas)).toFixed(2) : 0}</span> toneladas
                  </p>
                </div>
                <div className="bg-purple-500/10 p-3 rounded-xl">
                  <CheckCircle2 className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </Card>

            {/* Menor Carga */}
            <Card className="p-6 bg-gradient-to-br from-orange-50/80 to-orange-100/30 dark:from-orange-950/30 dark:to-orange-900/10 border-2 border-orange-200 dark:border-orange-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Menor Carga</p>
                  <p className="text-4xl font-bold text-orange-600 mb-1">
                    {relatorioMotorista.fretes.length > 0 ? Math.min(...relatorioMotorista.fretes.map(f => f.quantidadeSacas)) : 0}
                  </p>
                  <p className="text-sm text-orange-700 font-semibold">sacas</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ≈ <span className="font-bold">{relatorioMotorista.fretes.length > 0 ? Math.min(...relatorioMotorista.fretes.map(f => f.toneladas)).toFixed(2) : 0}</span> toneladas
                  </p>
                </div>
                <div className="bg-orange-500/10 p-3 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Análise por Tipo de Mercadoria */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg">Distribuição por Tipo de Mercadoria</h3>
                <p className="text-sm text-muted-foreground">Breakdown detalhado por produto</p>
              </div>
            </div>
            
            {(() => {
              const mercadoriaStats = relatorioMotorista.fretes.reduce((acc, f) => {
                if (!acc[f.mercadoria]) {
                  acc[f.mercadoria] = { quantidade: 0, fretes: 0, receita: 0, toneladas: 0 };
                }
                acc[f.mercadoria].quantidade += f.quantidadeSacas;
                acc[f.mercadoria].toneladas += f.toneladas;
                acc[f.mercadoria].fretes += 1;
                acc[f.mercadoria].receita += f.receita;
                return acc;
              }, {} as Record<string, { quantidade: number; fretes: number; receita: number; toneladas: number }>);

              const totalQtd = Object.values(mercadoriaStats).reduce((acc, m) => acc + m.quantidade, 0);

              return (
                <div className="space-y-4">
                  {Object.entries(mercadoriaStats).map(([mercadoria, stats], idx) => {
                    const percentual = (stats.quantidade / totalQtd) * 100;
                    const colors = ["blue", "green", "purple", "orange", "pink"];
                    const color = colors[idx % colors.length];
                    
                    return (
                      <div key={mercadoria} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full bg-${color}-500`}></div>
                            <div>
                              <p className="font-semibold text-foreground">{mercadoria}</p>
                              <p className="text-xs text-muted-foreground">{stats.fretes} {stats.fretes === 1 ? 'frete' : 'fretes'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">{stats.quantidade.toLocaleString("pt-BR")} sacas</p>
                            <p className="text-xs text-muted-foreground">{stats.toneladas.toFixed(2)} ton • {percentual.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={percentual} className={`flex-1 h-3 bg-${color}-100`} />
                          <span className="text-sm font-semibold text-muted-foreground min-w-[50px] text-right">
                            {percentual.toFixed(1)}%
                          </span>
                        </div>
                        <div className="pl-6 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                          <div>
                            <span className="font-semibold">Receita:</span> R$ {stats.receita.toLocaleString("pt-BR")}
                          </div>
                          <div>
                            <span className="font-semibold">Média/frete:</span> {(stats.quantidade / stats.fretes).toFixed(0)} sacas
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {Object.keys(mercadoriaStats).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma carga registrada no período selecionado</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>

          {/* Detalhamento de Cargas por Frete */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Detalhamento por Frete</h3>
                <p className="text-sm text-muted-foreground">Todas as cargas transportadas no período</p>
              </div>
              <Badge variant="outline" className="bg-primary/5">
                {relatorioMotorista.fretes.length} {relatorioMotorista.fretes.length === 1 ? 'frete' : 'fretes'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {relatorioMotorista.fretes.length > 0 ? (
                relatorioMotorista.fretes.map((frete, idx) => (
                  <div
                    key={frete.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/40 to-transparent hover:from-muted/60 hover:to-muted/20 rounded-lg transition-all group border border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-primary/10 group-hover:bg-primary/20 transition-colors px-3 py-2 rounded-lg">
                        <span className="text-lg font-bold text-primary">#{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-foreground">{frete.mercadoria}</p>
                          <Badge variant="outline" className="text-xs">{frete.id}</Badge>
                          {frete.variedade && (
                            <Badge variant="secondary" className="text-xs">{frete.variedade}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {frete.fazendaNome} → {frete.destino}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{frete.dataFrete}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{frete.motorista}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-2xl font-bold text-green-600">{frete.quantidadeSacas}</p>
                      <p className="text-xs text-muted-foreground">sacas</p>
                      <p className="text-xs text-foreground font-semibold">
                        {frete.toneladas.toFixed(2)} ton
                      </p>
                      <p className="text-xs text-profit font-semibold">
                        R$ {frete.receita.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-semibold mb-1">Nenhum frete registrado</p>
                  <p className="text-sm">Selecione um período ou motorista para visualizar os dados</p>
                </div>
              )}
            </div>
          </Card>

          {/* Indicadores de Performance */}
          {relatorioMotorista.fretes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-gradient-to-br from-emerald-50/50 to-transparent border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Utilização</p>
                </div>
                <p className="text-3xl font-bold text-emerald-600">
                  {((relatorioMotorista.totalMercadoria / (relatorioMotorista.totalFretes * 600)) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Capacidade média aproveitada</p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-cyan-50/50 to-transparent border-l-4 border-l-cyan-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-lg">
                    <DollarSign className="h-5 w-5 text-cyan-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Receita por Saca</p>
                </div>
                <p className="text-3xl font-bold text-cyan-600">
                  R$ {relatorioMotorista.totalMercadoria > 0 ? (relatorioMotorista.totalReceita / relatorioMotorista.totalMercadoria).toFixed(2) : "0.00"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Valor médio unitário</p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-indigo-50/50 to-transparent border-l-4 border-l-indigo-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                    <Truck className="h-5 w-5 text-indigo-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Eficiência Logística</p>
                </div>
                <p className="text-3xl font-bold text-indigo-600">
                  {relatorioMotorista.totalFretes > 0 ? ((relatorioMotorista.totalReceita / relatorioMotorista.totalFretes) / 1000).toFixed(1) : "0.0"}k
                </p>
                <p className="text-xs text-muted-foreground mt-1">Receita por frete</p>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB: PAGAMENTOS */}
        <TabsContent value="pagamentos" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-semibold text-lg">Relatório de Pagamentos</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          {/* Resumo de Pagamentos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-2 border-primary/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Pago</p>
                  <p className="text-4xl font-bold text-profit">
                    R$ {pagamentosResumo.pago.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Período filtrado</p>
                </div>
                <div className="bg-profit/10 p-3 rounded-xl">
                  <DollarSign className="h-6 w-6 text-profit" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-yellow-50/60 to-transparent border-2 border-yellow-200/60 dark:border-yellow-900/40">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Pendente</p>
                  <p className="text-4xl font-bold text-yellow-600">
                    R$ {pagamentosResumo.pendente.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Processando + Pendente</p>
                </div>
                <div className="bg-yellow-100/70 dark:bg-yellow-900/30 p-3 rounded-xl">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-2 border-muted">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Geral</p>
                  <p className="text-4xl font-bold text-foreground">
                    R$ {pagamentosResumo.total.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Todos os status</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>
          </div>

          {/* Tabela de Pagamentos */}
          <Card className="p-4">
            <h3 className="font-semibold text-lg mb-4">Pagamentos por Motorista</h3>
            <DataTable<PagamentoRelatorio>
              columns={pagamentosColumns}
              data={filteredPagamentos}
              emptyMessage="Nenhum pagamento encontrado para o período"
            />
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
