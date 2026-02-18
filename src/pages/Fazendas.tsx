import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodoFilter } from "@/components/shared/PeriodoFilter";
import { FilterBar } from "@/components/shared/FilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Plus, Package, Weight, DollarSign, Edit, MapPin, Save, X, Info, TrendingUp, TrendingDown, Calendar, User, Sparkles, BarChart3, FileDown, CheckCircle2, Truck, AlertCircle, Filter } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import fazendasService from "@/services/fazendas";
import { usePeriodoFilter } from "@/hooks/usePeriodoFilter";
import { formatarInputMoeda, desformatarMoeda } from "@/utils/formatters";
import type { Fazenda, CriarFazendaPayload } from "@/types";
import { ITEMS_PER_PAGE } from "@/lib/pagination";

export default function Fazendas() {
  const queryClient = useQueryClient();

  // Gerar opções de safra dinamicamente (últimos 5 anos e próximos 3)
  const gerarOpcoesSafra = () => {
    const anoAtual = new Date().getFullYear();
    const opcoes: string[] = [];
    for (let i = -5; i <= 3; i++) {
      const ano = anoAtual + i;
      opcoes.push(`${ano}/${ano + 1}`);
    }
    return opcoes.reverse(); // Mais recentes primeiro
  };

  const opcoesSafra = gerarOpcoesSafra();

  // Query para listar fazendas
  const { data: fazendasResponse, isLoading } = useQuery({
    queryKey: ["fazendas"],
    queryFn: fazendasService.listarFazendas,
  });

  const fazendas: Fazenda[] = fazendasResponse?.data || [];

  // Hook para filtro de período (usa created_at ou data_atualizacao)
  const {
    tipoVisualizacao,
    selectedPeriodo,
    periodosDisponiveis,
    dadosFiltrados: fazendasFiltradas,
    formatPeriodoLabel,
    setTipoVisualizacao,
    setSelectedPeriodo,
  } = usePeriodoFilter({
    data: fazendas,
    getDataField: (f) => f.updated_at || f.created_at || new Date().toISOString(),
  });

  const toNumber = (value: number | string | null | undefined) => {
    if (typeof value === "number") return value;
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  // Mutation para criar fazenda
  const createMutation = useMutation({
    mutationFn: fazendasService.criarFazenda,
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["fazendas"] });
        toast.success("Fazenda cadastrada com sucesso!");
        setIsModalOpen(false);
      } else {
        toast.error(response.message || "Erro ao cadastrar fazenda");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao cadastrar fazenda");
    },
  });

  // Mutation para atualizar fazenda
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CriarFazendaPayload> }) =>
      fazendasService.atualizarFazenda(id, data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["fazendas"] });
        toast.success("Fazenda atualizada com sucesso!");
        setIsModalOpen(false);
      } else {
        toast.error(response.message || "Erro ao atualizar fazenda");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao atualizar fazenda");
    },
  });

  // Mutation para deletar fazenda
  const deleteMutation = useMutation({
    mutationFn: fazendasService.deletarFazenda,
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["fazendas"] });
        toast.success("Fazenda removida com sucesso!");
      } else {
        toast.error(response.message || "Erro ao remover fazenda");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao remover fazenda");
    },
  });
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProducao, setSelectedProducao] = useState<Fazenda | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newProducao, setNewProducao] = useState<Partial<Fazenda>>({
    fazenda: "",
    localizacao: "",
    proprietario: "",
    mercadoria: "",
    variedade: "",
    total_sacas_carregadas: 0,
    total_toneladas: 0,
    faturamento_total: 0,
    preco_por_tonelada: 0,
    peso_medio_saca: 25,
    safra: "2024/2025",
    colheita_finalizada: false,
  });

  const handleOpenNewModal = () => {
    setNewProducao({
      fazenda: "",
      localizacao: "",
      proprietario: "",
      mercadoria: "",
      variedade: "",
      total_sacas_carregadas: 0,
      total_toneladas: 0,
      faturamento_total: 0,
      preco_por_tonelada: 0,
      peso_medio_saca: 25,
      safra: "2024/2025",
      colheita_finalizada: false,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
  };

  const handleOpenEditModal = (producao: Fazenda) => {
    setNewProducao(producao);
    setIsEditing(true);
    setSelectedProducao(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!newProducao.fazenda || !newProducao.mercadoria || !newProducao.variedade) {
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }

    if (isEditing && newProducao.id) {
      const payloadForUpdate: Partial<CriarFazendaPayload> = {
        fazenda: newProducao.fazenda,
        localizacao: newProducao.localizacao,
        proprietario: newProducao.proprietario,
        mercadoria: newProducao.mercadoria,
        variedade: newProducao.variedade,
        preco_por_tonelada: newProducao.preco_por_tonelada,
        peso_medio_saca: newProducao.peso_medio_saca,
        safra: newProducao.safra,
        total_sacas_carregadas: newProducao.total_sacas_carregadas,
        total_toneladas: newProducao.total_toneladas,
        faturamento_total: newProducao.faturamento_total,
        ultimo_frete: newProducao.ultimo_frete,
        colheita_finalizada: newProducao.colheita_finalizada,
      };

      updateMutation.mutate({ id: newProducao.id, data: payloadForUpdate });
    } else {
      const payload: CriarFazendaPayload = {
        fazenda: newProducao.fazenda!,
        localizacao: newProducao.localizacao || "",
        proprietario: newProducao.proprietario || "",
        mercadoria: newProducao.mercadoria!,
        variedade: newProducao.variedade || "",
        preco_por_tonelada: newProducao.preco_por_tonelada || 0,
        peso_medio_saca: newProducao.peso_medio_saca || 25,
        safra: newProducao.safra || "2024/2025",
        total_sacas_carregadas: 0,
        total_toneladas: 0,
        faturamento_total: 0,
        ultimo_frete: "-",
        colheita_finalizada: false,
      };

      createMutation.mutate(payload);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = ITEMS_PER_PAGE;

  const filteredData = fazendas.filter(
    (p) =>
      p.fazenda.toLowerCase().includes(search.toLowerCase()) ||
      p.mercadoria.toLowerCase().includes(search.toLowerCase()) ||
      (p.variedade?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (p.proprietario?.toLowerCase() || "").includes(search.toLowerCase())
  );

  // Lógica de paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fazendasAtivas = paginatedData.filter((p) => !p.colheita_finalizada);
  const fazendasFinalizadas = paginatedData.filter((p) => p.colheita_finalizada);

  // Função para adicionar produção quando um frete é carregado
  useEffect(() => {
    (window as any).adicionarProducao = (
      fazendaId: string,
      quantidadeSacas: number,
      valorFrete: number,
      toneladas: number
    ) => {
      const fazenda = fazendas.find((f) => f.id === fazendaId);
      if (fazenda) {
        updateMutation.mutate({
          id: fazendaId,
          data: {
            total_sacas_carregadas: (fazenda.total_sacas_carregadas || 0) + quantidadeSacas,
            total_toneladas: (fazenda.total_toneladas || 0) + toneladas,
            faturamento_total: (fazenda.faturamento_total || 0) + valorFrete,
            ultimo_frete: new Date().toLocaleDateString("pt-BR"),
          },
        });
      }
    };

    // Expor fazendas para uso em outras páginas
    (window as any).getProducaoFazendas = () => fazendas;
  }, [fazendas, updateMutation]);

  // Abrir modal de edição quando rota /fazendas/editar/:id for acessada
  const fazendaParams = useParams();
  useEffect(() => {
    const idParam = fazendaParams.id;
    if (!idParam) return;
    if (fazendas.length > 0) {
      const found = fazendas.find((f) => String(f.id) === String(idParam));
      if (found) handleOpenEditModal(found);
    }
  }, [fazendaParams.id, fazendas]);

  const handleToggleColheitaFinalizada = (fazendaId: string) => {
    const fazenda = fazendas.find((p) => p.id === fazendaId);
    if (fazenda) {
      const statusAtual = !!fazenda.colheita_finalizada;
      updateMutation.mutate({
        id: fazendaId,
        data: { colheita_finalizada: !statusAtual },
      });
      toast.success(
        statusAtual
          ? "Colheita reaberta para atualização."
          : "Colheita finalizada com sucesso!"
      );
    }
  };

  const handleExportarPDF = (fazenda: Fazenda) => {
    const doc = new jsPDF();

    // ==================== CABEÇALHO ====================
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 32, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("Caramello Logistica", 14, 18);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório de Colheita", 14, 25);

    doc.setFontSize(9);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, 165, 18, { align: "right" });

    // ==================== IDENTIFICAÇÃO ====================
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(fazenda.fazenda, 14, 46);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 50, 182, 20, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 50, 182, 20, 2, 2, "S");

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.text("Localização:", 18, 58);
    doc.setFont("helvetica", "normal");
    doc.text(fazenda.localizacao, 42, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Proprietário:", 120, 58);
    doc.setFont("helvetica", "normal");
    doc.text(fazenda.proprietario, 146, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Safra:", 18, 66);
    doc.setFont("helvetica", "normal");
    doc.text(fazenda.safra, 32, 66);

    // Status em badge
    const statusLabel = fazenda.colheita_finalizada ? "COLHEITA FINALIZADA" : "COLHEITA EM ANDAMENTO";
    doc.setFillColor(fazenda.colheita_finalizada ? 37 : 59, fazenda.colheita_finalizada ? 99 : 130, fazenda.colheita_finalizada ? 235 : 246);
    doc.roundedRect(145, 40, 50, 9, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(statusLabel, 170, 46, { align: "center" });

    doc.setTextColor(0, 0, 0);

    // ==================== RESUMO ====================
    const precoPorSaca = (fazenda.preco_por_tonelada * fazenda.peso_medio_saca) / 1000;
    const faturamentoPorTon = fazenda.total_toneladas > 0
      ? fazenda.faturamento_total / fazenda.total_toneladas
      : 0;

    let y = 75;

    const card = (
      x: number,
      title: string,
      value: string,
      color: [number, number, number],
      fill: [number, number, number]
    ) => {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.roundedRect(x, y, 58, 26, 2, 2, "F");
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.roundedRect(x, y, 58, 26, 2, 2, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(title, x + 4, y + 7);
      doc.setFontSize(12);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, x + 4, y + 17);
      doc.setTextColor(0, 0, 0);
    };

    card(
      14,
      "Sacas carregadas",
      fazenda.total_sacas_carregadas.toLocaleString("pt-BR"),
      [37, 99, 235],
      [239, 246, 255]
    );
    card(
      76,
      "Toneladas",
      fazenda.total_toneladas.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
      [30, 64, 175],
      [224, 231, 255]
    );
    card(
      138,
      "Faturamento",
      `R$ ${fazenda.faturamento_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      [22, 163, 74],
      [220, 252, 231]
    );

    y += 36;

    // ==================== DETALHES ====================
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, y - 6, 182, 44, 2, 2, "F");
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(14, y - 6, 182, 44, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Detalhes da Produção", 18, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Último frete:", 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(fazenda.ultimo_frete, 50, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Preço por tonelada:", 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(`R$ ${fazenda.preco_por_tonelada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 60, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Preço por saca:", 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(`R$ ${precoPorSaca.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 52, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Peso médio por saca:", 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${fazenda.peso_medio_saca}kg`, 64, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Faturamento por tonelada:", 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(`R$ ${faturamentoPorTon.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, 78, y);

    // ==================== RODAPÉ ====================
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(14, 285, 196, 285);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Caramello Logistica - Sistema de Gestao de Fretes", 14, 288);
    doc.text("Pagina 1 de 1", 105, 288, { align: "center" });
    doc.text("Relatorio Confidencial", 196, 288, { align: "right" });

    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text("Este documento foi gerado automaticamente e contem informacoes confidenciais", 105, 292, { align: "center" });

    const nomeArquivo = `Caramello_Logistica_Producao_${fazenda.fazenda.replace(/\s+/g, "_")}.pdf`;
    doc.save(nomeArquivo);
    toast.success(`PDF "${nomeArquivo}" gerado com sucesso!`);
  };

  return (
    <MainLayout
      title="Fazendas"
      subtitle="Gestão de produção por fazenda"
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Carregando fazendas...</p>
          </div>
        </div>
      ) : (
      <div className="space-y-6">
        <PageHeader
          title="Produção de Fazendas"
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
              <Button onClick={handleOpenNewModal} size="lg" className="shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nova Fazenda
              </Button>
            </div>
          }
        />

        {/* Cards Resumo - Melhorados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Fazendas no período</p>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">{fazendasFiltradas.length}</p>
                  <p className="text-[11px] md:text-xs text-green-600 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Produtoras ativas
                  </p>
                </div>
                <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 md:h-7 md:w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Sacas Carregadas</p>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">
                    {fazendas
                      .reduce((acc, p) => acc + toNumber(p.total_sacas_carregadas), 0)
                      .toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[11px] md:text-xs text-blue-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Produção acumulada
                  </p>
                </div>
                <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 md:h-7 md:w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Toneladas</p>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">
                    {fazendas
                      .reduce((acc, p) => acc + toNumber(p.total_toneladas), 0)
                      .toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-[11px] md:text-xs text-purple-600 flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    Peso total carregado
                  </p>
                </div>
                <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Weight className="h-5 w-5 md:h-7 md:w-7 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Faturamento Total</p>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight text-green-600 dark:text-green-500">
                    R$ {fazendasFiltradas
                      .reduce((acc, p) => acc + toNumber(p.faturamento_total), 0)
                      .toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] md:text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Receita acumulada
                  </p>
                </div>
                <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 md:h-7 md:w-7 text-green-600 dark:text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Filters */}
        <div className="lg:hidden">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filtros e Período</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
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
                    placeholder="Buscar por fazenda, proprietário, mercadoria..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
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
          searchPlaceholder="Buscar por fazenda, proprietário, mercadoria..."
        />

        {/* FAB: Nova Fazenda (Mobile) */}
        <Button
          onClick={handleOpenNewModal}
          className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg p-0"
          size="icon"
          aria-label="Nova Fazenda"
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Grid de Fazendas - Cards Modernos */}
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                Colheitas em andamento
              </h3>
              <Badge className="bg-blue-600 text-white">{fazendasAtivas.length} fazenda(s)</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {fazendasAtivas.map((fazenda) => {
            const precoPorSaca =
              (toNumber(fazenda.preco_por_tonelada) * toNumber(fazenda.peso_medio_saca)) / 1000;
            const hasProducao = toNumber(fazenda.total_sacas_carregadas) > 0;
            
            return (
              <Card 
                key={fazenda.id} 
                className="group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-2 hover:border-primary/50"
                onClick={() => setSelectedProducao(fazenda)}
              >
                <CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-lg">
                          {fazenda.fazenda.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                          {fazenda.fazenda}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {fazenda.localizacao}
                        </div>
                      </div>
                    </div>
                    {fazenda.colheita_finalizada ? (
                      <Badge className="bg-emerald-600 text-white shadow-sm">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Finalizada
                      </Badge>
                    ) : (
                      hasProducao && (
                        <Badge variant="default" className="shadow-sm">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Ativa
                        </Badge>
                      )
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  {/* Proprietário e Mercadoria */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Proprietário:</span>
                      <span className="font-medium">{fazenda.proprietario}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-sm">{fazenda.mercadoria}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {fazenda.variedade}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Estatísticas de Produção */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Sacas
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {toNumber(fazenda.total_sacas_carregadas).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Weight className="h-3 w-3" />
                        Toneladas
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {toNumber(fazenda.total_toneladas).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                      </p>
                    </div>
                  </div>

                  {/* Faturamento */}
                  <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/10 rounded-lg border border-green-200/50 dark:border-green-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Faturamento Total
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                      R$ {toNumber(fazenda.faturamento_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-green-200/50 dark:border-green-800/50 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Preço/ton:</span>
                        <span className="font-semibold">R$ {toNumber(fazenda.preco_por_tonelada).toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Preço/saca:</span>
                        <span className="font-semibold">R$ {precoPorSaca.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Safra {fazenda.safra}
                    </div>
                    <div className="flex items-center gap-1">
                      Último frete: <span className="font-medium">
                        {fazenda.ultimo_frete_data 
                          ? format(new Date(fazenda.ultimo_frete_data), "dd/MM/yyyy", { locale: ptBR })
                          : "Nunca"}
                        </span>
                    </div>
                  </div>
                </CardContent>
                </Card>
              );
              })}
            </div>
            {fazendasFinalizadas.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Colheitas finalizadas</h3>
                  <Badge className="bg-emerald-600 text-white">{fazendasFinalizadas.length} fazenda(s)</Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {fazendasFinalizadas.map((fazenda) => {
                    const precoPorSaca =
                      (toNumber(fazenda.preco_por_tonelada) * toNumber(fazenda.peso_medio_saca)) / 1000;
                    const hasProducao = toNumber(fazenda.total_sacas_carregadas) > 0;

                    return (
                      <Card
                        key={fazenda.id}
                        className="group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-2 hover:border-primary/50"
                        onClick={() => setSelectedProducao(fazenda)}
                      >
                        <CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                                <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-lg">
                                  {fazenda.fazenda.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-1">
                                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                                  {fazenda.fazenda}
                                </CardTitle>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {fazenda.localizacao}
                                </div>
                              </div>
                            </div>
                            {fazenda.colheita_finalizada ? (
                              <Badge className="bg-emerald-600 text-white shadow-sm">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Finalizada
                              </Badge>
                            ) : (
                              hasProducao && (
                                <Badge variant="default" className="shadow-sm">
                                  <BarChart3 className="h-3 w-3 mr-1" />
                                  Ativa
                                </Badge>
                              )
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="pt-6 space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Proprietário:</span>
                              <span className="font-medium">{fazenda.proprietario}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-sm">{fazenda.mercadoria}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {fazenda.variedade}
                              </Badge>
                            </div>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Sacas
                              </p>
                              <p className="text-2xl font-bold text-blue-600">
                                {toNumber(fazenda.total_sacas_carregadas).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Weight className="h-3 w-3" />
                                Toneladas
                              </p>
                              <p className="text-2xl font-bold text-purple-600">
                                {toNumber(fazenda.total_toneladas).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/10 rounded-lg border border-green-200/50 dark:border-green-800/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Faturamento Total
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                              R$ {toNumber(fazenda.faturamento_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            <div className="mt-2 pt-2 border-t border-green-200/50 dark:border-green-800/50 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Preço/ton:</span>
                                <span className="font-semibold">R$ {toNumber(fazenda.preco_por_tonelada).toLocaleString("pt-BR")}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Preço/saca:</span>
                                <span className="font-semibold">R$ {precoPorSaca.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Safra {fazenda.safra}
                            </div>
                            <div className="flex items-center gap-1">
                              Último frete: <span className="font-medium">
                                {fazenda.ultimo_frete_data 
                                  ? format(new Date(fazenda.ultimo_frete_data), "dd/MM/yyyy", { locale: ptBR })
                                  : "Nunca"}
                                </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
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
                              </div>
                            </>
                          )}
          </div>
        </div>
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
              Página {currentPage} de {totalPages} • {filteredData.length} registros
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredData.length === 0 && (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Nenhuma fazenda encontrada</h3>
                <p className="text-muted-foreground text-sm">
                  Tente ajustar os filtros ou cadastre uma nova fazenda
                </p>
              </div>
              <Button onClick={handleOpenNewModal} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Fazenda
              </Button>
            </div>
          </Card>
        )}
      </div>
      )}

      {/* Modal de Nova/Editar Fazenda */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {isEditing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {isEditing ? "Editar Fazenda" : "Cadastrar Nova Fazenda"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-1 space-y-6">
            {/* Seção: Localização */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <MapPin className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold text-green-600">Localização</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fazenda">Nome da Fazenda *</Label>
                  <Input
                    id="fazenda"
                    placeholder="Ex: Fazenda Santa Esperança"
                    value={newProducao.fazenda}
                    onChange={(e) => setNewProducao({ ...newProducao, fazenda: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input
                    id="localizacao"
                    placeholder="Ex: Marília, SP"
                    value={newProducao.localizacao}
                    onChange={(e) => setNewProducao({ ...newProducao, localizacao: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="proprietario">Proprietário</Label>
                  <Input
                    id="proprietario"
                    placeholder="Ex: João Silva"
                    value={newProducao.proprietario}
                    onChange={(e) => setNewProducao({ ...newProducao, proprietario: e.target.value })}
                  />
                </div>
                
              </div>
            </div>

            {/* Seção: Mercadoria */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Package className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-blue-600">Mercadoria</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mercadoria">Tipo de Mercadoria *</Label>
                  <Select
                    value={newProducao.mercadoria}
                    onValueChange={(value) => setNewProducao({ ...newProducao, mercadoria: value })}
                  >
                    <SelectTrigger id="mercadoria">
                      <SelectValue placeholder="Selecione a mercadoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Amendoim em Casca">Amendoim em Casca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="variedade">Variedade/Cor *</Label>
                  <Select
                    value={newProducao.variedade}
                    onValueChange={(value) => setNewProducao({ ...newProducao, variedade: value })}
                  >
                    <SelectTrigger id="variedade">
                      <SelectValue placeholder="Selecione a variedade/cor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Verde">Verde</SelectItem>
                      <SelectItem value="Seco">Seco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="safra">Safra *</Label>
                  <Select
                    value={newProducao.safra}
                    onValueChange={(value) => setNewProducao({ ...newProducao, safra: value })}
                  >
                    <SelectTrigger id="safra">
                      <SelectValue placeholder="Selecione a safra" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {opcoesSafra.map((safra) => (
                        <SelectItem key={safra} value={safra}>
                          {safra}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="peso_medio_saca">Peso Médio por Saca (kg)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      kg
                    </span>
                    <Input
                      id="peso_medio_saca"
                      type="number"
                      placeholder="25"
                      className="pl-10"
                      value={newProducao.peso_medio_saca}
                      onChange={(e) => setNewProducao({ ...newProducao, peso_medio_saca: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção: Valores */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <DollarSign className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold text-green-600">Valores</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco_por_tonelada">Preço por Tonelada (R$) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="preco_por_tonelada"
                      placeholder="0,00"
                      className="pl-10"
                      value={newProducao.preco_por_tonelada > 0 ? formatarInputMoeda(String(newProducao.preco_por_tonelada * 100)) : ''}
                      onChange={(e) => {
                        const valorFormatado = formatarInputMoeda(e.target.value);
                        const valorNumerico = desformatarMoeda(valorFormatado);
                        setNewProducao({ ...newProducao, preco_por_tonelada: valorNumerico });
                      }}
                    />
                  </div>
                </div>

                {newProducao.preco_por_tonelada > 0 && newProducao.peso_medio_saca > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Preço Calculado por Saca</Label>
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-blue-50 dark:bg-blue-950/20">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-blue-600">
                        R$ {((newProducao.preco_por_tonelada * newProducao.peso_medio_saca) / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-muted-foreground">/saca ({newProducao.peso_medio_saca}kg)</span>
                    </div>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produção Acumulada
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400">Sacas Carregadas</p>
                      <p className="font-bold text-lg">{newProducao.total_sacas_carregadas?.toLocaleString("pt-BR") || 0}</p>
                    </div>
                    <div>
                      <p className="text-blue-600 dark:text-blue-400">Toneladas</p>
                      <p className="font-bold text-lg">{newProducao.total_toneladas?.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) || 0}</p>
                    </div>
                    <div>
                      <p className="text-blue-600 dark:text-blue-400">Faturamento</p>
                      <p className="font-bold text-lg">R$ {newProducao.faturamento_total?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Último frete: {newProducao.ultimo_frete || "-"}
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Como funciona:</strong> Defina o preço por tonelada e o peso médio da saca. 
                  O sistema calcula automaticamente o valor por saca e o faturamento conforme os fretes são carregados.
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Importante:</strong> A produção será incrementada automaticamente conforme os fretes forem cadastrados. 
                Não é necessário informar quantidades iniciais.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Salvar Alterações" : "Cadastrar Fazenda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes - Redesenhado */}
      <Dialog open={!!selectedProducao} onOpenChange={() => setSelectedProducao(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-2xl">
                    {selectedProducao?.fazenda.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold mb-1">{selectedProducao?.fazenda}</DialogTitle>
                  <DialogDescription className="sr-only">
                    Detalhes completos da produção: {selectedProducao?.mercadoria} {selectedProducao?.variedade} - Safra {selectedProducao?.safra}
                  </DialogDescription>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedProducao?.localizacao}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {selectedProducao?.proprietario}
                    </div>
                  </div>
                </div>
              </div>
              {selectedProducao?.colheita_finalizada ? (
                <Badge className="bg-emerald-600 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Colheita finalizada
                </Badge>
              ) : (
                <Badge variant="outline">Colheita em andamento</Badge>
              )}
            </div>
          </DialogHeader>

          {selectedProducao && (
            <div className="space-y-6 pt-4">
              {/* Métricas Principais em Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Package className="h-5 w-5" />
                        <p className="text-sm font-medium">Sacas Carregadas</p>
                      </div>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                        {selectedProducao.total_sacas_carregadas.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground">unidades transportadas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Weight className="h-5 w-5" />
                        <p className="text-sm font-medium">Total em Toneladas</p>
                      </div>
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                        {selectedProducao.total_toneladas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                      </p>
                      <p className="text-xs text-muted-foreground">peso transportado</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <DollarSign className="h-5 w-5" />
                        <p className="text-sm font-medium">Faturamento Total</p>
                      </div>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-400 whitespace-nowrap">
                        R$ {toNumber(selectedProducao.faturamento_total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">receita acumulada</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Informações do Produto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      Produto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Mercadoria:</span>
                      <span className="font-semibold">{selectedProducao.mercadoria}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Variedade:</span>
                      <Badge variant="outline">{selectedProducao.variedade}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Safra:</span>
                      <Badge className="bg-green-500">{selectedProducao.safra}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Peso Médio/Saca:</span>
                      <span className="font-semibold">{selectedProducao.peso_medio_saca}kg</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Precificação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Preço/Tonelada:</span>
                      <span className="font-bold text-green-600">
                        R$ {selectedProducao.preco_por_tonelada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Preço/Saca:</span>
                      <span className="font-bold text-blue-600">
                        R$ {((selectedProducao.preco_por_tonelada * selectedProducao.peso_medio_saca) / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedProducao.total_sacas_carregadas > 0 && (
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">Lucro Liquido/Saca:</span>
                        <span className="font-bold text-purple-600">
                          R$ {((selectedProducao.lucro_liquido || selectedProducao.faturamento_total - (toNumber(selectedProducao.total_custos_operacionais) || 0)) / selectedProducao.total_sacas_carregadas).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Último Frete:</span>
                      {selectedProducao.ultimo_frete_data ? (
                        <div className="text-right text-sm">
                          <span className="font-semibold">
                            {format(new Date(selectedProducao.ultimo_frete_data), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          {selectedProducao.ultimo_frete_motorista && (
                            <span className="text-muted-foreground ml-2">
                              • {selectedProducao.ultimo_frete_motorista}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Estatísticas Avançadas */}
              {selectedProducao.total_sacas_carregadas > 0 && (
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-800/20 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      Análise de Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Fretes Realizados */}
                      <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 p-6 border border-blue-200/50 dark:border-blue-800/30 hover:shadow-md transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <Badge variant="outline" className="bg-white/60 dark:bg-slate-800/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                            {toNumber(selectedProducao.total_fretes_realizados) > 0 ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Fretes Realizados</p>
                        <p className="text-4xl font-bold text-blue-800 dark:text-blue-200 tracking-tight">
                          {toNumber(selectedProducao.total_fretes_realizados) || 0}
                        </p>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">total de viagens</p>
                      </div>

                      {/* Custos Operacionais */}
                      <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/20 dark:to-rose-900/10 p-6 border border-rose-200/50 dark:border-rose-800/30 hover:shadow-md transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                            <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                          </div>
                          <Badge variant="outline" className="bg-white/60 dark:bg-slate-800/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                            Despesas
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-2">Custos Operacionais</p>
                        <p className="text-3xl font-bold text-rose-800 dark:text-rose-200 tracking-tight whitespace-nowrap">
                          R$ {toNumber(selectedProducao.total_custos_operacionais).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-2">gastos totais</p>
                      </div>

                      {/* Receita Liquida */}
                      <div className={`group relative overflow-hidden rounded-xl p-6 border hover:shadow-md transition-all duration-300 ${
                        (toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) >= 0 
                          ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30" 
                          : "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200/50 dark:border-orange-800/30"
                      }`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-2 rounded-lg ${
                            (toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) >= 0
                              ? "bg-emerald-100 dark:bg-emerald-900/30"
                              : "bg-orange-100 dark:bg-orange-900/30"
                          }`}>
                            {(toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) >= 0 ? (
                              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            )}
                          </div>
                          <Badge variant="outline" className={`bg-white/60 dark:bg-slate-800/60 ${
                            (toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) >= 0
                              ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                              : "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                          }`}>
                            {(toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) >= 0 ? "Lucro" : "Prejuízo"}
                          </Badge>
                        </div>
                        <p className={`text-sm font-medium mb-2 ${
                          (toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) >= 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-orange-700 dark:text-orange-300"
                        }`}>Receita Líquida</p>
                        <p className={`text-3xl font-bold tracking-tight whitespace-nowrap ${
                          (toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) >= 0
                            ? "text-emerald-800 dark:text-emerald-200"
                            : "text-orange-800 dark:text-orange-200"
                        }`}>
                          R$ {((toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-xs mt-2 ${
                          (toNumber(selectedProducao.lucro_liquido) || selectedProducao.faturamento_total - toNumber(selectedProducao.total_custos_operacionais)) >= 0
                            ? "text-emerald-600/70 dark:text-emerald-400/70"
                            : "text-orange-600/70 dark:text-orange-400/70"
                        }`}>resultado final</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 mt-6 flex-wrap">
            <Button variant="outline" onClick={() => setSelectedProducao(null)} size="lg">
              Fechar
            </Button>
            {selectedProducao && (
              <Button
                variant="outline"
                onClick={() => handleExportarPDF(selectedProducao)}
                size="lg"
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            )}
            {selectedProducao && (
              <Button
                variant={selectedProducao.colheita_finalizada ? "outline" : "default"}
                onClick={() => handleToggleColheitaFinalizada(selectedProducao.id)}
                size="lg"
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {selectedProducao.colheita_finalizada ? "Reabrir Colheita" : "Finalizar Colheita"}
              </Button>
            )}
            <Button 
              onClick={() => {
                handleOpenEditModal(selectedProducao!);
              }}
              size="lg"
              className="shadow-lg"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Fazenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
