import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { DatePicker } from "@/components/shared/DatePicker";
import { FieldError } from "@/components/shared/FieldError";
import { fieldErrorClass, toNumber, getTodayInputDate } from "@/utils/formatters";
import {
  Package, Truck, MapPin, Info, CalendarIcon, Weight,
  DollarSign, Plus, Trash2, ChevronDown, ChevronUp, Copy,
  AlertTriangle, CheckCircle2, XCircle, TrendingUp,
} from "lucide-react";
import { parseLocalInputDate } from "@/utils/formatters";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EstoqueFazenda {
  id: string;
  fazendaId?: string;
  fazenda: string;
  estado: string;
  mercadoria: string;
  variedade: string;
  precoPorTonelada: number;
  pesoMedioSaca: number;
  safra: string;
}

export interface FreteItemLote {
  estoqueSelecionado: EstoqueFazenda;
  destino: string;
  dataFrete: string;
  ticket: string;
  toneladas: number;
  valorPorTonelada: number;
  numeroNotaFiscal: string;
}

interface FreteItem {
  localId: string;
  fazendaEstoqueId: string;
  estoqueSelecionado: EstoqueFazenda | null;
  destino: string;
  dataFrete: string;
  ticket: string;
  toneladas: string;
  valorPorTonelada: string;
  numeroNotaFiscal: string;
  collapsed: boolean;
  errors: Record<string, string>;
}

interface SubmitResult {
  index: number;
  success: boolean;
  message?: string;
  codigoFrete?: string;
}

interface FreteLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  estoquesFazendas: EstoqueFazenda[];
  motoristasState: any[];
  caminhoesState: any[];
  isSaving: boolean;
  onSubmitLote: (params: {
    motoristaId: string;
    caminhaoId: string;
    fretes: FreteItemLote[];
    onProgress: (done: number, total: number, result: SubmitResult) => void;
  }) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeFazendaNome = (nome: string) => {
  if (!nome) return "";
  const parts = nome.split(" - ");
  if (parts.length > 1) {
    const mainName = parts[0].trim();
    if (mainName.toLowerCase().startsWith("fazenda")) return mainName;
  }
  return nome;
};

const makeItem = (base?: Partial<FreteItem>): FreteItem => ({
  localId: crypto.randomUUID(),
  fazendaEstoqueId: "",
  estoqueSelecionado: null,
  destino: "",
  dataFrete: getTodayInputDate(),
  ticket: "",
  toneladas: "",
  valorPorTonelada: "",
  numeroNotaFiscal: "",
  collapsed: false,
  errors: {},
  ...base,
});

// ─── Frete Card ───────────────────────────────────────────────────────────────

interface FreteCardProps {
  item: FreteItem;
  index: number;
  total: number;
  estoquesFazendas: EstoqueFazenda[];
  isDuplicate: boolean;
  onChange: (localId: string, patch: Partial<FreteItem>) => void;
  onRemove: (localId: string) => void;
  onClone: (localId: string) => void;
  disabled: boolean;
}

