import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { FieldError, fieldErrorClass } from "@/components/shared/FieldError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Eye, Truck, Gauge, Weight, CalendarDays, Wrench, AlertCircle, Save, X, Info, FileText, Shield, Fuel, Package as PackageIcon } from "lucide-react";
import { toast } from "sonner";
import caminhoesService from "@/services/caminhoes";
import motoristasService from "@/services/motoristas";
import type { Caminhao, CriarCaminhaoPayload, Motorista } from "@/types";
import { cn, formatPlaca, emptyToNull } from "@/lib/utils";
import { sortMotoristasPorNome } from "@/lib/sortHelpers";
import { formatarDocumento } from '@/utils/formatters';
import { ModalSubmitFooter } from "@/components/shared/ModalSubmitFooter";
import { RefreshingIndicator } from "@/components/shared/RefreshingIndicator";
import { useRefreshData } from "@/hooks/useRefreshData";
import { useShake } from "@/hooks/useShake";

const statusConfig = {
  disponivel: { label: "Disponível", variant: "active" as const },
  em_viagem: { label: "Em Viagem", variant: "inTransit" as const },
  em_manutencao: { label: "Manutenção", variant: "warning" as const },
  inativo: { label: "Inativo", variant: "cancelled" as const },
};

const getFleetType = (caminhao: Caminhao): "PROPRIO" | "TERCEIRO" => {
  if (caminhao.proprietario_tipo === "PROPRIO") return "PROPRIO";
  if (caminhao.proprietario_tipo === "TERCEIRO") return "TERCEIRO";
  return caminhao.motorista_fixo_id ? "TERCEIRO" : "PROPRIO";
};

