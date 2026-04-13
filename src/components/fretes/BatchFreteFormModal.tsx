import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select";
import { DatePicker } from "@/components/shared/DatePicker";
import { FieldError } from "@/components/shared/FieldError";
import { fieldErrorClass, toNumber, getTodayInputDate } from "@/utils/formatters";
import { parseLocalInputDate } from "@/utils/formatters";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Plus,
    Trash2,
    Truck,
    MapPin,
    Weight,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Package,
    Info,
    Layers,
} from "lucide-react";
import { toast } from "sonner";
import * as fretesService from "@/services/fretes";
import fazendasService from "@/services/fazendas";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface EstoqueFazenda {
    id: string;
    fazendaId?: string;
    fazenda: string;
    estado: string;
    mercadoria: string;
    variedade: string;
    quantidadeSacas: number;
    quantidadeInicial: number;
    precoPorTonelada: number;
    pesoMedioSaca: number;
    safra: string;
    colheitaFinalizada?: boolean;
}

interface BatchFreteItem {
    /** UUID local para rastrear o item na lista */
    _id: string;
    fazendaId: string;
    destino: string;
    dataFrete: string;
    toneladas: string;
    valorPorTonelada: string;
    ticket: string;
    numeroNotaFiscal: string;
    /** Estoque selecionado para o item (resolve dados de fazenda) */
    estoque: EstoqueFazenda | null;
}

interface BatchItemErrors {
    fazendaId?: string;
    destino?: string;
    dataFrete?: string;
    toneladas?: string;
    valorPorTonelada?: string;
}

/** Estado de um item durante o envio ao backend */
type ItemStatus = "idle" | "sending" | "success" | "error";

interface ItemSubmitState {
    status: ItemStatus;
    message?: string;
}

interface BatchFreteFormModalProps {
    isOpen: boolean;
    estoquesFazendas: EstoqueFazenda[];
    motoristasState: any[];
    caminhoesState: any[];
    onClose: () => void;
    onSuccess: () => void;
    /** Carrega os caminhões de um motorista - mesma lógica do modal individual */
    onLoadCaminhoes: (motoristaId: string) => Promise<any[]>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const createEmptyItem = (base?: Partial<BatchFreteItem>): BatchFreteItem => ({
    _id: crypto.randomUUID(),
    fazendaId: base?.fazendaId ?? "",
    destino: base?.destino ?? "",
    dataFrete: base?.dataFrete ?? getTodayInputDate(),
    toneladas: "",
    valorPorTonelada: base?.valorPorTonelada ?? "",
    ticket: "",
    numeroNotaFiscal: "",
    estoque: base?.estoque ?? null,
});

const normalizeFazendaNome = (nome: string) => {
    if (!nome) return "";
    const parts = nome.split(" - ");
    if (parts.length > 1 && parts[0].trim().toLowerCase().startsWith("fazenda")) {
        return parts[0].trim();
    }
    return nome;
};

const isEmpty = (v: any): boolean =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "");

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

function validateItem(item: BatchFreteItem): BatchItemErrors {
    const errors: BatchItemErrors = {};

    if (isEmpty(item.fazendaId) || !item.estoque) {
        errors.fazendaId = "Selecione a fazenda de origem.";
    }
    if (isEmpty(item.destino)) {
        errors.destino = "Informe o destino do frete.";
    }
    if (isEmpty(item.dataFrete)) {
        errors.dataFrete = "Informe a data do frete.";
    }
    if (isEmpty(item.toneladas)) {
        errors.toneladas = "Informe o peso em toneladas.";
    } else {
        const ton = toNumber(item.toneladas);
        if (isNaN(ton) || ton <= 0) {
            errors.toneladas = "Peso deve ser maior que zero.";
        }
    }
    if (isEmpty(item.valorPorTonelada)) {
        errors.valorPorTonelada = "Informe o valor por tonelada.";
    } else {
        const vpt = toNumber(item.valorPorTonelada);
        if (isNaN(vpt) || vpt <= 0) {
            errors.valorPorTonelada = "Valor deve ser maior que zero.";
        }
    }

    return errors;
}

