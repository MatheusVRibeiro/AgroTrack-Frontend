import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodoFilter } from "@/components/shared/PeriodoFilter";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Custo, CriarCustoPayload } from "@/types";
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
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoConfig = {
  combustivel: { label: "Combustível", icon: Fuel, color: "text-warning" },
  manutencao: { label: "Manutenção", icon: Wrench, color: "text-loss" },
  pedagio: { label: "Pedágio", icon: Truck, color: "text-primary" },
  outros: { label: "Outros", icon: FileText, color: "text-muted-foreground" },
};

export default function Custos() {
  const queryClient = useQueryClient();

  // Query para listar custos
  const { data: custosResponse, isLoading } = useQuery({
    queryKey: ["custos"],
    queryFn: custosService.listarCustos,
  });

  // Query para listar fretes (vinculo de custos)
  const { data: fretesResponse } = useQuery({
    queryKey: ["fretes"],
    queryFn: fretesService.listarFretes,
  });

  const custos: Custo[] = custosResponse?.data || [];
  const fretes = fretesResponse?.data || [];

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
      } else {
        toast.error(response.message || "Erro ao cadastrar custo");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao cadastrar custo");
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
      } else {
        toast.error(response.message || "Erro ao atualizar custo");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao atualizar custo");
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
      } else {
        toast.error(response.message || "Erro ao remover custo");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao remover custo");
    },
  });

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [motoristaFilter, setMotoristaFilter] = useState<string>("all");
  const [comprovanteFilter, setComprovanteFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCusto, setEditingCusto] = useState<Custo | null>(null);
  const [selectedCusto, setSelectedCusto] = useState<Custo | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState<Partial<CriarCustoPayload>>({
    frete_id: "",
    tipo: undefined,
    descricao: "",
    valor: 0,
    data: "",
    comprovante: false,
    observacoes: "",
    litros: undefined,
    tipo_combustivel: undefined,
  });

  const handleRowClick = (custo: Custo) => {
    setSelectedCusto(custo);
    setIsDetailsOpen(true);
  };

  const handleOpenNewModal = () => {
    setEditingCusto(null);
    setFormData({
      frete_id: "",
      tipo: undefined,
      descricao: "",
      valor: 0,
      data: "",
      comprovante: false,
      observacoes: "",
      litros: undefined,
      tipo_combustivel: undefined,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (custo: Custo) => {
    setEditingCusto(custo);
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
    if (!formData.frete_id || !formData.tipo || !formData.valor || !formData.data) {
      toast.error("Preencha todos os campos obrigatorios!");
      return;
    }

    if (formData.tipo === "combustivel" && (!formData.litros || !formData.tipo_combustivel)) {
      toast.error("Para combustivel, informe litros e tipo de combustivel.");
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
      descricao: descricaoAuto,
      valor: Number(formData.valor),
      data: formData.data,
      comprovante: !!formData.comprovante,
      observacoes: formData.observacoes || undefined,
      litros: formData.tipo === "combustivel" ? Number(formData.litros) : undefined,
      tipo_combustivel: formData.tipo === "combustivel" ? formData.tipo_combustivel : undefined,
    };

    if (editingCusto) {
      updateMutation.mutate({ id: editingCusto.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (custo: Custo) => {
    if (window.confirm("Tem certeza que deseja deletar este custo?")) {
      deleteMutation.mutate(custo.id);
    }
  };

  const parseCustoDate = (value: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    if (value.includes("/")) {
      const [dia, mes, ano] = value.split("/");
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
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

  // Lista única de motoristas
  const motoristas = Array.from(new Set(custos.map(c => c.motorista)));

  const filteredData = custosFiltrados.filter((custo) => {
    // Filtro de busca
    const matchesSearch =
      custo.frete_id.toLowerCase().includes(search.toLowerCase()) ||
      custo.descricao.toLowerCase().includes(search.toLowerCase()) ||
      custo.motorista.toLowerCase().includes(search.toLowerCase());
    
    // Filtro de tipo
    const matchesTipo = tipoFilter === "all" || custo.tipo === tipoFilter;
    
    // Filtro de motorista
    const matchesMotorista = motoristaFilter === "all" || custo.motorista === motoristaFilter;
    
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

  // Lógica de paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, tipoFilter, motoristaFilter, comprovanteFilter, dateFrom, dateTo]);

  const totalCustos = custosFiltrados.reduce((acc, c) => acc + toNumber(c.valor), 0);
  const totalCombustivel = custosFiltrados
    .filter((c) => c.tipo === "combustivel")
    .reduce((acc, c) => acc + toNumber(c.valor), 0);
  const totalManutencao = custosFiltrados
    .filter((c) => c.tipo === "manutencao")
    .reduce((acc, c) => acc + toNumber(c.valor), 0);
  const totalPedagio = custosFiltrados
    .filter((c) => c.tipo === "pedagio")
    .reduce((acc, c) => acc + toNumber(c.valor), 0);

  const columns = [
    {
      key: "tipo",
      header: "Tipo",
      render: (item: Custo) => {
        const config = tipoConfig[item.tipo];
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
      render: (item: Custo) => (
        <span className="font-mono font-bold text-primary">{item.frete_id}</span>
      ),
    },
    { 
      key: "descricao", 
      header: "Descrição",
      render: (item: Custo) => (
        <div>
          <p className="font-medium">{item.descricao}</p>
          <p className="text-xs text-muted-foreground">{item.motorista}</p>
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

  return (
    <MainLayout title="Custos" subtitle="Gestão de custos operacionais">
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
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
                  <SelectContent>
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
                  <SelectContent>
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
        {filteredData.filter(c => c.tipo === "combustivel").length > 0 && (
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
                      {filteredData.filter(c => c.tipo === "combustivel").length} lançamento{filteredData.filter(c => c.tipo === "combustivel").length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    R$ {filteredData
                      .filter(c => c.tipo === "combustivel")
                      .reduce((acc, c) => acc + toNumber(c.valor), 0)
                      .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <DataTable<Custo>
              columns={columns}
              data={paginatedData.filter(c => c.tipo === "combustivel")}
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
              columns={columns}
              data={paginatedData.filter(c => c.tipo === "manutencao")}
              onRowClick={handleRowClick}
              emptyMessage="Nenhum custo de manutenção"
            />
          </Card>
        )}

        {/* Outros */}
        {filteredData.filter(c => c.tipo === "outros").length > 0 && (
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
                      {filteredData.filter(c => c.tipo === "outros").length} lançamento{filteredData.filter(c => c.tipo === "outros").length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                    R$ {filteredData
                      .filter(c => c.tipo === "outros")
                      .reduce((acc, c) => acc + toNumber(c.valor), 0)
                      .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <DataTable<Custo>
              columns={columns}
              data={paginatedData.filter(c => c.tipo === "outros")}
              onRowClick={handleRowClick}
              emptyMessage="Nenhum outro custo"
            />
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
              <div className="grid grid-cols-2 gap-4">
                {/* Frete */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Frete</span>
                  </div>
                  <p className="font-mono font-bold text-primary text-lg">
                    {selectedCusto.frete_id}
                  </p>
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
                  <p className="font-semibold text-lg">{selectedCusto.motorista}</p>
                </div>

                {/* Caminhão */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span>Caminhão</span>
                  </div>
                  <p className="font-mono font-bold text-lg">{selectedCusto.caminhao}</p>
                </div>
              </div>

              <Separator />

              {/* Rota */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Rota</span>
                </div>
                <p className="font-semibold text-lg">{selectedCusto.rota}</p>
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
                    <div className="grid grid-cols-2 gap-4">
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
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>{editingCusto ? "Editar Custo" : "Novo Custo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="frete_id">Frete *</Label>
              <Select
                value={formData.frete_id || ""}
                onValueChange={(value) => setFormData({ ...formData, frete_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o frete" />
                </SelectTrigger>
                <SelectContent>
                  {fretes.length === 0 ? (
                    <SelectItem value="" disabled>
                      Nenhum frete disponivel
                    </SelectItem>
                  ) : (
                    fretes.map((frete) => (
                      <SelectItem key={frete.id} value={frete.id}>
                        {frete.id} - {frete.destino}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Custo *</Label>
              <Select
                value={formData.tipo || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo: value as Custo["tipo"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combustivel">Combustível</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="pedagio">Pedágio</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Campos específicos para Combustível */}
            {formData.tipo === "combustivel" && (
              <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Fuel className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">Informações do Abastecimento</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="litros">Litros Abastecidos *</Label>
                      <Input 
                        id="litros" 
                        type="number" 
                        placeholder="Ex: 150" 
                        value={formData.litros ?? ""}
                        onChange={(e) => setFormData({ ...formData, litros: Number(e.target.value) })}
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo_combustivel">Tipo de Combustível *</Label>
                      <Select
                        value={formData.tipo_combustivel || ""}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tipo_combustivel: value as Custo["tipo_combustivel"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="etanol">Etanol</SelectItem>
                          <SelectItem value="gnv">GNV</SelectItem>
                        </SelectContent>
                      </Select>
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
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={formData.valor ?? 0}
                  onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data || ""}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                />
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
              <div className="flex items-center gap-2">
                <Checkbox
                  id="comprovante"
                  checked={!!formData.comprovante}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, comprovante: checked === true })
                  }
                />
                <Label htmlFor="comprovante" className="font-normal cursor-pointer">
                  {formData.comprovante ? (
                    <Badge variant="success" className="text-xs">
                      <FileCheck className="h-3 w-3 mr-1 inline" /> Anexado
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="text-xs">
                      Comprovante Pendente
                    </Badge>
                  )}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingCusto(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingCusto ? "Salvar Alterações" : "Cadastrar Custo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