const formatVehicleCategory = (vehicleType?: Caminhao["tipo_veiculo"]) => {
  if (!vehicleType) return "Não informada";
  return vehicleType
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function Frota() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fleetFilter, setFleetFilter] = useState<"all" | "proprio" | "terceiro">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCaminhao, setSelectedCaminhao] = useState<Caminhao | null>(null);
  const [editedCaminhao, setEditedCaminhao] = useState<Partial<CriarCaminhaoPayload>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 21;
  const { isRefreshing, startRefresh, endRefresh } = useRefreshData();

  // Query para buscar caminhões (Server-Side)
  const { data: caminhoesResponse, isLoading } = useQuery({
    queryKey: ["caminhoes", currentPage, itemsPerPage, search, statusFilter, fleetFilter],
    queryFn: () => caminhoesService.listarCaminhoes({
      page: currentPage,
      limit: itemsPerPage,
      search,
      status: statusFilter,
      proprietario_tipo: fleetFilter === "proprio" ? "PROPRIO" : fleetFilter === "terceiro" ? "TERCEIRO" : undefined
    }),
    refetchOnMount: "always",
    placeholderData: (prev) => prev,
  });

  // Query para buscar motoristas
  const { data: motoristasResponse, isLoading: isLoadingMotoristas } = useQuery({
    queryKey: ["motoristas"],
    queryFn: () => motoristasService.listarMotoristas(),
    refetchOnMount: "always",
  });

  const caminhoes = caminhoesResponse?.data || [];
  const serverMeta = caminhoesResponse?.meta as any;
  const totalFromServer = serverMeta?.total ?? caminhoes.length;
  const totalPagesFromServer = serverMeta?.totalPages ?? Math.ceil(totalFromServer / itemsPerPage);

  const motoristasDisponiveis = sortMotoristasPorNome(motoristasResponse?.data || []);
  const transportadoraContelli = motoristasDisponiveis.find(
    (motorista) => String(motorista.nome || "").trim().toUpperCase() === "TRANSPORTADORA CONTELLI"
  );
  const [autoFilledFields, setAutoFilledFields] = useState<{ placa?: boolean; motorista?: boolean; proprietario_tipo?: boolean }>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const resetFormErrors = () => setFormErrors({});
  const clearFormError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };
  const applyUniqueFieldError = (message?: string) => {
    const fallback = "Erro ao salvar caminhão";
    const text = String(message || fallback);
    const isPlacaUnique = /placa/i.test(text) || /duplicate entry/i.test(text);
    setFormErrors({ [isPlacaUnique ? "placa" : "modelo"]: text });
    triggerShake();
  };
  const { isShaking, triggerShake } = useShake(220);

  // Plate helpers usable across handlers
  const normalizePlate = (p?: string) => (p ? p.trim().toUpperCase() : "");
  const stripNonAlnum = (s: string) => s.replace(/[^A-Z0-9]/gi, "");
  const formatPlateWithDash = (p?: string) => {
    if (!p) return "";
    const up = normalizePlate(p);
    if (/^[A-Z]{3}-\d{4}$/.test(up)) return up;
    const clean = stripNonAlnum(up);
    if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(clean)) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    if (/^[A-Z]{3}\d{4}$/.test(clean)) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    return up;
  };

  // Autoformat while typing: insert dash after 3 chars for plate-like inputs
  const formatPlateAsUserTypes = (value: string) => {
    const clean = stripNonAlnum(value.toUpperCase());
    if (clean.length <= 3) return clean;
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}`;
  };
  const isValidPlate = (p?: string) => {
    if (!p) return false;
    const plate = normalizePlate(p);
    return /^[A-Z]{3}-\d{4}$/.test(plate) || /^[A-Z]{3}-?\d[A-Z]\d{2}$/.test(plate);
  };

  // Mutation para criar caminhão
  const criarMutation = useMutation({
    mutationFn: caminhoesService.criarCaminhao,
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Caminhão cadastrado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["caminhoes"] });
        setIsModalOpen(false);
        endRefresh();
      } else {
        applyUniqueFieldError(response.message || "Erro ao cadastrar caminhão");
        endRefresh();
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao cadastrar caminhão";
      applyUniqueFieldError(message);
      endRefresh();
    },
  });

  // Mutation para editar caminhão
  const editarMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CriarCaminhaoPayload> }) =>
      caminhoesService.atualizarCaminhao(id, payload),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Caminhão atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["caminhoes"] });
        setIsModalOpen(false);
        endRefresh();
      } else {
        applyUniqueFieldError(response.message || "Erro ao atualizar caminhão");
        endRefresh();
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao atualizar caminhão";
      applyUniqueFieldError(message);
      endRefresh();
    },
  });
  const isSaving = criarMutation.status === "pending" || editarMutation.status === "pending";

  const handleOpenNewModal = () => {
    setEditedCaminhao({
      placa: "",
      placa_carreta: "",
      modelo: "",
      ano_fabricacao: undefined,
      capacidade_toneladas: undefined,
      status: "disponivel",
      km_atual: 0,
      motorista_fixo_id: "",
      ultima_manutencao_data: "",
      proxima_manutencao_km: 0,
      renavam: "",
      chassi: "",
      registro_antt: "",
      validade_seguro: "",
      validade_licenciamento: "",
      tipo_combustivel: undefined,
      tipo_veiculo: undefined,
      proprietario_tipo: undefined,
    });
    setIsEditing(false);
    setSelectedCaminhao(null);
    setAutoFilledFields({});
    setIsModalOpen(true);
  };

  // Abrir modal de edição quando rota /frota/editar/:id for acessada
  const frotaParams = useParams();
  useEffect(() => {
    const idParam = frotaParams.id;
    if (!idParam) return;
    if (!isLoading && caminhoes.length > 0) {
      const found = caminhoes.find((c) => String(c.id) === String(idParam));
      if (found) handleOpenEditModal(found);
    }
  }, [frotaParams.id, isLoading, caminhoes]);



  const handleOpenEditModal = (caminhao: Caminhao) => {
    // Converter campos da API para o formato do formulário
    setEditedCaminhao({
      placa: caminhao.placa,
      placa_carreta: caminhao.placa_carreta || "",
      modelo: caminhao.modelo,
      ano_fabricacao: caminhao.ano_fabricacao,
      capacidade_toneladas: caminhao.capacidade_toneladas,
      status: caminhao.status,
      km_atual: caminhao.km_atual,
      motorista_fixo_id: caminhao.motorista_fixo_id || "",
      ultima_manutencao_data: caminhao.ultima_manutencao_data || "",
      proxima_manutencao_km: caminhao.proxima_manutencao_km || 0,
      renavam: caminhao.renavam || "",
      chassi: caminhao.chassi || "",
      registro_antt: caminhao.registro_antt || "",
      validade_seguro: caminhao.validade_seguro || "",
      validade_licenciamento: caminhao.validade_licenciamento || "",
      tipo_combustivel: caminhao.tipo_combustivel,
      tipo_veiculo: caminhao.tipo_veiculo,
      proprietario_tipo: caminhao.proprietario_tipo,
    });
    setIsEditing(true);
    setSelectedCaminhao(caminhao);
    setAutoFilledFields({});
    setIsModalOpen(true);
    navigate(`/frota/editar/${caminhao.id}`, { replace: false });
  };

  useEffect(() => {
    if (!isModalOpen) {
      const path = window.location.pathname || "";
      if (path.startsWith("/frota/editar/")) {
        navigate("/frota", { replace: true });
      }
      setIsEditing(false);
      setSelectedCaminhao(null);
    }
  }, [isModalOpen, navigate]);

  const handleSave = () => {
    if (isSaving) return;

    const nextErrors: Record<string, string> = {};
    if (!String(editedCaminhao.placa || "").trim()) nextErrors.placa = "Placa é obrigatória.";
    if (!String(editedCaminhao.modelo || "").trim()) nextErrors.modelo = "Modelo é obrigatório.";
    if (!editedCaminhao.tipo_veiculo) nextErrors.tipo_veiculo = "Tipo de veículo é obrigatório.";
    if (!editedCaminhao.proprietario_tipo) nextErrors.proprietario_tipo = "Tipo de proprietário é obrigatório.";

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      triggerShake();
      return;
    }

    // Simple client-side validation to avoid 400 from backend
    const normalizePlate = (p?: string) => (p ? p.trim().toUpperCase() : "");
    const stripNonAlnum = (s: string) => s.replace(/[^A-Z0-9]/gi, "");
    const isValidPlate = (p?: string) => {
      if (!p) return false;
      const plate = normalizePlate(p);
      // Accept traditional format ABC-1234 and Mercosul-like (with or without dash) ABC1D23 or ABC-1D23
      const regexOld = /^[A-Z]{3}-\d{4}$/;
      const regexMercosul = /^[A-Z]{3}-?\d[A-Z]\d{2}$/;
      return regexOld.test(plate) || regexMercosul.test(plate);
    };

    const formatPlateWithDash = (p?: string) => {
      if (!p) return "";
      const up = normalizePlate(p);
      // If already in old format ABC-1234 keep it
      if (/^[A-Z]{3}-\d{4}$/.test(up)) return up;
      // For mercosul-like, remove non-alnum then insert dash after 3 chars: ABC1D23 -> ABC-1D23
      const clean = stripNonAlnum(up);
      if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(clean)) {
        return `${clean.slice(0, 3)}-${clean.slice(3)}`;
      }
      // Fallback: return uppercased input
      return up;
    };

    setFormErrors({});
    const placaNorm = formatPlateWithDash(editedCaminhao.placa as string);
    if (!placaNorm || !isValidPlate(placaNorm)) {
      setFormErrors({ placa: "Placa inválida. Use formato ABC-1234 ou BWJ-9B60 (Mercosul)." });
      triggerShake();
      return;
    }

    const placaCarreta = formatPlateWithDash(editedCaminhao.placa_carreta as string);
    if (editedCaminhao.placa_carreta && !isValidPlate(placaCarreta)) {
      setFormErrors({ placa_carreta: "Placa da carreta inválida." });
      triggerShake();
      return;
    }

    // Capacidade é opcional. Valida apenas quando preenchida.
    let capacidadeNormalized: number | null = null;
    if (editedCaminhao.capacidade_toneladas !== undefined && editedCaminhao.capacidade_toneladas !== null && String(editedCaminhao.capacidade_toneladas).trim() !== "") {
      const num = Number(editedCaminhao.capacidade_toneladas);
      if (!(num > 0)) {
        setFormErrors({ capacidade_toneladas: "Capacidade deve ser maior que 0" });
        triggerShake();
        return;
      }
      capacidadeNormalized = num;
    } else {
      capacidadeNormalized = null;
    }

    // Normalize fields to match backend schema precisely
    const mapProprietarioTipo = (v?: string | undefined) => {
      if (!v) return undefined;
      // Backend expects: PROPRIO | TERCEIRO | AGREGADO
      if (v === "TERCEIRIZADO") return "TERCEIRO";
      if (v === "PROPRIO") return "PROPRIO";
      if (v === "AGREGADO") return "AGREGADO";
      return v;
    };

    const proprietarioTipo = mapProprietarioTipo(editedCaminhao.proprietario_tipo);
    const motoristaFixoIdFinal =
      proprietarioTipo === "PROPRIO"
        ? (transportadoraContelli?.id || editedCaminhao.motorista_fixo_id || null)
        : (editedCaminhao.motorista_fixo_id ? String(editedCaminhao.motorista_fixo_id) : null);

    const payload: CriarCaminhaoPayload = {
      placa: placaNorm.toUpperCase() as string,
      modelo: String(editedCaminhao.modelo || "").trim().toUpperCase(),
      // Some backends expect year as string — ensure consistent typing
      ano_fabricacao: typeof editedCaminhao.ano_fabricacao === 'number' ? String(editedCaminhao.ano_fabricacao) as any : (editedCaminhao.ano_fabricacao as any),
      capacidade_toneladas: capacidadeNormalized as number,
      tipo_veiculo: editedCaminhao.tipo_veiculo as any,
      status: editedCaminhao.status || "disponivel",
      km_atual: editedCaminhao.km_atual || 0,
      tipo_combustivel: editedCaminhao.tipo_combustivel,
      motorista_fixo_id: motoristaFixoIdFinal,
      proprietario_tipo: proprietarioTipo as any,
      renavam: editedCaminhao.renavam || undefined,
      chassi: editedCaminhao.chassi || undefined,
      registro_antt: editedCaminhao.registro_antt || undefined,
      validade_seguro: editedCaminhao.validade_seguro || undefined,
      validade_licenciamento: editedCaminhao.validade_licenciamento || undefined,
      ultima_manutencao_data: editedCaminhao.ultima_manutencao_data || undefined,
      proxima_manutencao_km: editedCaminhao.proxima_manutencao_km || undefined,
      placa_carreta: (editedCaminhao.tipo_veiculo && ["CARRETA", "BITREM", "TRUCK"].includes(editedCaminhao.tipo_veiculo as string)) ? (placaCarreta ? placaCarreta.toUpperCase() : undefined) : undefined,
    };

    // Normalize optional empty strings to null before sending
    const cleaned = emptyToNull(payload as Record<string, any>, [
      'placa_carreta', 'renavam', 'chassi', 'registro_antt', 'validade_seguro', 'validade_licenciamento'
    ]);

    if (isEditing && selectedCaminhao) {
      editarMutation.mutate({
        id: selectedCaminhao.id,
        payload: cleaned as any,
      });
    } else {
      criarMutation.mutate(cleaned as any);
    }
  };

  // Resumo de frota baseado no dado atualmente renderizado (da página)
  // Como o backend paginado não tem totalizadores agrupados na API atualmente,
  // mostrar a distribuição dessa visualização atual:
  const fleetSummary = {
    proprio: caminhoes.filter((c) => getFleetType(c) === "PROPRIO").length,
    terceiro: caminhoes.filter((c) => getFleetType(c) === "TERCEIRO").length,
  };
  const emOperacaoCount = caminhoes.filter((c) => c.status === "disponivel" || c.status === "em_viagem").length;
  const emManutencaoCount = caminhoes.filter((c) => c.status === "em_manutencao").length;
  const categoriasAtivasCount = new Set(caminhoes.map((c) => c.tipo_veiculo).filter(Boolean)).size;

  // Lógica de paginação principal
  const totalPages = totalPagesFromServer;
  
  // Utilizar diretamente a resposta do servidor:
  const orderedData = [...caminhoes].sort((a, b) => {
    const aType = getFleetType(a) === "PROPRIO" ? 0 : 1;
    const bType = getFleetType(b) === "PROPRIO" ? 0 : 1;
    if (aType !== bType) return aType - bType;
    return a.modelo.localeCompare(b.modelo, "pt-BR");
  });
  
  const paginatedData = orderedData;
  const paginatedProprios = paginatedData.filter((c) => getFleetType(c) === "PROPRIO");
  const paginatedTerceiros = paginatedData.filter((c) => getFleetType(c) === "TERCEIRO");

  // Resetar para página 1 quando aplicar novos filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, fleetFilter]);

  // Limpar marcação de auto-filled quando modal fechar
  useEffect(() => {
    if (!isModalOpen) {
      setAutoFilledFields({});
    }
  }, [isModalOpen]);

  const getMaintenanceStatus = (km: number, proxima: number) => {
    const percentual = (km / proxima) * 100;
    if (percentual >= 90) return "critical";
    if (percentual >= 70) return "warning";
    return "ok";
  };

  const isDocumentExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const [day, month, year] = dateStr.split('/');
    const docDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    const diffDays = Math.ceil((docDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isDocumentExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    const [day, month, year] = dateStr.split('/');
    const docDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    return docDate < today;
  };

  const columns = [
    {
      key: "placa",
      header: "Veículo",
      render: (item: Caminhao) => {
        return (
          <div className="flex items-start gap-2 py-1">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 hover:from-primary/30 hover:to-primary/20 transition-all shadow-sm">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base text-foreground tracking-wide">{item.placa}</p>
                {item.tipo_veiculo ? (
                  <Badge variant="secondary" className="text-[10px] py-0 px-2">{item.tipo_veiculo}</Badge>
                ) : null}
                <p className="text-xs text-muted-foreground font-medium">{item.modelo}</p>
                {item.placa_carreta ? (
                  <Badge className="text-xs font-semibold">{item.placa_carreta}</Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{item.ano_fabricacao}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (item: Caminhao) => (
        <Badge variant={statusConfig[item.status].variant} className="font-semibold text-xs px-3 py-1.5 whitespace-nowrap">
          {statusConfig[item.status].label}
        </Badge>
      ),
    },
    {
      key: "motorista_fixo_id",
      header: "Proprietário / Transportadora",
      render: (item: Caminhao) => {
        const motorista = motoristasDisponiveis.find(m => m.id === item.motorista_fixo_id);
        return (
          <>
            {motorista ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/60 dark:to-blue-900/40 rounded-md border border-blue-300 dark:border-blue-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-5 w-5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Truck className="h-3 w-3 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-200 whitespace-nowrap">
                    {motorista.nome}
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">
                    {motorista.tipo === "proprio" ? "Próprio" : "Terceirizado"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-dashed border-muted-foreground/30">
                <span className="text-xs text-muted-foreground italic">
                  Não atribuído
                </span>
              </div>
            )}
          </>
        );
      },
    },
    {
      key: "capacidade",
      header: "Especificações",
      render: (item: Caminhao) => (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Weight className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-base text-foreground">{item.capacidade_toneladas}</span>
              <span className="text-[10px] text-muted-foreground">ton</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-xs text-foreground">{item.km_atual.toLocaleString("pt-BR")}</span>
              <span className="text-[10px] text-muted-foreground">km</span>
            </div>
          </div>
          {(item.tipo_combustivel || item.proprietario_tipo) && (
            <div className="flex items-center gap-2">
              <Fuel className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
              {item.tipo_combustivel && (
                <Badge variant="outline" className="text-[10px] font-semibold py-0 px-2">
                  {item.tipo_combustivel}
                </Badge>
              )}
              {item.proprietario_tipo && (
                <Badge
                  variant={item.proprietario_tipo === "PROPRIO" ? "default" : "outline"}
                  className="text-[10px] font-semibold py-0 px-2"
                >
                  {item.proprietario_tipo}
                </Badge>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "documentacao",
      header: "Documentação",
      render: (item: Caminhao) => {
        const seguroExpired = isDocumentExpired(item.validade_seguro || undefined);
        const seguroExpiring = isDocumentExpiringSoon(item.validade_seguro || undefined);
        const licExpired = isDocumentExpired(item.validade_licenciamento || undefined);
        const licExpiring = isDocumentExpiringSoon(item.validade_licenciamento || undefined);
        const hasAlert = seguroExpired || seguroExpiring || licExpired || licExpiring;

        return (
          <div className="space-y-2">
            {item.validade_seguro && (
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${seguroExpired
                  ? "bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800"
                  : seguroExpiring
                    ? "bg-orange-100 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800"
                    : "bg-muted/40"
                }`}>
                <Shield className={`h-3.5 w-3.5 flex-shrink-0 ${seguroExpired ? "text-red-600" : seguroExpiring ? "text-orange-600" : "text-muted-foreground"
                  }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Seguro</p>
                  <p className={`text-xs font-semibold ${seguroExpired ? "text-red-700 dark:text-red-400"
                      : seguroExpiring ? "text-orange-700 dark:text-orange-400"
                        : "text-foreground"
                    }`}>
                    {item.validade_seguro}
                  </p>
                </div>
                {seguroExpired && <AlertCircle className="h-3.5 w-3.5 text-red-600" />}
                {seguroExpiring && !seguroExpired && <AlertCircle className="h-3.5 w-3.5 text-orange-600" />}
              </div>
            )}
            {item.validade_licenciamento && (
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${licExpired
                  ? "bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800"
                  : licExpiring
                    ? "bg-orange-100 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800"
                    : "bg-muted/40"
                }`}>
                <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${licExpired ? "text-red-600" : licExpiring ? "text-orange-600" : "text-muted-foreground"
                  }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Licenciamento</p>
                  <p className={`text-xs font-semibold ${licExpired ? "text-red-700 dark:text-red-400"
                      : licExpiring ? "text-orange-700 dark:text-orange-400"
                        : "text-foreground"
                    }`}>
                    {item.validade_licenciamento}
                  </p>
                </div>
                {licExpired && <AlertCircle className="h-3.5 w-3.5 text-red-600" />}
                {licExpiring && !licExpired && <AlertCircle className="h-3.5 w-3.5 text-orange-600" />}
              </div>
            )}
            {!item.validade_seguro && !item.validade_licenciamento && (
              <span className="text-xs text-muted-foreground italic">Não informado</span>
            )}
          </div>
        );
      },
    },
    {
      key: "proxima_manutencao",
      header: "Manutenção",
      render: (item: Caminhao) => {
        if (!item.proxima_manutencao_km) {
          return <span className="text-xs text-muted-foreground italic">Não informado</span>;
        }
        const status = getMaintenanceStatus(item.km_atual, item.proxima_manutencao_km);
        const percentual = ((item.km_atual / item.proxima_manutencao_km) * 100).toFixed(0);
        const kmRestante = (item.proxima_manutencao_km - item.km_atual).toLocaleString("pt-BR");

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wrench className={`h-4 w-4 ${status === "critical" ? "text-red-600" : status === "warning" ? "text-yellow-600" : "text-green-600"}`} />
              <span className="text-xs text-muted-foreground">Última: {item.ultima_manutencao_data || "N/A"}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${status === "critical"
                        ? "bg-gradient-to-r from-red-400 to-red-600"
                        : status === "warning"
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                          : "bg-gradient-to-r from-green-400 to-green-600"
                      }`}
                    style={{ width: `${Math.min(parseInt(percentual), 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-bold ml-2 ${status === "critical"
                    ? "text-red-600"
                    : status === "warning"
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}>
                  {percentual}%
                </span>
              </div>
              <p className={`text-xs font-medium ${status === "critical"
                  ? "text-red-600"
                  : status === "warning"
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}>
                {status === "critical" ? "⚠️ CRÍTICO" : status === "warning" ? "⚠️ Atenção" : "✓ OK"} - {kmRestante} km restantes
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "acoes",
      header: "Ações",
      render: (item: Caminhao) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedCaminhao(item);
            }}
            className="gap-1.5 hover:bg-primary/10"
          >
            <Eye className="h-4 w-4" />
            <span className="text-xs">Ver</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleOpenEditModal(item);
            }}
            className="gap-1.5 hover:bg-primary/10"
          >
            <Edit className="h-4 w-4" />
            <span className="text-xs">Editar</span>
          </Button>
        </div>
      ),
    },
  ];

  const listColumns = [
    {
      key: "placa",
      header: "Caminhão",
      render: (item: Caminhao) => {
        const fleetType = getFleetType(item);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-base text-foreground">{item.placa}</p>
              <Badge variant={fleetType === "PROPRIO" ? "default" : "outline"} className="text-[10px] px-2 py-0 font-semibold">
                {fleetType === "PROPRIO" ? "Frota Própria" : "Terceirizado"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{item.modelo}</p>
          </div>
        );
      },
    },
    {
      key: "motorista",
      header: "Proprietário / Transportadora",
      render: (item: Caminhao) => {
        const fleetType = getFleetType(item);
        const motorista = motoristasDisponiveis.find((m) => m.id === item.motorista_fixo_id);
        if (fleetType === "TERCEIRO" && motorista) {
          return <p className="text-sm font-medium text-foreground">{motorista.nome}</p>;
        }
        return <span className="text-xs text-muted-foreground">Frota própria (sem proprietário definido)</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (item: Caminhao) => (
        <Badge variant={statusConfig[item.status].variant} className="font-semibold text-xs px-3 py-1 whitespace-nowrap">
          {statusConfig[item.status].label}
        </Badge>
      ),
    },
    {
      key: "acoes",
      header: "Ações",
      render: (item: Caminhao) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedCaminhao(item);
            }}
            className="gap-1.5"
          >
            <Eye className="h-4 w-4" />
            <span className="text-xs">Ver</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleOpenEditModal(item);
            }}
            className="gap-1.5"
          >
            <Edit className="h-4 w-4" />
            <span className="text-xs">Editar</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout title="Frota" subtitle="Gestão da frota">
      <RefreshingIndicator isRefreshing={isRefreshing} />
      <PageHeader
        title="Frota de Veículos"
        description="Visualização simplificada da frota operacional"
        actions={
          <Button onClick={handleOpenNewModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Caminhão
          </Button>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de Veículos</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">{totalFromServer}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Frota Própria</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {caminhoes.filter(c => getFleetType(c) === "PROPRIO").length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900/50 dark:to-slate-800/30 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-slate-600 flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Terceirizados</p>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                {caminhoes.filter(c => getFleetType(c) === "TERCEIRO").length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Operação</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">
                {emOperacaoCount}
              </p>
            </div>
          </div>
        </Card>

      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por placa, modelo ou proprietário..."
      >
        <div className="inline-flex items-center rounded-md border bg-muted/30 p-1 mr-2">
          <Button
            type="button"
            size="sm"
            variant={fleetFilter === "all" ? "default" : "ghost"}
            className="h-8 px-3 text-xs"
            onClick={() => setFleetFilter("all")}
          >
            Todos
          </Button>
          <Button
            type="button"
            size="sm"
            variant={fleetFilter === "proprio" ? "default" : "ghost"}
            className="h-8 px-3 text-xs"
            onClick={() => setFleetFilter("proprio")}
          >
            Própria
          </Button>
          <Button
            type="button"
            size="sm"
            variant={fleetFilter === "terceiro" ? "default" : "ghost"}
            className="h-8 px-3 text-xs"
            onClick={() => setFleetFilter("terceiro")}
          >
            Terceirizada
          </Button>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="em_viagem">Em Viagem</SelectItem>
            <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="text-sm text-muted-foreground">Carregando frota...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                <Badge className="text-xs md:text-sm px-2.5 py-1">Frota Própria: {fleetSummary.proprio}</Badge>
                <Badge variant="outline" className="text-xs md:text-sm px-2.5 py-1">Terceirizados: {fleetSummary.terceiro}</Badge>
                <Badge variant="secondary" className="text-xs md:text-sm px-2.5 py-1">Exibindo: {paginatedData.length}</Badge>
              </div>

              {paginatedData.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum caminhão encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedData.map((item) => {
                    const motorista = motoristasDisponiveis.find((m) => m.id === item.motorista_fixo_id);
                    const isProprio = getFleetType(item) === "PROPRIO";
                    return (
                      <Card
                        key={item.id}
                        className={`p-5 rounded-xl border bg-gradient-to-br from-card to-muted/30 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${isProprio ? "border-l-4 border-l-primary/60" : "border-l-4 border-l-foreground/20"
                          }`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedCaminhao(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedCaminhao(item);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isProprio ? "bg-primary/10" : "bg-muted/60"}`}>
                              <Truck className={`h-4 w-4 ${isProprio ? "text-primary" : "text-foreground/70"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-base tracking-wide">{item.placa}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.modelo}</p>
                            </div>
                          </div>
                          <Badge variant={isProprio ? "default" : "outline"} className="text-[11px] px-2.5 py-1">
                            {isProprio ? "Frota Própria" : "Terceirizado"}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant={statusConfig[item.status].variant} className="text-[11px] px-2.5 py-1">
                            {statusConfig[item.status].label}
                          </Badge>
                          <span className="inline-flex items-center rounded-md border bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                            {formatVehicleCategory(item.tipo_veiculo)}
                          </span>
                          <span className="inline-flex items-center rounded-md border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                            {item.capacidade_toneladas}
                          </span>
                        </div>

                        <div className="mt-3 rounded-md border bg-muted/30 px-2.5 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Proprietário / Transportadora</p>
                          <p className="text-sm font-semibold leading-tight text-foreground truncate">
                            {motorista?.nome || "Sem proprietário definido"}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-end text-[10px] text-muted-foreground">
                          <span>{isProprio ? "Operação própria" : "Operação terceirizada"}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
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
                Página {currentPage} de {totalPages} • {orderedData.length} registros
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      <Dialog open={!!selectedCaminhao && !isEditing} onOpenChange={() => setSelectedCaminhao(null)}>
        <DialogContent className={`max-w-3xl ${isShaking ? "animate-shake" : ""}`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Detalhes do Caminhão</DialogTitle>
                <DialogDescription>Informações completas sobre o veículo</DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedCaminhao) {
                    handleOpenEditModal(selectedCaminhao);
                    setSelectedCaminhao(null);
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
            {selectedCaminhao && (
              <div className="space-y-6">
                {/* Header */}
                <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold mb-1 tracking-wide">{selectedCaminhao.placa}</p>
                        <p className="text-base font-semibold mb-1.5">{selectedCaminhao.modelo}</p>
                        <Badge variant={statusConfig[selectedCaminhao.status].variant} className="text-xs">
                          {statusConfig[selectedCaminhao.status].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Specs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="p-3 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                      <p className="text-xs text-muted-foreground">Ano de Fabricação</p>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{selectedCaminhao.ano_fabricacao}</p>
                  </Card>

                  <Card className="p-3 border-l-4 border-l-green-500">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Weight className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-xs text-muted-foreground">Capacidade</p>
                    </div>
                    <p className="text-lg font-bold text-green-600">{selectedCaminhao.capacidade_toneladas} ton</p>
                  </Card>

                  <Card className="p-3 border-l-4 border-l-purple-500">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Gauge className="h-3.5 w-3.5 text-purple-600" />
                      <p className="text-xs text-muted-foreground">KM Rodados</p>
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      {selectedCaminhao.km_atual.toLocaleString("pt-BR")}
                    </p>
                  </Card>
                </div>

                <Separator />

                {/* Maintenance */}
                {selectedCaminhao.proxima_manutencao_km && (() => {
                  const status = getMaintenanceStatus(selectedCaminhao.km_atual, selectedCaminhao.proxima_manutencao_km);
                  const percentual = ((selectedCaminhao.km_atual / selectedCaminhao.proxima_manutencao_km) * 100).toFixed(0);
                  return (
                    <div>
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Status de Manutenção
                      </h4>
                      <div className="space-y-4">
                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Última Manutenção</p>
                              <p className="font-semibold">{selectedCaminhao.ultima_manutencao_data || "N/A"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Próxima em</p>
                              <p className="font-semibold">{selectedCaminhao.proxima_manutencao_km?.toLocaleString("pt-BR")} km</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Progressão</span>
                              <span className="text-sm font-bold">{percentual}%</span>
                            </div>
                            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${status === "critical"
                                    ? "bg-red-500"
                                    : status === "warning"
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                style={{ width: `${Math.min(parseInt(percentual), 100)}%` }}
                              />
                            </div>
                            {status === "critical" && (
                              <div className="flex items-center gap-2 text-red-600 text-xs font-semibold mt-2">
                                <AlertCircle className="h-4 w-4" />
                                Manutenção crítica - Agende imediatamente!
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>
                  );
                })()}

                {selectedCaminhao.motorista_fixo_id && (() => {
                  const motorista = motoristasDisponiveis.find(m => m.id === selectedCaminhao.motorista_fixo_id);
                  return motorista ? (
                    <>
                      <Separator />
                      <Card className="p-4 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
                        <p className="text-sm text-muted-foreground mb-2">Proprietário / Transportadora</p>
                        <div className="space-y-2">
                          <p className="font-semibold text-lg text-blue-700 dark:text-blue-300">{motorista.nome}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">Documento: {formatarDocumento(motorista.documento)}</span>
                            <Badge variant={motorista.tipo === "proprio" ? "default" : "outline"}>
                              {motorista.tipo === "proprio" ? "Próprio" : "Terceirizado"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">📞 {motorista.telefone}</p>
                        </div>
                      </Card>
                    </>
                  ) : null;
                })()}

                <Separator />

                {/* Documentação e Fiscal */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentação e Fiscal
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCaminhao.renavam && (
                      <Card className="p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">RENAVAM do Cavalo</p>
                        <p className="font-mono font-semibold text-foreground">{selectedCaminhao.renavam}</p>
                      </Card>
                    )}
                    {selectedCaminhao.placa_carreta && selectedCaminhao.chassi && (
                      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Chassi</p>
                        <p className="font-mono font-semibold text-blue-700 dark:text-blue-300">{selectedCaminhao.chassi}</p>
                      </Card>
                    )}
                    {selectedCaminhao.chassi && !selectedCaminhao.placa_carreta && (
                      <Card className="p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Chassi</p>
                        <p className="font-mono font-semibold text-foreground">{selectedCaminhao.chassi}</p>
                      </Card>
                    )}
                    {selectedCaminhao.registro_antt && (
                      <Card className="p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Registro ANTT</p>
                        <p className="font-mono font-semibold text-foreground">{selectedCaminhao.registro_antt}</p>
                      </Card>
                    )}
                    {selectedCaminhao.proprietario_tipo && (
                      <Card className="p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Tipo de Proprietário</p>
                        <Badge variant="outline" className="font-semibold">
                          {selectedCaminhao.proprietario_tipo}
                        </Badge>
                      </Card>
                    )}
                  </div>

                  {/* Validades */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {selectedCaminhao.validade_seguro && (
                      <Card className="p-4 border-l-4 border-l-orange-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-orange-600" />
                          <p className="text-sm text-muted-foreground">Validade do Seguro</p>
                        </div>
                        <p className="text-lg font-bold text-orange-600">{selectedCaminhao.validade_seguro}</p>
                      </Card>
                    )}
                    {selectedCaminhao.validade_licenciamento && (
                      <Card className="p-4 border-l-4 border-l-cyan-500">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-cyan-600" />
                          <p className="text-sm text-muted-foreground">Validade do Licenciamento</p>
                        </div>
                        <p className="text-lg font-bold text-cyan-600">{selectedCaminhao.validade_licenciamento}</p>
                      </Card>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Especificações Técnicas */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <PackageIcon className="h-4 w-4" />
                    Especificações Técnicas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCaminhao.tipo_veiculo && (
                      <Card className="p-4 border-l-4 border-l-indigo-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4 text-indigo-600" />
                          <p className="text-sm text-muted-foreground">Tipo de Veículo</p>
                        </div>
                        <p className="text-lg font-bold text-indigo-600">{selectedCaminhao.tipo_veiculo}</p>
                      </Card>
                    )}
                    {selectedCaminhao.tipo_combustivel && (
                      <Card className="p-4 border-l-4 border-l-amber-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Fuel className="h-4 w-4 text-amber-600" />
                          <p className="text-sm text-muted-foreground">Tipo de Combustível</p>
                        </div>
                        <p className="text-lg font-bold text-amber-600">{selectedCaminhao.tipo_combustivel}</p>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {selectedCaminhao && (
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setSelectedCaminhao(null)}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  handleOpenEditModal(selectedCaminhao);
                  setSelectedCaminhao(null);
                }}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar Caminhão
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (isSaving) return;
          setIsModalOpen(open);
          resetFormErrors();
        }}
      >
        <DialogContent className={`max-w-3xl ${isShaking ? "animate-shake" : ""}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              {isEditing ? "Editar Caminhão" : "Cadastrar Novo Caminhão"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize as informações do veículo" : "Preencha os dados do novo veículo"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto px-1">
            {/* Seção: Identificação e Especificações Técnicas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <h3 className="font-semibold text-foreground">Identificação e Especificações</h3>
              </div>

              {/* Placa e Tipo de Veículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label htmlFor="placa" className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Placa *
                  </Label>
                  <Input
                    id="placa"
                    placeholder="ABC-1234"
                    maxLength={8}
                    value={editedCaminhao.placa || ""}
                    className={`font-semibold ${autoFilledFields.placa ? 'bg-blue-50 dark:bg-blue-900/40' : ''} ${fieldErrorClass(formErrors.placa)}`}
                    onChange={(e) => {
                      const value = formatPlateAsUserTypes(e.target.value);
                      setEditedCaminhao({ ...editedCaminhao, placa: value });
                      // limpar marcação de auto-fill quando usuário digita manualmente
                      setAutoFilledFields({});
                      clearFormError("placa");
                    }}
                    onFocus={() => clearFormError("placa")}
                  />
                  <FieldError message={formErrors.placa} />

                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoVeiculo" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Tipo de Veículo *
                  </Label>
                  <Select
                    value={editedCaminhao.tipo_veiculo || ""}
                    onValueChange={(value: "TRUCK" | "TOCO" | "CARRETA" | "BITREM") => {
                      setEditedCaminhao({ ...editedCaminhao, tipo_veiculo: value });
                      clearFormError("tipo_veiculo");
                    }}
                  >
                    <SelectTrigger className={fieldErrorClass(formErrors.tipo_veiculo)}>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CARRETA">Carreta</SelectItem>
                      <SelectItem value="TRUCK">Truck</SelectItem>
                      <SelectItem value="TOCO">Toco</SelectItem>
                      <SelectItem value="BITREM">Bitrem</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={formErrors.tipo_veiculo} />
                </div>
              </div>

              {/* Modelo e Placa da Carreta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelo" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Modelo *
                  </Label>
                  <Input
                    id="modelo"
                    placeholder="Ex: Volvo FH 540"
                    className={`uppercase ${fieldErrorClass(formErrors.modelo)}`}
                    value={editedCaminhao.modelo || ""}
                    onChange={(e) => {
                      setEditedCaminhao({ ...editedCaminhao, modelo: e.target.value.toUpperCase() });
                      clearFormError("modelo");
                    }}
                    onFocus={() => clearFormError("modelo")}
                  />
                  <FieldError message={formErrors.modelo} />
                </div>

                {editedCaminhao.tipo_veiculo && ["CARRETA", "BITREM", "TRUCK"].includes(editedCaminhao.tipo_veiculo) ? (
                  <div className="space-y-2">
                    <Label htmlFor="placaCarreta" className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      Placa da Carreta
                    </Label>
                    <Input
                      id="placaCarreta"
                      placeholder="CRT-5678"
                      className={`font-semibold ${fieldErrorClass(formErrors.placa_carreta)}`}
                      maxLength={8}
                      value={editedCaminhao.placa_carreta || ""}
                      onChange={(e) => {
                        const formatted = formatPlateAsUserTypes(e.target.value);
                        setEditedCaminhao({ ...editedCaminhao, placa_carreta: formatted });
                        clearFormError("placa_carreta");
                      }}
                      onFocus={() => clearFormError("placa_carreta")}
                    />
                    <FieldError message={formErrors.placa_carreta} />
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {/* Especificações Técnicas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="anoFabricacao" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Ano
                  </Label>
                  <Select
                    value={(editedCaminhao.ano_fabricacao ? String(editedCaminhao.ano_fabricacao) : "")}
                    onValueChange={(value) => {
                      setEditedCaminhao({ ...editedCaminhao, ano_fabricacao: value ? parseInt(value) : undefined });
                      clearFormError("ano_fabricacao");
                    }}
                  >
                    <SelectTrigger className={fieldErrorClass(formErrors.ano_fabricacao)}>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const startYear = 1970;
                        const current = new Date().getFullYear();
                        return Array.from({ length: current - startYear + 1 }, (_, i) => current - i).map((yr) => (
                          <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  <FieldError message={formErrors.ano_fabricacao} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacidadeToneladas" className="flex items-center gap-2">
                    <Weight className="h-4 w-4 text-primary" />
                    Capacidade
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="capacidadeToneladas"
                      type="number"
                      placeholder="40"
                      min="1"
                      value={editedCaminhao.capacidade_toneladas || ""}
                      onChange={(e) => {
                        setEditedCaminhao({ ...editedCaminhao, capacidade_toneladas: parseFloat(e.target.value) || 0 });
                        clearFormError("capacidade_toneladas");
                      }}
                      onFocus={() => clearFormError("capacidade_toneladas")}
                      className={fieldErrorClass(formErrors.capacidade_toneladas)}
                    />
                    <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">ton</span>
                  </div>
                  <FieldError message={formErrors.capacidade_toneladas} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kmAtual" className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    KM Atual *
                  </Label>
                  <Input
                    id="kmAtual"
                    type="number"
                    placeholder="0"
                    min="0"
                    value={editedCaminhao.km_atual || ""}
                    onChange={(e) => setEditedCaminhao({ ...editedCaminhao, km_atual: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Tipo de Combustível e Tipo de Proprietário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoCombustivel" className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-primary" />
                    Tipo de Combustível
                  </Label>
                  <Select
                    value={editedCaminhao.tipo_combustivel || ""}
                    onValueChange={(value: "DIESEL" | "GASOLINA" | "ETANOL" | "GNV") =>
                      setEditedCaminhao({ ...editedCaminhao, tipo_combustivel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o combustível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIESEL">Diesel</SelectItem>
                      <SelectItem value="GASOLINA">Gasolina</SelectItem>
                      <SelectItem value="ETANOL">Etanol</SelectItem>
                      <SelectItem value="GNV">GNV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proprietarioTipo" className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Tipo de Proprietário
                  </Label>
                  <Select
                    value={editedCaminhao.proprietario_tipo || undefined}
                    onValueChange={(value: "PROPRIO" | "TERCEIRO" | "AGREGADO") => {
                      const isChangingFromProprio = editedCaminhao.proprietario_tipo === "PROPRIO";
                      const shouldClearAutoOwner =
                        value !== "PROPRIO" &&
                        isChangingFromProprio &&
                        Boolean(transportadoraContelli?.id) &&
                        String(editedCaminhao.motorista_fixo_id || "") === String(transportadoraContelli?.id || "");

                      setEditedCaminhao({
                        ...editedCaminhao,
                        proprietario_tipo: value,
                        motorista_fixo_id:
                          value === "PROPRIO"
                            ? (transportadoraContelli?.id || editedCaminhao.motorista_fixo_id)
                            : (shouldClearAutoOwner ? undefined : editedCaminhao.motorista_fixo_id),
                      });
                      clearFormError("proprietario_tipo");
                    }}
                  >
                    <SelectTrigger className={cn(fieldErrorClass(formErrors.proprietario_tipo), autoFilledFields.proprietario_tipo ? 'bg-blue-50 dark:bg-blue-900/40' : '')}>
                      <SelectValue placeholder="Selecione o tipo de proprietário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROPRIO">Próprio</SelectItem>
                      <SelectItem value="TERCEIRO">Terceiro</SelectItem>
                      <SelectItem value="AGREGADO">Agregado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={formErrors.proprietario_tipo} />
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Seção: Status e Proprietário (Operacional) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <h3 className="font-semibold text-foreground">Operacional</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="flex items-center gap-2">
                    <Badge className="h-4 w-4 rounded text-xs px-1.5">Status</Badge>
                    Status *
                  </Label>
                  <Select
                    value={editedCaminhao.status || "disponivel"}
                    onValueChange={(value: "disponivel" | "em_viagem" | "em_manutencao" | "inativo") =>
                      setEditedCaminhao({ ...editedCaminhao, status: value })
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponivel">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          Disponível
                        </div>
                      </SelectItem>
                      <SelectItem value="em_viagem">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          Em Viagem
                        </div>
                      </SelectItem>
                      <SelectItem value="em_manutencao">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          Em Manutenção
                        </div>
                      </SelectItem>
                      <SelectItem value="inativo">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gray-500" />
                          Inativo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motoristaFixoId" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Proprietário / Transportadora
                  </Label>
                  <Select
                    value={editedCaminhao.motorista_fixo_id || "___none___"}
                    onValueChange={(value) =>
                      setEditedCaminhao({
                        ...editedCaminhao,
                        motorista_fixo_id: value === "___none___" ? undefined : value
                      })
                    }
                  >
                    <SelectTrigger id="motoristaFixoId" className={autoFilledFields.motorista ? 'bg-blue-50 dark:bg-blue-900/40' : ''}>
                      <SelectValue placeholder="Selecione o proprietário/transportadora (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="___none___">Nenhum (Sem proprietário definido)</SelectItem>
                      {motoristasDisponiveis
                        .filter(m => m.status === "ativo")
                        .map((motorista) => (
                          <SelectItem key={motorista.id} value={motorista.id}>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex flex-col">
                                <span className="font-semibold">{motorista.nome}</span>
                                <span className="text-xs text-muted-foreground">
                                  {motorista.tipo === "proprio" ? "Próprio" : "Terceirizado"} • {motorista.telefone}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Proprietário ou transportadora responsável por este veículo</p>
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Seção: Documentação e Fiscal */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <h3 className="font-semibold text-foreground">Documentação e Fiscal</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="renavam" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    RENAVAM do Cavalo
                  </Label>
                  <Input
                    id="renavam"
                    placeholder="12345678901"
                    className="font-mono"
                    maxLength={20}
                    value={editedCaminhao.renavam || ""}
                    onChange={(e) => setEditedCaminhao({ ...editedCaminhao, renavam: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">RENAVAM do caminhão trator</p>
                </div>
                {editedCaminhao.tipo_veiculo && ["CARRETA", "BITREM", "TRUCK"].includes(editedCaminhao.tipo_veiculo) && (
                  <div className="space-y-2">
                    <Label htmlFor="placa_carreta_ref" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Placa da Carreta (Referência)
                    </Label>
                    <Input
                      id="placa_carreta_ref"
                      placeholder="DEF-5678"
                      className={fieldErrorClass(formErrors.placa_carreta)}
                      maxLength={8}
                      value={editedCaminhao.placa_carreta || ""}
                      onChange={(e) => {
                        const formatted = formatPlateAsUserTypes(e.target.value);
                        setEditedCaminhao({ ...editedCaminhao, placa_carreta: formatted });
                        clearFormError("placa_carreta");
                      }}
                      onFocus={() => clearFormError("placa_carreta")}
                    />
                    <p className="text-xs text-muted-foreground">Placa do reboque/carreta se aplicável</p>
                    <FieldError message={formErrors.placa_carreta} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="chassi" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Chassi
                  </Label>
                  <Input
                    id="chassi"
                    placeholder="9BWHE21JX24060831"
                    className="font-mono"
                    maxLength={30}
                    value={editedCaminhao.chassi || ""}
                    onChange={(e) => setEditedCaminhao({ ...editedCaminhao, chassi: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registroAntt" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Registro ANTT
                  </Label>
                  <Input
                    id="registroAntt"
                    placeholder="ANTT-2020-001"
                    maxLength={20}
                    value={editedCaminhao.registro_antt || ""}
                    onChange={(e) => setEditedCaminhao({ ...editedCaminhao, registro_antt: e.target.value })}
                  />
                </div>
              </div>

              {/* Validades */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="validadeSeguro" className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange-600" />
                    Validade do Seguro
                  </Label>
                  <Input
                    id="validadeSeguro"
                    placeholder="DD/MM/AAAA"
                    value={editedCaminhao.validade_seguro || ""}
                    onChange={(e) => setEditedCaminhao({ ...editedCaminhao, validade_seguro: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validadeLicenciamento" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-600" />
                    Validade do Licenciamento
                  </Label>
                  <Input
                    id="validadeLicenciamento"
                    placeholder="DD/MM/AAAA"
                    value={editedCaminhao.validade_licenciamento || ""}
                    onChange={(e) => setEditedCaminhao({ ...editedCaminhao, validade_licenciamento: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Seção: Manutenção */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <h3 className="font-semibold text-foreground">Manutenção Preventiva</h3>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  Configure o intervalo de manutenção para receber alertas quando o caminhão se aproximar do limite
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ultimaManutencaoData" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    Última Manutenção *
                  </Label>
                  <Input
                    id="ultimaManutencaoData"
                    placeholder="DD/MM/AAAA"
                    value={editedCaminhao.ultima_manutencao_data || ""}
                    onChange={(e) => setEditedCaminhao({ ...editedCaminhao, ultima_manutencao_data: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proximaManutencaoKm" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Próxima Manutenção (KM) *
                  </Label>
                  <Input
                    id="proximaManutencaoKm"
                    type="number"
                    placeholder="250000"
                    min="0"
                    value={editedCaminhao.proxima_manutencao_km || ""}
                    onChange={(e) => setEditedCaminhao({ ...editedCaminhao, proxima_manutencao_km: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              {editedCaminhao.km_atual !== undefined && editedCaminhao.proxima_manutencao_km !== undefined && editedCaminhao.proxima_manutencao_km > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Intervalo de Manutenção</span>
                    <span className="text-sm font-bold text-foreground">
                      {((editedCaminhao.km_atual / editedCaminhao.proxima_manutencao_km) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${(editedCaminhao.km_atual / editedCaminhao.proxima_manutencao_km) * 100 >= 90
                          ? "bg-red-500"
                          : (editedCaminhao.km_atual / editedCaminhao.proxima_manutencao_km) * 100 >= 70
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      style={{ width: `${Math.min((editedCaminhao.km_atual / editedCaminhao.proxima_manutencao_km) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <ModalSubmitFooter
              onCancel={() => {
                setIsModalOpen(false);
                resetFormErrors();
              }}
              onSubmit={handleSave}
              isSubmitting={isSaving}
              submitLabel={isEditing ? "Salvar Alterações" : "Cadastrar Caminhão"}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
