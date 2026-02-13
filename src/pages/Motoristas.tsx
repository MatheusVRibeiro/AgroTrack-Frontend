import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { validarCPF, validarEmail, validarCNH, validarTelefone, apenasNumeros, formatarDataBrasileira, converterDataBrasileira, formatarCPF, formatarTelefone } from "@/utils/formatters";
import * as motoristasService from "@/services/motoristas";
import caminhoesService from "@/services/caminhoes";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, TrendingUp, Phone, Mail, Calendar, Truck, Edit, Save, X, MapPin, Award, CreditCard, Users, UserCheck, UserX, ShieldCheck, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Motorista } from "@/types";

// Payload para criar motorista
interface CriarMotoristaPayload {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  cnh: string;
  cnh_validade: string;
  cnh_categoria: "A" | "B" | "C" | "D" | "E";
  tipo: "proprio" | "terceirizado";
  placa_temporaria?: string | null;
  data_admissao: string;
  endereco?: string;
  status?: "ativo" | "inativo" | "ferias";
  tipo_pagamento?: "pix" | "transferencia_bancaria";
  chave_pix_tipo?: "cpf" | "email" | "telefone" | "aleatoria";
  chave_pix?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: "corrente" | "poupanca";
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
};

export default function Motoristas() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMotorista, setEditedMotorista] = useState<Partial<Motorista>>({});
  const [motoristasState, setMotoristasState] = useState<Motorista[]>([]);
  const [isLoadingMotoristas, setIsLoadingMotoristas] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Carregar motoristas da API
  useEffect(() => {
    carregarMotoristas();
  }, []);

  // Caminhões carregados via API (substitui dados simulados removidos)
  const [caminhoesState, setCaminhoesState] = useState<{ placa: string; modelo?: string }[]>([]);

  const carregarCaminhoes = async () => {
    try {
      const res = await caminhoesService.listarCaminhoes();
      if (res.success && Array.isArray(res.data)) {
        setCaminhoesState(res.data as any);
      } else {
        setCaminhoesState([]);
      }
    } catch (error) {
      console.error("Erro ao carregar caminhões:", error);
      setCaminhoesState([]);
    }
  };

  useEffect(() => {
    carregarCaminhoes();
  }, []);

  const carregarMotoristas = async () => {
    setIsLoadingMotoristas(true);
    try {
      const res = await motoristasService.listarMotoristas();
      
      if (res.success && Array.isArray(res.data)) {
        setMotoristasState(res.data);
        toast.success(`${res.data.length} motoristas carregados`);
      } else {
        setMotoristasState([]);
        toast.error(res.message || "Erro ao carregar motoristas");
      }
    } catch (error) {
      console.error("Erro ao carregar motoristas:", error);
      setMotoristasState([]);
      toast.error("Erro ao conectar com a API. Verifique se o backend está rodando.");
    }
    setIsLoadingMotoristas(false);
  };

  const handleOpenNewModal = () => {
    setEditedMotorista({
      nome: "",
      cpf: "",
      telefone: "",
      email: "",
      cnh: "",
      cnh_validade: "",
      cnh_categoria: "D",
      status: "ativo",
      tipo: "proprio",
      placa_temporaria: "",
      caminhao_atual: "",
      endereco: "",
      data_admissao: new Date().toISOString().split('T')[0], // formato YYYY-MM-DD
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
  };

  const handleOpenEditModal = (motorista: Motorista) => {
    // Normalizar data para formato YYYY-MM-DD se necessário
    const dataNormalizada = motorista.data_admissao 
      ? motorista.data_admissao.length > 10 
        ? motorista.data_admissao.split('T')[0] 
        : motorista.data_admissao
      : new Date().toISOString().split('T')[0];
    
    setEditedMotorista({
      ...motorista,
      placa_temporaria: motorista.placa_temporaria,
      data_admissao: dataNormalizada,
      cnh_validade: motorista.cnh_validade?.length > 10 
        ? motorista.cnh_validade.split('T')[0]
        : motorista.cnh_validade
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTipoFilter("all");
  };

  const handleSave = async () => {
    // Resetar erros
    const novosErros: Record<string, string> = {};

    // Validar campos obrigatórios
    if (!editedMotorista.nome?.trim()) {
      novosErros.nome = "Nome é obrigatório";
    }

    if (!editedMotorista.cpf?.trim()) {
      novosErros.cpf = "CPF é obrigatório";
    } else {
      const cpfLimpo = apenasNumeros(editedMotorista.cpf);
      if (!validarCPF(cpfLimpo)) {
        novosErros.cpf = "CPF inválido";
      } else {
        // Verificar CPF duplicado
        const cpfExiste = motoristasState.some(
          m => apenasNumeros(m.cpf) === cpfLimpo && m.id !== editedMotorista.id
        );
        if (cpfExiste) {
          novosErros.cpf = "Este CPF já está cadastrado";
        }
      }
    }

    if (!editedMotorista.telefone?.trim()) {
      novosErros.telefone = "Telefone é obrigatório";
    } else {
      const telefoneLimpo = apenasNumeros(editedMotorista.telefone);
      if (!validarTelefone(telefoneLimpo)) {
        novosErros.telefone = "Telefone inválido";
      }
    }

    if (!editedMotorista.email?.trim()) {
      novosErros.email = "E-mail é obrigatório";
    } else if (!validarEmail(editedMotorista.email)) {
      novosErros.email = "E-mail inválido";
    } else {
      // Verificar email duplicado
      const emailExiste = motoristasState.some(
        m => m.email.toLowerCase() === editedMotorista.email?.toLowerCase() && m.id !== editedMotorista.id
      );
      if (emailExiste) {
        novosErros.email = "Este e-mail já está cadastrado";
      }
    }

    if (!editedMotorista.cnh?.trim()) {
      novosErros.cnh = "CNH é obrigatória";
    } else if (!validarCNH(editedMotorista.cnh)) {
      novosErros.cnh = "CNH deve ter 11 dígitos";
    } else {
      // Verificar CNH duplicada
      const cnhExiste = motoristasState.some(
        m => m.cnh === editedMotorista.cnh && m.id !== editedMotorista.id
      );
      if (cnhExiste) {
        novosErros.cnh = "Esta CNH já está cadastrada";
      }
    }

    if (!editedMotorista.cnh_validade) {
      novosErros.cnh_validade = "Validade da CNH é obrigatória";
    } else {
      // Verificar se a CNH está válida
      const dataValidade = new Date(editedMotorista.cnh_validade);
      const hoje = new Date();
      if (dataValidade < hoje) {
        novosErros.cnh_validade = "CNH vencida";
      }
    }

    if (!editedMotorista.cnh_categoria) {
      novosErros.cnh_categoria = "Categoria da CNH é obrigatória";
    }

    if (!editedMotorista.tipo) {
      novosErros.tipo = "Tipo de motorista é obrigatório";
    }

    if (!editedMotorista.data_admissao) {
      novosErros.data_admissao = "Data de admissão é obrigatória";
    }

    // Validar dados bancários se preenchidos
    if (editedMotorista.tipo_pagamento === "pix") {
      if (!editedMotorista.chave_pix?.trim()) {
        novosErros.chave_pix = "Chave PIX é obrigatória";
      } else if (editedMotorista.chave_pix_tipo === "cpf" && !validarCPF(apenasNumeros(editedMotorista.chave_pix))) {
        novosErros.chave_pix = "CPF inválido";
      } else if (editedMotorista.chave_pix_tipo === "email" && !validarEmail(editedMotorista.chave_pix)) {
        novosErros.chave_pix = "E-mail inválido";
      } else if (editedMotorista.chave_pix_tipo === "telefone" && !validarTelefone(apenasNumeros(editedMotorista.chave_pix))) {
        novosErros.chave_pix = "Telefone inválido";
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

    // Se houver erros, exibir e retornar
    if (Object.keys(novosErros).length > 0) {
      setErrosCampos(novosErros);
      const primeiroErro = Object.keys(novosErros)[0];
      const mensagemErro = novosErros[primeiroErro];
      toast.error(`Erro: ${mensagemErro}`);
      
      // Tentar focar no primeiro campo com erro
      setTimeout(() => {
        const elemento = document.getElementById(primeiroErro);
        if (elemento) {
          elemento.focus();
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      return;
    }

    if (isEditing) {
      toast.success("Motorista atualizado com sucesso!");
      setIsModalOpen(false);
      setErrosCampos({});
      return;
    }

    // Criar payload para API com dados limpos de formatação
    // IMPORTANTE: A API espera dados sem máscara/formatação
    // Regra: se for 'proprio', não enviar placa_temporaria (define como null)
    const placaParaEnviar = editedMotorista.tipo === 'proprio' ? null : (editedMotorista.placa_temporaria || null);

    const payload: CriarMotoristaPayload = {
      nome: editedMotorista.nome,
      cpf: apenasNumeros(editedMotorista.cpf), // Remove formatação (000.000.000-00 -> 00000000000)
      telefone: apenasNumeros(editedMotorista.telefone), // Remove formatação ((11) 98765-4321 -> 11987654321)
      email: editedMotorista.email,
      cnh: apenasNumeros(editedMotorista.cnh), // Remove formatação (apenas números)
      cnh_validade: editedMotorista.cnh_validade, // Mantém formato de data: YYYY-MM-DD
      cnh_categoria: editedMotorista.cnh_categoria!,
      tipo: editedMotorista.tipo!,
      placa_temporaria: placaParaEnviar,
      data_admissao: editedMotorista.data_admissao, // Formato YYYY-MM-DD (normalizador no handleOpenEditModal)
      endereco: editedMotorista.endereco,
      status: editedMotorista.status || "ativo",
      tipo_pagamento: editedMotorista.tipo_pagamento,
      chave_pix_tipo: editedMotorista.chave_pix_tipo,
      chave_pix: editedMotorista.chave_pix_tipo === "cpf" ? apenasNumeros(editedMotorista.chave_pix) : editedMotorista.chave_pix, // Limpa se for CPF
      banco: editedMotorista.banco,
      agencia: editedMotorista.agencia,
      conta: editedMotorista.conta,
      tipo_conta: editedMotorista.tipo_conta,
    };

    try {
      const res = await motoristasService.criarMotorista(payload);
      
      if (res.success) {
        toast.success("Motorista cadastrado com sucesso!");
        // Recarregar lista local
        await carregarMotoristas();
        // Invalidar cache para outras telas (ex: Frota)
        queryClient.invalidateQueries({ queryKey: ["motoristas"] });

        // Garantir que o motorista recém-criado não esteja vinculado a um caminhão.
        // Alguns backends podem retornar o recurso criado de forma diferente, então
        // buscamos a lista atualizada e localizamos pelo CPF limpado.
        try {
          const latest = await motoristasService.listarMotoristas();
          if (latest.success && Array.isArray(latest.data)) {
            const cpfCriado = apenasNumeros(payload.cpf as string);
            const encontrado = latest.data.find((m) => apenasNumeros(m.cpf) === cpfCriado);
            if (encontrado && encontrado.caminhao_atual) {
              await motoristasService.atualizarMotorista(encontrado.id, { caminhao_atual: null });
              await carregarMotoristas();
              queryClient.invalidateQueries({ queryKey: ["motoristas"] });
            }
          }
        } catch (e) {
          // não bloquear o fluxo se a limpeza falhar
        }

        setIsModalOpen(false);
        setErrosCampos({});
      } else {
        // Tentar identificar qual campo tem erro baseado na mensagem
        if (res.message?.toLowerCase().includes('cpf')) {
          setErrosCampos({ cpf: res.message });
        } else if (res.message?.toLowerCase().includes('email')) {
          setErrosCampos({ email: res.message });
        } else if (res.message?.toLowerCase().includes('cnh')) {
          setErrosCampos({ cnh: res.message });
        }
        toast.error(res.message || "Erro ao cadastrar motorista");
      }
    } catch (error) {
      console.error("Erro ao cadastrar motorista:", error);
      toast.error("Erro ao conectar com a API");
    }
  };

  const filteredData = motoristasState.filter((motorista) => {
    const matchesSearch =
      motorista.nome.toLowerCase().includes(search.toLowerCase()) ||
      motorista.cpf.includes(search);
    const matchesStatus =
      statusFilter === "all" || motorista.status === statusFilter;
    const matchesTipo =
      tipoFilter === "all" || motorista.tipo === tipoFilter;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, tipoFilter]);

  const totalMotoristas = motoristasState.length;
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

  const columns = [
    {
      key: "nome",
      header: "Motorista",
      render: (item: Motorista) => (
        <div className="flex items-start gap-3 py-2">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
              {item.nome
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  item.status === "ativo" && "bg-green-500",
                  item.status === "inativo" && "bg-red-500",
                  item.status === "ferias" && "bg-yellow-500"
                )}
              />
              <p className="font-semibold text-foreground leading-tight">{item.nome}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatarCPF(item.cpf)}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={statusConfig[item.status].variant} className="text-[10px]">
                {statusConfig[item.status].label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{tipoMotoristaConfig[item.tipo].label}</p>
            {item.caminhao_atual && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-md w-fit">
                <Truck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  {item.caminhao_atual}
                </p>
              </div>
            )}
            {item.endereco && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{item.endereco}</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "telefone",
      header: "Contato",
      render: (item: Motorista) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">{formatarTelefone(item.telefone)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate text-muted-foreground max-w-[180px]">{item.email}</span>
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: Motorista) => (
        <div className="space-y-2">
          <Badge variant={statusConfig[item.status].variant} className="font-semibold w-fit">
            {statusConfig[item.status].label}
          </Badge>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Admissão: {formatarDataBrasileira(item.data_admissao)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "receitaGerada",
      header: "Desempenho",
      render: (item: Motorista) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-profit" />
            <span className="font-semibold text-profit">
              R$ {toNumber(item.receita_gerada).toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="h-4 w-4" />
            <span>{toNumber(item.viagens_realizadas)} viagens</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Média/viagem: R$ {Math.round(toNumber(item.receita_gerada) / Math.max(toNumber(item.viagens_realizadas), 1)).toLocaleString("pt-BR")}
          </div>
        </div>
      ),
    },
  ];

  // Simulated freight history
  const historicoFretes = [
    { id: "FRETE-2026-001", rota: "SP → RJ", data: "20/01/2025", valor: "R$ 15.000" },
    { id: "FRETE-2026-007", rota: "PR → SC", data: "15/01/2025", valor: "R$ 8.500" },
    { id: "FRETE-2026-015", rota: "MG → DF", data: "10/01/2025", valor: "R$ 12.000" },
  ];

  return (
    <MainLayout title="Motoristas" subtitle="Gestão de motoristas">
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-6">
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
                  placeholder="Buscar por nome ou CPF..."
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
        searchPlaceholder="Buscar por nome ou CPF..."
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

      <DataTable<Motorista>
        columns={columns}
        data={paginatedData}
        onRowClick={(item) => setSelectedMotorista(item)}
        emptyMessage="Nenhum motorista encontrado"
      />

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
            <div className="text-xs text-muted-foreground ml-4 flex items-center">
              Página {currentPage} de {totalPages} • {filteredData.length} registros
            </div>
          </div>
        </>
      )}

      {/* Driver Detail Modal */}
      <Dialog open={!!selectedMotorista} onOpenChange={() => setSelectedMotorista(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalhes do Motorista</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedMotorista) {
                    handleOpenEditModal(selectedMotorista);
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
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                        {selectedMotorista.nome
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-2xl font-bold mb-1">{selectedMotorista.nome}</p>
                      <p className="text-muted-foreground mb-2">{selectedMotorista.cpf}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={statusConfig[selectedMotorista.status].variant}
                          className="text-sm"
                        >
                          {statusConfig[selectedMotorista.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{tipoMotoristaConfig[selectedMotorista.tipo].label}</p>
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
                      <p className="font-semibold">{selectedMotorista.telefone}</p>
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

                {selectedMotorista.caminhao_atual && (
                  <Card className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <p className="text-sm text-muted-foreground">Caminhão Atual</p>
                    </div>
                    <p className="font-mono font-bold text-lg text-blue-600">
                      {selectedMotorista.caminhao_atual}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {caminhoesState.find(c => c.placa === selectedMotorista.caminhao_atual)?.modelo}
                    </p>
                  </Card>
                )}
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
                <Card className="p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">Admissão</p>
                  <p className="text-lg font-bold">{formatarDataBrasileira(selectedMotorista.data_admissao)}</p>
                </Card>
              </div>

              {/* Freight History */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico de Fretes Recentes
                </h4>
                <div className="space-y-2">
                  {historicoFretes.map((frete) => (
                    <Card
                      key={frete.id}
                      className="p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm font-bold text-primary">{frete.id}</span>
                          <span className="font-medium">{frete.rota}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{frete.data}</span>
                          <span className="font-bold text-profit">{frete.valor}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
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

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Motorista" : "Novo Motorista"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto px-1">
            {/* Nome e CPF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  placeholder="João Silva"
                  value={editedMotorista.nome || ""}
                  onChange={(e) => {
                    setEditedMotorista({ ...editedMotorista, nome: e.target.value });
                    setErrosCampos({ ...errosCampos, nome: "" });
                  }}
                  className={errosCampos.nome ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errosCampos.nome && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.nome}</p>
                )}
              </div>
              <InputMascarado
                label="CPF *"
                id="cpf"
                tipoMascara="cpf"
                placeholder="000.000.000-00"
                value={editedMotorista.cpf || ""}
                onChange={(e) => {
                  setEditedMotorista({ ...editedMotorista, cpf: e.target.value });
                  setErrosCampos({ ...errosCampos, cpf: "" });
                }}
                onBlur={(e) => {
                  const cpfLimpo = apenasNumeros(e.target.value);
                  if (cpfLimpo && !validarCPF(cpfLimpo)) {
                    setErrosCampos({ ...errosCampos, cpf: "CPF inválido" });
                  }
                }}
                erro={errosCampos.cpf}
              />
            </div>

            {/* Tipo e Placa Temporária (aparece logo abaixo de Nome/CPF) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={editedMotorista.tipo || "proprio"}
                  onValueChange={(value: "proprio" | "terceirizado") =>
                    setEditedMotorista({ ...editedMotorista, tipo: value, placa_temporaria: value === "proprio" ? "" : editedMotorista.placa_temporaria })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprio">Próprio</SelectItem>
                    <SelectItem value="terceirizado">Terceirizado</SelectItem>
                  </SelectContent>
                </Select>
                {errosCampos.tipo && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.tipo}</p>
                )}
              </div>

              {editedMotorista.tipo === "terceirizado" && (
                <div className="space-y-2">
                  <Label htmlFor="placa_temporaria">Placa temporária</Label>
                  <Input
                    id="placa_temporaria"
                    placeholder="ABC1D23"
                    value={editedMotorista.placa_temporaria || ""}
                    onChange={(e) => setEditedMotorista({ ...editedMotorista, placa_temporaria: e.target.value.toUpperCase() })}
                  />
                </div>
              )}
            </div>

            {/* Telefone e Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputMascarado
                label="Telefone *"
                id="telefone"
                tipoMascara="telefone"
                placeholder="(11) 98765-4321"
                value={editedMotorista.telefone || ""}
                onChange={(e) => {
                  setEditedMotorista({ ...editedMotorista, telefone: e.target.value });
                  setErrosCampos({ ...errosCampos, telefone: "" });
                }}
                onBlur={(e) => {
                  const telefoneLimpo = apenasNumeros(e.target.value);
                  if (telefoneLimpo && !validarTelefone(telefoneLimpo)) {
                    setErrosCampos({ ...errosCampos, telefone: "Telefone inválido" });
                  }
                }}
                erro={errosCampos.telefone}
              />
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="motorista@email.com"
                  value={editedMotorista.email || ""}
                  onChange={(e) => {
                    setEditedMotorista({ ...editedMotorista, email: e.target.value });
                    setErrosCampos({ ...errosCampos, email: "" });
                  }}
                  onBlur={(e) => {
                    if (e.target.value && !validarEmail(e.target.value)) {
                      setErrosCampos({ ...errosCampos, email: "E-mail inválido" });
                    }
                  }}
                  className={errosCampos.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errosCampos.email && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.email}</p>
                )}
              </div>
            </div>
            {/* Endereço (moved below Telefone/Email) */}
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                placeholder="Cidade, Estado"
                value={editedMotorista.endereco || ""}
                onChange={(e) => setEditedMotorista({ ...editedMotorista, endereco: e.target.value })}
              />
            </div>

            <Separator />

            {/* CNH */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputMascarado
                label="CNH *"
                id="cnh"
                tipoMascara="numero"
                placeholder="00000000000"
                maxLength={11}
                value={editedMotorista.cnh || ""}
                onChange={(e) => {
                  setEditedMotorista({ ...editedMotorista, cnh: e.target.value });
                  setErrosCampos({ ...errosCampos, cnh: "" });
                }}
                onBlur={(e) => {
                  if (e.target.value && !validarCNH(e.target.value)) {
                    setErrosCampos({ ...errosCampos, cnh: "CNH deve ter 11 dígitos" });
                  }
                }}
                erro={errosCampos.cnh}
              />
              <div className="space-y-2">
                <Label htmlFor="cnh_validade">Validade CNH *</Label>
                <Input
                  id="cnh_validade"
                  type="date"
                  value={editedMotorista.cnh_validade || ""}
                  onChange={(e) => {
                    setEditedMotorista({ ...editedMotorista, cnh_validade: e.target.value });
                    setErrosCampos({ ...errosCampos, cnh_validade: "" });
                  }}
                  className={errosCampos.cnh_validade ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {editedMotorista.cnh_validade && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    ✓ Data: {formatarDataBrasileira(editedMotorista.cnh_validade)}
                  </p>
                )}
                {errosCampos.cnh_validade && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.cnh_validade}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnhCategoria">Categoria CNH *</Label>
                <Select
                  value={editedMotorista.cnh_categoria || ""}
                  onValueChange={(value: "A" | "B" | "C" | "D" | "E") => 
                    setEditedMotorista({ ...editedMotorista, cnh_categoria: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Caminhão e Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="caminhao">Caminhão Vinculado</Label>
                  <Select
                    value={editedMotorista.caminhao_atual || "none"}
                    onValueChange={(value) => setEditedMotorista({ ...editedMotorista, caminhao_atual: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um caminhão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {caminhoesState.map((caminhao) => (
                        <SelectItem key={caminhao.placa} value={caminhao.placa}>
                          {caminhao.placa} - {caminhao.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={editedMotorista.status || "ativo"}
                  onValueChange={(value: "ativo" | "inativo" | "ferias") => 
                    setEditedMotorista({ ...editedMotorista, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            

            {/* Data de Admissão */}
            <div className="space-y-2">
              <Label htmlFor="data_admissao">Data de Admissão *</Label>
              <Input
                id="data_admissao"
                type="date"
                value={editedMotorista.data_admissao || ""}
                onChange={(e) => {
                  setEditedMotorista({ ...editedMotorista, data_admissao: e.target.value });
                  setErrosCampos({ ...errosCampos, data_admissao: "" });
                }}
                className={errosCampos.data_admissao ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {editedMotorista.data_admissao && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  ✓ Data: {formatarDataBrasileira(editedMotorista.data_admissao)}
                </p>
              )}
              {errosCampos.data_admissao && (
                <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.data_admissao}</p>
              )}
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                placeholder="Cidade, Estado"
                value={editedMotorista.endereco || ""}
                onChange={(e) => setEditedMotorista({ ...editedMotorista, endereco: e.target.value })}
              />
            </div>

            <Separator />

            {/* Payment Method */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Dados Bancários / PIX
              </h3>

              <div className="space-y-2">
                <Label htmlFor="tipoPagamento">Método de Pagamento *</Label>
                <Select
                  value={editedMotorista.tipo_pagamento || "pix"}
                  onValueChange={(value: "pix" | "transferencia_bancaria") =>
                    setEditedMotorista({ ...editedMotorista, tipo_pagamento: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia_bancaria">Transferência Bancária</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PIX Fields */}
              {editedMotorista.tipo_pagamento === "pix" && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="space-y-2">
                    <Label htmlFor="chavePixTipo">Tipo de Chave PIX *</Label>
                    <Select
                      value={editedMotorista.chave_pix_tipo || "cpf"}
                      onValueChange={(value: "cpf" | "email" | "telefone" | "aleatoria") =>
                        setEditedMotorista({ ...editedMotorista, chave_pix_tipo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(editedMotorista.chave_pix_tipo === "cpf" || editedMotorista.chave_pix_tipo === "telefone") ? (
                    <InputMascarado
                      label="Chave PIX *"
                      id="chave_pix"
                      tipoMascara={(editedMotorista.chave_pix_tipo as string) === "cpf" ? "cpf" : "telefone"}
                      placeholder={
                        editedMotorista.chave_pix_tipo === "cpf"
                          ? "000.000.000-00"
                          : "(11) 98765-4321"
                      }
                      value={editedMotorista.chave_pix || ""}
                      onChange={(e) => {
                        setEditedMotorista({ ...editedMotorista, chave_pix: e.target.value });
                        setErrosCampos({ ...errosCampos, chave_pix: "" });
                      }}
                      erro={errosCampos.chave_pix}
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="chave_pix">Chave PIX *</Label>
                      <Input
                        id="chave_pix"
                        placeholder={
                          (editedMotorista.chave_pix_tipo as string) === "email"
                            ? "email@example.com"
                            : "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                        }
                        value={editedMotorista.chave_pix || ""}
                        onChange={(e) => {
                          setEditedMotorista({ ...editedMotorista, chave_pix: e.target.value });
                          setErrosCampos({ ...errosCampos, chave_pix: "" });
                        }}
                        className={errosCampos.chave_pix ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {errosCampos.chave_pix && (
                        <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.chave_pix}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bank Transfer Fields */}
              {(editedMotorista.tipo_pagamento as string) === "transferencia_bancaria" && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <div className="space-y-2">
                    <Label htmlFor="banco">Banco *</Label>
                    <Input
                      id="banco"
                      placeholder="Banco do Brasil"
                      value={editedMotorista.banco || ""}
                      onChange={(e) => {
                        setEditedMotorista({ ...editedMotorista, banco: e.target.value });
                        setErrosCampos({ ...errosCampos, banco: "" });
                      }}
                      className={errosCampos.banco ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {errosCampos.banco && (
                      <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.banco}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agencia">Agência *</Label>
                      <Input
                        id="agencia"
                        placeholder="1234"
                        value={editedMotorista.agencia || ""}
                        onChange={(e) => {
                          setEditedMotorista({ ...editedMotorista, agencia: e.target.value });
                          setErrosCampos({ ...errosCampos, agencia: "" });
                        }}
                        className={errosCampos.agencia ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {errosCampos.agencia && (
                        <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.agencia}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conta">Conta *</Label>
                      <Input
                        id="conta"
                        placeholder="567890-1"
                        value={editedMotorista.conta || ""}
                        onChange={(e) => {
                          setEditedMotorista({ ...editedMotorista, conta: e.target.value });
                          setErrosCampos({ ...errosCampos, conta: "" });
                        }}
                        className={errosCampos.conta ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {errosCampos.conta && (
                        <p className="text-sm text-red-500 dark:text-red-400">{errosCampos.conta}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoConta">Tipo de Conta *</Label>
                    <Select
                      value={editedMotorista.tipo_conta || "corrente"}
                      onValueChange={(value: "corrente" | "poupanca") =>
                        setEditedMotorista({ ...editedMotorista, tipo_conta: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
              {isEditing ? "Salvar Alterações" : "Cadastrar Motorista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}