function FreteCard({
  item, index, total, estoquesFazendas, isDuplicate,
  onChange, onRemove, onClone, disabled,
}: FreteCardProps) {
  const update = (patch: Partial<FreteItem>) => onChange(item.localId, patch);

  const receita =
    item.toneladas && item.valorPorTonelada
      ? toNumber(item.toneladas) * toNumber(item.valorPorTonelada)
      : null;

  const sacas =
    item.estoqueSelecionado && item.toneladas
      ? Math.round((toNumber(item.toneladas) * 1000) / item.estoqueSelecionado.pesoMedioSaca)
      : null;

  const hasErrors = Object.values(item.errors).some(Boolean);

  return (
    <Card
      className={cn(
        "border-l-4 transition-all",
        hasErrors
          ? "border-l-destructive"
          : isDuplicate
          ? "border-l-yellow-500"
          : item.collapsed
          ? "border-l-muted"
          : "border-l-primary"
      )}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="secondary"
            className={cn("font-mono text-xs shrink-0", hasErrors && "bg-destructive/10 text-destructive")}
          >
            #{index + 1}
          </Badge>
          <span className="text-sm font-medium truncate">
            {item.estoqueSelecionado
              ? normalizeFazendaNome(item.estoqueSelecionado.fazenda)
              : <span className="text-muted-foreground">Sem fazenda</span>}
          </span>
          {receita !== null && (
            <span className="text-xs text-profit font-semibold shrink-0">
              R$ {receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          )}
          {isDuplicate && (
            <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 shrink-0">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Duplicado
            </Badge>
          )}
          {hasErrors && (
            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40 shrink-0">
              <XCircle className="h-3 w-3 mr-1" />
              Erro
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onClone(item.localId)} disabled={disabled}
            title="Clonar frete"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => update({ collapsed: !item.collapsed })}
            title={item.collapsed ? "Expandir" : "Recolher"}
            disabled={disabled}
          >
            {item.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          {total > 1 && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onRemove(item.localId)} disabled={disabled}
              title="Remover frete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!item.collapsed && (
        <CardContent className="pt-0 pb-4 px-4 space-y-4">
          <Separator />

          {/* Fazenda de Origem */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-green-600 font-semibold text-sm">
              <MapPin className="h-4 w-4" /> Fazenda de Origem *
            </Label>
            <Select
              value={item.fazendaEstoqueId}
              disabled={disabled}
              onValueChange={(v) => {
                const estoque = estoquesFazendas.find((e) => String(e.id) === String(v));
                update({
                  fazendaEstoqueId: v,
                  estoqueSelecionado: estoque || null,
                  valorPorTonelada: estoque
                    ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(estoque.precoPorTonelada)
                    : "",
                  errors: { ...item.errors, fazendaEstoqueId: "" },
                });
              }}
            >
              <SelectTrigger className={cn(fieldErrorClass(item.errors.fazendaEstoqueId), "text-sm")}>
                <SelectValue placeholder="Selecione a fazenda produtora" />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {estoquesFazendas.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhuma fazenda cadastrada</SelectItem>
                ) : (
                  (() => {
                    const grouped = estoquesFazendas.reduce((acc, e) => {
                      if (!acc[e.estado]) acc[e.estado] = [];
                      acc[e.estado].push(e);
                      return acc;
                    }, {} as Record<string, EstoqueFazenda[]>);
                    return ["SP", "MS", ...Object.keys(grouped).filter((e) => e !== "SP" && e !== "MS")]
                      .filter((estado) => estado in grouped)
                      .map((estado) => (
                        <SelectGroup key={estado}>
                          <SelectLabel className="font-semibold text-primary">{estado}</SelectLabel>
                          {grouped[estado].map((e) => (
                            <SelectItem key={e.id} value={String(e.id)}>
                              {normalizeFazendaNome(e.fazenda)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ));
                  })()
                )}
              </SelectContent>
            </Select>
            <FieldError message={item.errors.fazendaEstoqueId} />

            {item.estoqueSelecionado && (
              <div className="grid grid-cols-3 gap-2 rounded-md border bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900 p-3 text-xs">
                <div><p className="text-muted-foreground">Estado</p><p className="font-medium">{item.estoqueSelecionado.estado}</p></div>
                <div><p className="text-muted-foreground">Mercadoria</p><p className="font-medium">{item.estoqueSelecionado.mercadoria}</p></div>
                <div><p className="text-muted-foreground">Preço/ton</p><p className="font-bold text-green-700 dark:text-green-400">R$ {item.estoqueSelecionado.precoPorTonelada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
              </div>
            )}
          </div>

          {/* Destino */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" /> Local de Entrega *
            </Label>
            <Select
              value={item.destino}
              disabled={disabled}
              onValueChange={(v) => update({ destino: v, errors: { ...item.errors, destino: "" } })}
            >
              <SelectTrigger className={cn(fieldErrorClass(item.errors.destino), "text-sm")}>
                <SelectValue placeholder="Selecione o local de entrega" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Filial 1 - Secagem e Armazenagem">Filial 1 - Secagem e Armazenagem</SelectItem>
                <SelectItem value="Fazenda Santa Rosa - Secagem e Armazenagem">Fazenda Santa Rosa - Secagem e Armazenagem</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={item.errors.destino} />
          </div>

          {/* Data + Ticket + Nota */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" /> Data do Frete *
              </Label>
              <DatePicker
                value={item.dataFrete ? parseLocalInputDate(item.dataFrete) : undefined}
                onChange={(date) => {
                  if (!date) return;
                  update({ dataFrete: format(date, "yyyy-MM-dd"), errors: { ...item.errors, dataFrete: "" } });
                }}
                disabled={(date) => date > new Date()}
                buttonClassName={cn(fieldErrorClass(item.errors.dataFrete))}
              />
              <FieldError message={item.errors.dataFrete} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground" /> Ticket (balança)
              </Label>
              <Input
                placeholder="0123"
                value={item.ticket}
                disabled={disabled}
                onChange={(e) => update({ ticket: e.target.value })}
              />
            </div>
            {item.estoqueSelecionado?.estado === "MS" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-muted-foreground" /> Nº Nota Fiscal
                </Label>
                <Input
                  placeholder="12.345.678"
                  value={item.numeroNotaFiscal}
                  disabled={disabled}
                  onChange={(e) => update({ numeroNotaFiscal: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Toneladas + Valor/ton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                <Weight className="h-4 w-4" /> Peso *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-sm">t</span>
                <Input
                  placeholder="Ex: 20.555"
                  className={cn("pl-7", fieldErrorClass(item.errors.toneladas))}
                  value={item.toneladas}
                  disabled={!item.estoqueSelecionado || disabled}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (!digits) { update({ toneladas: "", errors: { ...item.errors, toneladas: "" } }); return; }
                    const formatted = digits.length > 3 ? `${digits.slice(0, -3)}.${digits.slice(-3)}` : digits;
                    update({ toneladas: formatted, errors: { ...item.errors, toneladas: "" } });
                  }}
                />
              </div>
              <FieldError message={item.errors.toneladas} />
              {sacas !== null && (
                <p className="text-xs text-blue-600">≈ {sacas.toLocaleString("pt-BR")} sacas ({item.estoqueSelecionado?.pesoMedioSaca}kg cada)</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                <DollarSign className="h-4 w-4" /> Valor por Tonelada *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-sm">R$</span>
                <Input
                  placeholder="Ex: 200,00"
                  className={cn("pl-10", fieldErrorClass(item.errors.valorPorTonelada))}
                  value={item.valorPorTonelada}
                  disabled={!item.estoqueSelecionado || disabled}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (!digits) { update({ valorPorTonelada: "", errors: { ...item.errors, valorPorTonelada: "" } }); return; }
                    const formatted = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseInt(digits, 10) / 100);
                    update({ valorPorTonelada: formatted, errors: { ...item.errors, valorPorTonelada: "" } });
                  }}
                />
              </div>
              <FieldError message={item.errors.valorPorTonelada} />
              {item.estoqueSelecionado && (
                <p className="text-xs text-green-600">
                  ✓ Preço da fazenda: R$ {item.estoqueSelecionado.precoPorTonelada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/ton
                </p>
              )}
            </div>
          </div>

          {/* Preview do frete */}
          {receita !== null && item.estoqueSelecionado && (
            <div className="grid grid-cols-3 gap-2 rounded-md border bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900 p-3 text-xs">
              <div><p className="text-muted-foreground">Toneladas</p><p className="font-bold">{toNumber(item.toneladas).toFixed(3)} t</p></div>
              <div><p className="text-muted-foreground">Sacas (aprox.)</p><p className="font-bold">{sacas?.toLocaleString("pt-BR")}</p></div>
              <div><p className="text-muted-foreground">Receita estimada</p><p className="font-bold text-profit">R$ {receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Progress Screen ──────────────────────────────────────────────────────────

interface ProgressScreenProps {
  done: number;
  total: number;
  results: SubmitResult[];
  motoristaName: string;
}

function ProgressScreen({ done, total, results, motoristaName }: ProgressScreenProps) {
  const isComplete = done >= total;
  const sucessos = results.filter((r) => r.success).length;
  const falhas = results.filter((r) => !r.success).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 py-4">
      {!isComplete ? (
        <>
          <div className="text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
              <Package className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <h3 className="text-base font-semibold">Lançando fretes...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {done} de {total} processados
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
          {results.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {results.map((r) => (
                <div
                  key={r.index}
                  className={cn(
                    "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
                    r.success
                      ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                  )}
                >
                  {r.success
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <XCircle className="h-4 w-4 shrink-0" />}
                  <span>Frete #{r.index + 1} — {r.success ? (r.codigoFrete || "✅ OK") : r.message}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // Tela de resultado final
        <>
          <div className="text-center">
            {falhas === 0 ? (
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 mb-3">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
            ) : (
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40 mb-3">
                <AlertTriangle className="h-7 w-7 text-yellow-600" />
              </div>
            )}
            <h3 className="text-base font-semibold">
              {falhas === 0
                ? `Sucesso! ${sucessos} frete${sucessos > 1 ? "s foram" : " foi"} lançado${sucessos > 1 ? "s" : ""}!`
                : `${sucessos} lançado${sucessos !== 1 ? "s" : ""}, ${falhas} falhou${falhas !== 1 ? "am" : ""}`}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Motorista: <span className="font-medium text-foreground">{motoristaName}</span>
            </p>
          </div>

          {/* Resumo dos resultados */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-green-50 dark:bg-green-950/20 border-green-200 p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{sucessos}</p>
              <p className="text-xs text-green-700 dark:text-green-300">Lançados</p>
            </div>
            <div className={cn("rounded-md border p-3 text-center", falhas > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200" : "bg-muted/30 border-muted")}>
              <p className={cn("text-2xl font-bold", falhas > 0 ? "text-destructive" : "text-muted-foreground")}>{falhas}</p>
              <p className={cn("text-xs", falhas > 0 ? "text-destructive/80" : "text-muted-foreground")}>Falharam</p>
            </div>
          </div>

          {/* Lista de resultados */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.index}
                className={cn(
                  "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
                  r.success
                    ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                )}
              >
                {r.success
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <XCircle className="h-4 w-4 shrink-0" />}
                <span>
                  Frete #{r.index + 1} — {r.success
                    ? <span className="font-mono text-xs">{r.codigoFrete || "OK"}</span>
                    : r.message}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function FreteLoteModal({
  isOpen, onClose, estoquesFazendas, motoristasState,
  caminhoesState, isSaving, onSubmitLote,
}: FreteLoteModalProps) {

  const [motoristaId, setMotoristaId] = useState("");
  const [caminhaoId, setCaminhaoId] = useState("");
  const [caminhoesDoMotorista, setCaminhoesDoMotorista] = useState<any[]>([]);
  const [carregandoCaminhoes, setCarregandoCaminhoes] = useState(false);
  const [erroCaminhoes, setErroCaminhoes] = useState("");
  const [motoristaError, setMotoristaError] = useState("");
  const [caminhaoError, setCaminhaoError] = useState("");
  const [fretes, setFretes] = useState<FreteItem[]>([makeItem()]);

  // Progresso
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressResults, setProgressResults] = useState<SubmitResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const resetAll = () => {
    setMotoristaId(""); setCaminhaoId(""); setCaminhoesDoMotorista([]);
    setCarregandoCaminhoes(false); setErroCaminhoes("");
    setMotoristaError(""); setCaminhaoError("");
    setFretes([makeItem()]);
    setIsProcessing(false); setProgressDone(0); setProgressTotal(0);
    setProgressResults([]); setIsComplete(false);
  };

  const handleClose = () => {
    if (isProcessing && !isComplete) return; // impede fechar durante processamento
    resetAll();
    onClose();
  };

  // Caminhões ao selecionar motorista
  const handleMotoristaChange = async (id: string) => {
    setMotoristaId(id); setCaminhaoId(""); setCaminhoesDoMotorista([]);
    setErroCaminhoes(""); setMotoristaError(""); setCarregandoCaminhoes(true);
    try {
      const { default: caminhoesService } = await import("@/services/caminhoes");
      const res = await caminhoesService.listarPorMotorista(id);
      if (res.success && res.data) {
        setCaminhoesDoMotorista(res.data);
        if (res.data.length === 0) setErroCaminhoes("Motorista sem caminhões vinculados");
        else if (res.data.length === 1) setCaminhaoId(String(res.data[0].id));
      } else {
        setErroCaminhoes("Motorista inválido");
      }
    } catch { setErroCaminhoes("Erro ao carregar caminhões"); }
    finally { setCarregandoCaminhoes(false); }
  };

  const handleChange = useCallback((localId: string, patch: Partial<FreteItem>) => {
    setFretes((prev) => prev.map((f) => (f.localId === localId ? { ...f, ...patch } : f)));
  }, []);

  const handleRemove = useCallback((localId: string) => {
    setFretes((prev) => prev.filter((f) => f.localId !== localId));
  }, []);

  const handleClone = useCallback((localId: string) => {
    setFretes((prev) => {
      const idx = prev.findIndex((f) => f.localId === localId);
      if (idx < 0) return prev;
      const base = prev[idx];
      const clone = makeItem({
        fazendaEstoqueId: base.fazendaEstoqueId,
        estoqueSelecionado: base.estoqueSelecionado,
        destino: base.destino,
        dataFrete: base.dataFrete,
        valorPorTonelada: base.valorPorTonelada,
      });
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  const handleAddFrete = () => {
    setFretes((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, makeItem({ destino: last?.destino || "" })];
    });
  };

  // Detecção de duplicatas dentro do lote
  const duplicateIds = new Set<string>();
  fretes.forEach((f, i) => {
    if (!f.fazendaEstoqueId || !f.dataFrete) return;
    const key = `${f.fazendaEstoqueId}_${f.dataFrete}`;
    const matches = fretes.filter((o, j) => j !== i && o.fazendaEstoqueId === f.fazendaEstoqueId && o.dataFrete === f.dataFrete);
    if (matches.length > 0) duplicateIds.add(f.localId);
  });

  const handleSubmit = async () => {
    let hasError = false;
    if (!motoristaId) { setMotoristaError("Selecione um motorista."); hasError = true; }
    if (!caminhaoId) { setCaminhaoError("Selecione um caminhão."); hasError = true; }

    const validatedFretes = fretes.map((f) => {
      const errors: Record<string, string> = {};
      if (!f.fazendaEstoqueId || !f.estoqueSelecionado) errors.fazendaEstoqueId = "Selecione a fazenda.";
      if (!f.destino) errors.destino = "Selecione o destino.";
      if (!f.dataFrete) errors.dataFrete = "Informe a data.";
      if (!f.toneladas || toNumber(f.toneladas) <= 0) errors.toneladas = "Informe o peso.";
      if (!f.valorPorTonelada || toNumber(f.valorPorTonelada) <= 0) errors.valorPorTonelada = "Informe o valor.";
      return { ...f, errors };
    });

    const hasFreteErrors = validatedFretes.some((f) => Object.keys(f.errors).length > 0);
    setFretes(validatedFretes);
    if (hasError || hasFreteErrors) return;

    // Iniciar processamento
    setIsProcessing(true);
    setProgressDone(0);
    setProgressTotal(fretes.length);
    setProgressResults([]);

    await onSubmitLote({
      motoristaId,
      caminhaoId,
      fretes: validatedFretes.map((f) => ({
        estoqueSelecionado: f.estoqueSelecionado!,
        destino: f.destino,
        dataFrete: f.dataFrete,
        ticket: f.ticket,
        toneladas: toNumber(f.toneladas),
        valorPorTonelada: toNumber(f.valorPorTonelada),
        numeroNotaFiscal: f.numeroNotaFiscal,
      })),
      onProgress: (done, total, result) => {
        setProgressDone(done);
        setProgressTotal(total);
        setProgressResults((prev) => [...prev, result]);
        if (done >= total) setIsComplete(true);
      },
    });

    setIsComplete(true);
    setIsProcessing(false);
  };

  // Totais acumulados
  const totalToneladas = fretes.reduce((s, f) => s + (f.toneladas ? toNumber(f.toneladas) : 0), 0);
  const totalReceita = fretes.reduce((s, f) => {
    return s + (f.toneladas && f.valorPorTonelada ? toNumber(f.toneladas) * toNumber(f.valorPorTonelada) : 0);
  }, 0);

  const motoristaName = motoristasState.find((m) => String(m.id) === String(motoristaId))?.nome || "";

  const showProgress = isProcessing || isComplete;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) handleClose(); }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            Lançar Fretes em Lote
            {!showProgress && (
              <Badge variant="secondary" className="ml-2">
                {fretes.length} {fretes.length === 1 ? "frete" : "fretes"}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ── Tela de progresso / resultado ── */}
        {showProgress ? (
          <ProgressScreen
            done={progressDone}
            total={progressTotal}
            results={progressResults}
            motoristaName={motoristaName}
          />
        ) : (
          <div className="space-y-4 max-h-[calc(90vh-220px)] overflow-y-auto px-1">

            {/* Motorista + Caminhão */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <h3 className="font-semibold text-sm">Equipe &amp; Veículo</h3>
                <Badge variant="outline" className="text-[10px]">compartilhado para todos os fretes</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-primary" />Motorista *</Label>
                  <Select value={motoristaId} onValueChange={handleMotoristaChange}>
                    <SelectTrigger className={cn(fieldErrorClass(motoristaError), "text-sm")}>
                      <SelectValue placeholder="Selecione um motorista" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {motoristasState.map((m) => {
                        const camFixo = caminhoesState.find((c) => c.motorista_fixo_id === m.id);
                        return (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.nome}{camFixo && <span className="text-xs text-muted-foreground ml-2">({camFixo.placa})</span>}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FieldError message={motoristaError} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-primary" />Caminhão *</Label>
                  {!motoristaId ? (
                    <div className={cn("flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground", caminhaoError && "border-red-500")}>Selecione um motorista primeiro</div>
                  ) : carregandoCaminhoes ? (
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">⏳ Carregando...</div>
                  ) : erroCaminhoes ? (
                    <div className="flex h-10 w-full items-center rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-sm text-red-600">❌ {erroCaminhoes}</div>
                  ) : caminhoesDoMotorista.length === 1 ? (
                    <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm", caminhaoError && "border-red-500")}>
                      <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><span className="font-medium">{caminhoesDoMotorista[0].placa}</span></div>
                      <span className="text-xs text-muted-foreground">Único</span>
                    </div>
                  ) : (
                    <Select value={caminhaoId} onValueChange={(v) => { setCaminhaoId(v); setCaminhaoError(""); }}>
                      <SelectTrigger className={cn(fieldErrorClass(caminhaoError), "text-sm")}><SelectValue placeholder="Selecione um caminhão" /></SelectTrigger>
                      <SelectContent>{caminhoesDoMotorista.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.placa}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  <FieldError message={caminhaoError} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Lista de fretes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-blue-600" />
                  <h3 className="font-semibold text-blue-600 text-sm">Fretes</h3>
                  {duplicateIds.size > 0 && (
                    <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {duplicateIds.size} duplicado{duplicateIds.size > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                {totalReceita > 0 && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {totalToneladas > 0 && (
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{totalToneladas.toFixed(3)} t</span>
                    )}
                    <span className="font-bold text-profit">
                      R$ {totalReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {fretes.map((item, idx) => (
                <FreteCard
                  key={item.localId}
                  item={item}
                  index={idx}
                  total={fretes.length}
                  estoquesFazendas={estoquesFazendas}
                  isDuplicate={duplicateIds.has(item.localId)}
                  onChange={handleChange}
                  onRemove={handleRemove}
                  onClone={handleClone}
                  disabled={isSaving}
                />
              ))}

              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={handleAddFrete}
                disabled={isSaving}
              >
                <Plus className="h-4 w-4" />
                Adicionar Frete #{fretes.length + 1}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          {isComplete ? (
            <Button onClick={handleClose} className="sm:ml-auto">
              Fechar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing} className="sm:mr-auto">
                Cancelar
              </Button>
              {!showProgress && (
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving || isProcessing}
                  className="gap-2 min-w-[180px]"
                >
                  {isSaving ? "Lançando..." : `Lançar ${fretes.length} ${fretes.length === 1 ? "Frete" : "Fretes"}`}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