function hasErrors(errors: BatchItemErrors): boolean {
    return Object.values(errors).some(Boolean);
}

// ─────────────────────────────────────────────
// Sub-component: FreteItemCard
// ─────────────────────────────────────────────

interface FreteItemCardProps {
    index: number;
    item: BatchFreteItem;
    errors: BatchItemErrors;
    submitState: ItemSubmitState;
    estoquesFazendas: EstoqueFazenda[];
    isSending: boolean;
    canRemove: boolean;
    onChange: (id: string, patch: Partial<BatchFreteItem>) => void;
    onRemove: (id: string) => void;
    onClearError: (id: string, field: keyof BatchItemErrors) => void;
}

function FreteItemCard({
    index,
    item,
    errors,
    submitState,
    estoquesFazendas,
    isSending,
    canRemove,
    onChange,
    onRemove,
    onClearError,
}: FreteItemCardProps) {
    const isDisabled = isSending;

    // Border color based on submit state
    const borderClass =
        submitState.status === "success"
            ? "border-green-400 dark:border-green-600"
            : submitState.status === "error"
                ? "border-red-400 dark:border-red-600"
                : "border-border";

    return (
        <Card className={cn("relative transition-colors", borderClass)}>
            <CardContent className="p-4 space-y-4">
                {/* Item header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                        </div>
                        <span className="font-semibold text-sm text-foreground">
                            Frete #{index + 1}
                        </span>
                        {submitState.status === "success" && (
                            <Badge variant="success" className="text-xs gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Enviado
                            </Badge>
                        )}
                        {submitState.status === "error" && (
                            <Badge variant="destructive" className="text-xs gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Erro
                            </Badge>
                        )}
                        {submitState.status === "sending" && (
                            <Badge variant="secondary" className="text-xs gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Enviando...
                            </Badge>
                        )}
                    </div>
                    {canRemove && !isSending && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onRemove(item._id)}
                            aria-label={`Remover frete ${index + 1}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Error message from backend */}
                {submitState.status === "error" && submitState.message && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{submitState.message}</span>
                    </div>
                )}

                {/* Row 1: Fazenda + Destino */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Fazenda */}
                    <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-green-600" />
                            Fazenda de Origem *
                        </Label>
                        <Select
                            value={item.fazendaId}
                            onValueChange={(v) => {
                                const estoque = estoquesFazendas.find((e) => String(e.id) === String(v));
                                onChange(item._id, {
                                    fazendaId: String(estoque?.fazendaId || v),
                                    estoque: estoque || null,
                                    valorPorTonelada: estoque
                                        ? new Intl.NumberFormat("pt-BR", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }).format(estoque.precoPorTonelada)
                                        : item.valorPorTonelada,
                                });
                                onClearError(item._id, "fazendaId");
                            }}
                            disabled={isDisabled || submitState.status === "success"}
                        >
                            <SelectTrigger
                                className={cn("h-9 text-xs", fieldErrorClass(errors.fazendaId))}
                            >
                                <SelectValue placeholder="Selecione a fazenda" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56 overflow-y-auto">
                                {estoquesFazendas.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                        Nenhuma fazenda disponível
                                    </SelectItem>
                                ) : (
                                    (() => {
                                        const grouped = estoquesFazendas.reduce(
                                            (acc, e) => {
                                                if (!acc[e.estado]) acc[e.estado] = [];
                                                acc[e.estado].push(e);
                                                return acc;
                                            },
                                            {} as Record<string, typeof estoquesFazendas>
                                        );
                                        const estadosOrdenados = [
                                            "SP",
                                            "MS",
                                            ...Object.keys(grouped).filter(
                                                (e) => e !== "SP" && e !== "MS"
                                            ),
                                        ];
                                        return estadosOrdenados
                                            .filter((e) => e in grouped)
                                            .map((estado) => (
                                                <SelectGroup key={estado}>
                                                    <SelectLabel className="font-semibold text-primary text-xs">
                                                        {estado}
                                                    </SelectLabel>
                                                    {grouped[estado].map((e) => (
                                                        <SelectItem
                                                            key={e.id}
                                                            value={String(e.id)}
                                                            className="text-xs"
                                                        >
                                                            {normalizeFazendaNome(e.fazenda)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ));
                                    })()
                                )}
                            </SelectContent>
                        </Select>
                        <FieldError message={errors.fazendaId} />
                        {item.estoque && (
                            <p className="text-[10px] text-green-600">
                                ✓ {item.estoque.mercadoria} — R${" "}
                                {item.estoque.precoPorTonelada.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                })}
                                /ton
                            </p>
                        )}
                    </div>

                    {/* Destino */}
                    <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            Destino *
                        </Label>
                        <Select
                            value={item.destino}
                            onValueChange={(v) => {
                                onChange(item._id, { destino: v });
                                onClearError(item._id, "destino");
                            }}
                            disabled={isDisabled || submitState.status === "success"}
                        >
                            <SelectTrigger
                                className={cn("h-9 text-xs", fieldErrorClass(errors.destino))}
                            >
                                <SelectValue placeholder="Selecione o destino" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Filial 1 - Secagem e Armazenagem" className="text-xs">
                                    Filial 1 - Secagem e Armazenagem
                                </SelectItem>
                                <SelectItem
                                    value="Fazenda Santa Rosa - Secagem e Armazenagem"
                                    className="text-xs"
                                >
                                    Fazenda Santa Rosa - Secagem e Armazenagem
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <FieldError message={errors.destino} />
                    </div>
                </div>

                {/* Row 2: Data + Toneladas + Valor/ton */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Data */}
                    <div className="space-y-1.5">
                        <Label className="text-xs">Data do Frete *</Label>
                        <DatePicker
                            value={
                                item.dataFrete ? parseLocalInputDate(item.dataFrete) : undefined
                            }
                            onChange={(date) => {
                                if (!date) return;
                                onChange(item._id, {
                                    dataFrete: format(date, "yyyy-MM-dd"),
                                });
                                onClearError(item._id, "dataFrete");
                            }}
                            disabledDays={(date) => date > new Date()}
                            buttonClassName={cn("h-9 text-xs", fieldErrorClass(errors.dataFrete))}
                            disabled={isDisabled || submitState.status === "success"}
                        />
                        <FieldError message={errors.dataFrete} />
                    </div>

                    {/* Toneladas */}
                    <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5">
                            <Weight className="h-3.5 w-3.5 text-blue-600" />
                            Peso (toneladas) *
                        </Label>
                        <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                t
                            </span>
                            <Input
                                placeholder="Ex: 20.555"
                                className={cn(
                                    "pl-7 h-9 text-xs",
                                    fieldErrorClass(errors.toneladas)
                                )}
                                value={item.toneladas}
                                disabled={isDisabled || !item.estoque || submitState.status === "success"}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, "");
                                    if (!digits) {
                                        onChange(item._id, { toneladas: "" });
                                        return;
                                    }
                                    const formatted =
                                        digits.length > 3
                                            ? `${digits.slice(0, -3)}.${digits.slice(-3)}`
                                            : digits;
                                    onChange(item._id, { toneladas: formatted });
                                    onClearError(item._id, "toneladas");
                                }}
                            />
                        </div>
                        <FieldError message={errors.toneladas} />
                        {item.estoque && item.toneladas && !errors.toneladas && (
                            <p className="text-[10px] text-blue-600">
                                ≈{" "}
                                {Math.round(
                                    (toNumber(item.toneladas) * 1000) / item.estoque.pesoMedioSaca
                                ).toLocaleString("pt-BR")}{" "}
                                sacas
                            </p>
                        )}
                    </div>

                    {/* Valor por tonelada */}
                    <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-green-600" />
                            Valor/ton *
                        </Label>
                        <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                R$
                            </span>
                            <Input
                                placeholder="0,00"
                                className={cn(
                                    "pl-8 h-9 text-xs",
                                    fieldErrorClass(errors.valorPorTonelada)
                                )}
                                value={item.valorPorTonelada}
                                disabled={isDisabled || !item.estoque || submitState.status === "success"}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, "");
                                    if (!digits) {
                                        onChange(item._id, { valorPorTonelada: "" });
                                        return;
                                    }
                                    const valueNum = parseInt(digits, 10) / 100;
                                    const formatted = new Intl.NumberFormat("pt-BR", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    }).format(valueNum);
                                    onChange(item._id, { valorPorTonelada: formatted });
                                    onClearError(item._id, "valorPorTonelada");
                                }}
                            />
                        </div>
                        <FieldError message={errors.valorPorTonelada} />
                    </div>
                </div>

                {/* Row 3: Ticket + Nota Fiscal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            Ticket (balança)
                        </Label>
                        <Input
                            placeholder="0123"
                            className="h-9 text-xs"
                            value={item.ticket}
                            disabled={isDisabled || submitState.status === "success"}
                            onChange={(e) => onChange(item._id, { ticket: e.target.value })}
                        />
                    </div>
                    {item.estoque?.estado === "MS" && (
                        <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                Nº Nota Fiscal
                            </Label>
                            <Input
                                placeholder="12.345.678"
                                className="h-9 text-xs"
                                value={item.numeroNotaFiscal}
                                disabled={isDisabled || submitState.status === "success"}
                                onChange={(e) =>
                                    onChange(item._id, { numeroNotaFiscal: e.target.value })
                                }
                            />
                        </div>
                    )}
                </div>

                {/* Estimated receipt */}
                {item.estoque && item.toneladas && item.valorPorTonelada && !errors.toneladas && !errors.valorPorTonelada && (
                    <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-2 flex items-center justify-between">
                        <span className="text-xs text-blue-700 dark:text-blue-300">Receita estimada:</span>
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                            R${" "}
                            {(
                                toNumber(item.toneladas) * toNumber(item.valorPorTonelada)
                            ).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─────────────────────────────────────────────
// Main component: BatchFreteFormModal
// ─────────────────────────────────────────────

export function BatchFreteFormModal({
    isOpen,
    estoquesFazendas,
    motoristasState,
    caminhoesState,
    onClose,
    onSuccess,
    onLoadCaminhoes,
}: BatchFreteFormModalProps) {
    // ── Motorista / Caminhão state ──────────────────────────────────────
    const [motoristaId, setMotoristaId] = useState("");
    const [caminhaoId, setCaminhaoId] = useState("");
    const [caminhoesDoMotorista, setCaminhoesDoMotorista] = useState<any[]>([]);
    const [carregandoCaminhoes, setCarregandoCaminhoes] = useState(false);
    const [erroMotoristaId, setErroMotoristaId] = useState("");
    const [erroCaminhaoId, setErroCaminhaoId] = useState("");

    // ── Items state ─────────────────────────────────────────────────────
    const [items, setItems] = useState<BatchFreteItem[]>([createEmptyItem()]);
    const [itemErrors, setItemErrors] = useState<Record<string, BatchItemErrors>>({});
    const [submitStates, setSubmitStates] = useState<Record<string, ItemSubmitState>>({});

    // ── Sending control ─────────────────────────────────────────────────
    const [isSending, setIsSending] = useState(false);
    const [isDone, setIsDone] = useState(false);

    // ── Summary after send ──────────────────────────────────────────────
    const [summary, setSummary] = useState<{
        success: number;
        errors: number;
    } | null>(null);

    // ─────────────────────────────────
    // Reset on close
    // ─────────────────────────────────
    const handleClose = () => {
        if (isSending) return;
        // Reset all state
        setMotoristaId("");
        setCaminhaoId("");
        setCaminhoesDoMotorista([]);
        setCarregandoCaminhoes(false);
        setErroMotoristaId("");
        setErroCaminhaoId("");
        setItems([createEmptyItem()]);
        setItemErrors({});
        setSubmitStates({});
        setIsSending(false);
        setIsDone(false);
        setSummary(null);
        onClose();
    };

    // ─────────────────────────────────
    // Motorista selection
    // ─────────────────────────────────
    const handleMotoristaChange = async (id: string) => {
        setMotoristaId(id);
        setCaminhaoId("");
        setCaminhoesDoMotorista([]);
        setErroCaminhaoId("");
        setErroMotoristaId("");

        if (!id) return;
        setCarregandoCaminhoes(true);
        try {
            const trucks = await onLoadCaminhoes(id);
            setCaminhoesDoMotorista(trucks);
            if (trucks.length === 0) {
                setErroCaminhaoId("Motorista sem caminhões vinculados.");
            } else if (trucks.length === 1) {
                setCaminhaoId(String(trucks[0].id));
            }
        } catch {
            setErroCaminhaoId("Erro ao carregar caminhões. Tente novamente.");
        } finally {
            setCarregandoCaminhoes(false);
        }
    };

    // ─────────────────────────────────
    // Item CRUD
    // ─────────────────────────────────
    const handleAddItem = () => {
        const last = items[items.length - 1];
        // Pre-fill next item with the last item's non-quantity fields
        const newItem = createEmptyItem({
            fazendaId: last.fazendaId,
            destino: last.destino,
            dataFrete: last.dataFrete,
            valorPorTonelada: last.valorPorTonelada,
            estoque: last.estoque,
        });
        setItems((prev) => [...prev, newItem]);
    };

    const handleRemoveItem = (id: string) => {
        setItems((prev) => prev.filter((i) => i._id !== id));
        setItemErrors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setSubmitStates((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleItemChange = useCallback(
        (id: string, patch: Partial<BatchFreteItem>) => {
            setItems((prev) =>
                prev.map((item) => (item._id === id ? { ...item, ...patch } : item))
            );
        },
        []
    );

    const handleClearError = useCallback(
        (id: string, field: keyof BatchItemErrors) => {
            setItemErrors((prev) => {
                const existing = prev[id];
                if (!existing || !existing[field]) return prev;
                return { ...prev, [id]: { ...existing, [field]: undefined } };
            });
        },
        []
    );

    // ─────────────────────────────────
    // PHASE 1: Validate all items before sending
    // ─────────────────────────────────
    const validateAll = (): boolean => {
        let hasAnyError = false;

        // Validate motorista and caminhao
        if (!motoristaId) {
            setErroMotoristaId("Selecione um motorista.");
            hasAnyError = true;
        }
        if (!caminhaoId) {
            setErroCaminhaoId("Selecione um caminhão.");
            hasAnyError = true;
        }

        // Validate each item
        const nextErrors: Record<string, BatchItemErrors> = {};
        for (const item of items) {
            const errors = validateItem(item);
            nextErrors[item._id] = errors;
            if (hasErrors(errors)) hasAnyError = true;
        }
        setItemErrors(nextErrors);
        return !hasAnyError;
    };

    // ─────────────────────────────────
    // PHASE 2: Send each item individually (only after validation passes)
    // ─────────────────────────────────
    const handleSendBatch = async () => {
        if (isSending) return;

        // ── Step 1: full client-side validation ──
        const isValid = validateAll();
        if (!isValid) {
            toast.error("⚠️ Corrija os erros antes de enviar.", {
                description: "Verifique os campos destacados em vermelho.",
            });
            return;
        }

        // ── Step 2: resolve motorista and truck references ──
        const motorista = motoristasState.find((m) => String(m.id) === String(motoristaId));
        const caminhao =
            caminhoesState.find((c) => String(c.id) === String(caminhaoId)) ||
            caminhoesDoMotorista.find((c) => String(c.id) === String(caminhaoId));

        if (!motorista) {
            setErroMotoristaId("Motorista não encontrado. Selecione novamente.");
            return;
        }
        if (!caminhao) {
            setErroCaminhaoId("Caminhão não encontrado. Selecione novamente.");
            return;
        }

        // ── Step 3: Start sending ──
        setIsSending(true);

        const toUpper = (v: string) => v.trim().toUpperCase();
        const toUpperOrUndefined = (v?: string | null) => {
            const t = (v ?? "").trim();
            return t ? t.toUpperCase() : undefined;
        };

        let successCount = 0;
        let errorCount = 0;

        // Send items one-by-one in sequence so the user can follow progress per item
        for (const item of items) {
            // Mark as sending
            setSubmitStates((prev) => ({
                ...prev,
                [item._id]: { status: "sending" },
            }));

            const estoque = item.estoque!; // Already validated as non-null above
            const toneladas = toNumber(item.toneladas);
            const valorPorTonelada = toNumber(item.valorPorTonelada);
            const quantidadeSacas = Math.round((toneladas * 1000) / estoque.pesoMedioSaca);
            const receita = toneladas * valorPorTonelada;

            const payload = {
                origem: toUpper(`${estoque.fazenda} - ${estoque.estado}`),
                destino: toUpper(item.destino),
                motorista_id: String(motorista.id),
                motorista_nome: toUpper(motorista.nome),
                caminhao_id: String(caminhao.id),
                caminhao_placa: toUpper(caminhao.placa),
                fazenda_id: String(item.fazendaId),
                fazenda_nome: toUpper(estoque.fazenda),
                mercadoria: toUpper(estoque.mercadoria),
                mercadoria_id: String(estoque.id),
                variedade: toUpperOrUndefined(estoque.variedade),
                data_frete: item.dataFrete || getTodayInputDate(),
                quantidade_sacas: quantidadeSacas,
                toneladas,
                valor_por_tonelada: valorPorTonelada,
                custos: 0,
                resultado: receita,
                ticket: item.ticket || null,
                numero_nota_fiscal: item.numeroNotaFiscal || null,
            };

            try {
                const res = await fretesService.criarFrete(payload);

                if (res.success) {
                    // Update stock of the fazenda (non-blocking, errors are tolerated)
                    fazendasService
                        .incrementarVolumeTransportado(
                            String(item.fazendaId),
                            toneladas,
                            quantidadeSacas,
                            receita
                        )
                        .catch(() => {
                            // Silent fail — frete was already created, stock update is secondary
                        });

                    setSubmitStates((prev) => ({
                        ...prev,
                        [item._id]: { status: "success" },
                    }));
                    successCount++;
                } else {
                    setSubmitStates((prev) => ({
                        ...prev,
                        [item._id]: {
                            status: "error",
                            message: res.message || "Erro ao criar frete no servidor.",
                        },
                    }));
                    errorCount++;
                }
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Erro inesperado ao enviar frete.";
                setSubmitStates((prev) => ({
                    ...prev,
                    [item._id]: { status: "error", message },
                }));
                errorCount++;
            }
        }

        // ── Step 4: Finalize ──
        setIsSending(false);
        setIsDone(true);
        setSummary({ success: successCount, errors: errorCount });

        if (errorCount === 0) {
            toast.success(
                `✅ ${successCount} frete${successCount > 1 ? "s" : ""} lançado${successCount > 1 ? "s" : ""} com sucesso!`,
                { description: "Todos os registros foram salvos individualmente no sistema." }
            );
            onSuccess();
            // Auto-close only when everything succeeded
            setTimeout(handleClose, 1500);
        } else if (successCount > 0) {
            toast.warning(
                `⚠️ ${successCount} enviado${successCount > 1 ? "s" : ""}, ${errorCount} com erro`,
                {
                    description:
                        "Os fretes com erro estão marcados em vermelho. Corrija e reenvie se necessário.",
                }
            );
            onSuccess(); // Refresh list even with partial success
        } else {
            toast.error("❌ Nenhum frete foi enviado.", {
                description: "Verifique os erros exibidos abaixo e tente novamente.",
            });
        }
    };

    // ─────────────────────────────────
    // Derived state helpers
    // ─────────────────────────────────
    const totalReceita = items.reduce((acc, item) => {
        if (!item.toneladas || !item.valorPorTonelada) return acc;
        return acc + toNumber(item.toneladas) * toNumber(item.valorPorTonelada);
    }, 0);

    const successItems = Object.values(submitStates).filter((s) => s.status === "success").length;
    const errorItems = Object.values(submitStates).filter((s) => s.status === "error").length;
    const pendingItems = items.filter(
        (i) => !submitStates[i._id] || submitStates[i._id].status === "idle"
    ).length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-bold">Lançamento em Lote</p>
                            <p className="text-xs text-muted-foreground font-normal">
                                Cada frete será salvo individualmente no sistema
                            </p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                                {items.length} frete{items.length > 1 ? "s" : ""}
                            </Badge>
                            {totalReceita > 0 && (
                                <Badge variant="outline" className="text-xs font-bold text-green-600 border-green-300">
                                    R$ {totalReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </Badge>
                            )}
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {/* ── Motorista & Caminhão header ── */}
                    <Card className="bg-muted/40">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Truck className="h-4 w-4 text-primary" />
                                <p className="font-semibold text-sm">Motorista e Caminhão</p>
                                <span className="text-xs text-muted-foreground">(aplicado a todos os fretes)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Motorista */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Motorista *</Label>
                                    <Select
                                        value={motoristaId}
                                        onValueChange={handleMotoristaChange}
                                        disabled={isSending}
                                    >
                                        <SelectTrigger
                                            className={cn("h-9 text-xs", erroMotoristaId && "border-red-500")}
                                        >
                                            <SelectValue placeholder="Selecione um motorista" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-64 overflow-y-auto">
                                            {motoristasState.map((m) => {
                                                const caminhaoFixo = caminhoesState.find(
                                                    (c) => c.motorista_fixo_id === m.id
                                                );
                                                return (
                                                    <SelectItem key={m.id} value={m.id} className="text-xs">
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
                                    {erroMotoristaId && (
                                        <p className="text-xs text-destructive">{erroMotoristaId}</p>
                                    )}
                                </div>

                                {/* Caminhão */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Caminhão *</Label>
                                    {!motoristaId ? (
                                        <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-xs text-muted-foreground">
                                            Selecione um motorista primeiro
                                        </div>
                                    ) : carregandoCaminhoes ? (
                                        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-xs text-muted-foreground">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Carregando caminhões...
                                        </div>
                                    ) : caminhoesDoMotorista.length === 1 ? (
                                        <div className="flex h-9 items-center justify-between rounded-md border border-input bg-muted/50 px-3 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Truck className="h-3.5 w-3.5 text-primary" />
                                                <span className="font-medium">
                                                    {caminhoesDoMotorista[0].placa}
                                                </span>
                                            </div>
                                            <span className="text-muted-foreground">Único</span>
                                        </div>
                                    ) : caminhoesDoMotorista.length > 1 ? (
                                        <Select
                                            value={caminhaoId}
                                            onValueChange={(v) => {
                                                setCaminhaoId(v);
                                                setErroCaminhaoId("");
                                            }}
                                            disabled={isSending}
                                        >
                                            <SelectTrigger
                                                className={cn(
                                                    "h-9 text-xs",
                                                    erroCaminhaoId && "border-red-500"
                                                )}
                                            >
                                                <SelectValue placeholder="Selecione um caminhão" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {caminhoesDoMotorista.map((c) => (
                                                    <SelectItem
                                                        key={c.id}
                                                        value={String(c.id)}
                                                        className="text-xs"
                                                    >
                                                        {c.placa}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex h-9 items-center rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 px-3 text-xs text-destructive">
                                            {erroCaminhaoId || "Nenhum caminhão disponível"}
                                        </div>
                                    )}
                                    {erroCaminhaoId && caminhoesDoMotorista.length !== 0 && (
                                        <p className="text-xs text-destructive">{erroCaminhaoId}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Separator />

                    {/* ── Result summary (shown after done) ── */}
                    {isDone && summary && (
                        <div
                            className={cn(
                                "rounded-lg border p-3 flex items-center gap-3 text-sm",
                                summary.errors === 0
                                    ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                                    : summary.success > 0
                                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                                        : "bg-destructive/10 border-destructive/30 text-destructive"
                            )}
                        >
                            {summary.errors === 0 ? (
                                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            )}
                            <div>
                                <p className="font-semibold">
                                    {summary.errors === 0
                                        ? "Lote enviado com sucesso!"
                                        : `${summary.success} enviado(s) · ${summary.errors} com erro`}
                                </p>
                                {summary.errors > 0 && (
                                    <p className="text-xs opacity-80">
                                        Os fretes com erro estão marcados abaixo. Corrija-os e clique em
                                        "Reenviar erros" se necessário.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Frete items list ── */}
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <FreteItemCard
                                key={item._id}
                                index={index}
                                item={item}
                                errors={itemErrors[item._id] ?? {}}
                                submitState={submitStates[item._id] ?? { status: "idle" }}
                                estoquesFazendas={estoquesFazendas}
                                isSending={isSending}
                                canRemove={items.length > 1}
                                onChange={handleItemChange}
                                onRemove={handleRemoveItem}
                                onClearError={handleClearError}
                            />
                        ))}
                    </div>

                    {/* Add new item */}
                    {!isSending && !(isDone && errorItems === 0) && (
                        <Button
                            variant="outline"
                            className="w-full border-dashed gap-2 text-muted-foreground hover:text-foreground hover:border-primary"
                            onClick={handleAddItem}
                        >
                            <Plus className="h-4 w-4" />
                            Adicionar Frete #{items.length + 1}
                        </Button>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 pb-6 pt-4 border-t flex-shrink-0 flex-col sm:flex-row gap-2">
                    {/* Progress indicator */}
                    {isSending && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Enviando {successItems + errorItems + 1}/{items.length}...
                        </div>
                    )}
                    {isDone && summary && !isSending && (
                        <div className="flex items-center gap-3 mr-auto text-xs">
                            {summary.success > 0 && (
                                <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {summary.success} enviado{summary.success > 1 ? "s" : ""}
                                </span>
                            )}
                            {summary.errors > 0 && (
                                <span className="flex items-center gap-1 text-destructive">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {summary.errors} com erro
                                </span>
                            )}
                        </div>
                    )}

                    <Button variant="outline" onClick={handleClose} disabled={isSending}>
                        {isDone && errorItems === 0 ? "Fechar" : "Cancelar"}
                    </Button>

                    {/* Main action button */}
                    {!isDone ? (
                        <Button
                            onClick={handleSendBatch}
                            disabled={isSending}
                            className="gap-2 min-w-36"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Package className="h-4 w-4" />
                                    Lançar {items.length} Frete{items.length > 1 ? "s" : ""}
                                </>
                            )}
                        </Button>
                    ) : (
                        errorItems > 0 && (
                            <Button
                                onClick={handleSendBatch}
                                variant="destructive"
                                disabled={isSending}
                                className="gap-2"
                            >
                                <AlertCircle className="h-4 w-4" />
                                Reenviar {errorItems} com erro
                            </Button>
                        )
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
