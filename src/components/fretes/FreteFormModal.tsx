import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/shared/DatePicker";
import { FieldError } from "@/components/shared/FieldError";
import { fieldErrorClass, toNumber, getTodayInputDate } from "@/utils/formatters";
import { ModalSubmitFooter } from "@/components/shared/ModalSubmitFooter";
import { Package, MapPin, Info, CalendarIcon, Truck, Weight, DollarSign } from "lucide-react";
import { parseLocalInputDate } from "@/utils/formatters";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Helper retirado da página
const normalizeFazendaNome = (nome: string) => {
    if (!nome) return "";
    const parts = nome.split(" - ");
    if (parts.length > 1) {
        const mainName = parts[0].trim();
        if (mainName.toLowerCase().startsWith("fazenda")) {
            return mainName;
        }
    }
    return nome;
};

interface FormErrors {
    fazendaId: string;
    destino: string;
    motoristaId: string;
    caminhaoId: string;
    dataFrete: string;
    toneladas: string;
    valorPorTonelada: string;
    ticket: string;
}

interface FreteFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    isSaving: boolean;
    isShaking: boolean;
    newFrete: any; // Type defined in the parent
    setNewFrete: (frete: any) => void;
    formErrors: FormErrors;
    clearFormError: (field: keyof FormErrors) => void;
    resetFormErrors: () => void;
    estoquesFazendas: any[];
    estoqueSelecionado: any | null;
    setEstoqueSelecionado: (estoque: any | null) => void;
    motoristasState: any[];
    caminhoesState: any[];
    caminhoesDoMotorista: any[];
    carregandoCaminhoes: boolean;
    erroCaminhoes: string;
    handleMotoristaChange: (motoristaId: string) => void;
    handleSaveFrete: () => void;
    onClose: () => void;
}

export function FreteFormModal({
    isOpen,
    isEditing,
    isSaving,
    isShaking,
    newFrete,
    setNewFrete,
    formErrors,
    clearFormError,
    resetFormErrors,
    estoquesFazendas,
    estoqueSelecionado,
    setEstoqueSelecionado,
    motoristasState,
    caminhoesState,
    caminhoesDoMotorista,
    carregandoCaminhoes,
    erroCaminhoes,
    handleMotoristaChange,
    handleSaveFrete,
    onClose,
}: FreteFormModalProps) {

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (isSaving) return;
                if (!open) {
                    onClose();
                    resetFormErrors();
                }
            }}
        >
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        {isEditing ? "Editar Frete" : "Criar Novo Frete"}
                    </DialogTitle>
                </DialogHeader>

                <div className={cn("space-y-3 max-h-[calc(90vh-200px)] overflow-y-auto px-1", isShaking && "animate-shake")}>
                    {/* Seção: Fazenda de Origem */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
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
                                        const estoque = estoquesFazendas.find(e => String(e.id) === String(v));
                                        setEstoqueSelecionado(estoque || null);
                                        setNewFrete({
                                            ...newFrete,
                                            fazendaId: String(estoque?.fazendaId || v),
                                            valorPorTonelada: estoque ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(estoque.precoPorTonelada) : ""
                                        });
                                        clearFormError("fazendaId");
                                    }}
                                    onOpenChange={(open) => {
                                        if (open) clearFormError("fazendaId");
                                    }}
                                >
                                    <SelectTrigger
                                        id="fazenda"
                                        className={cn(fieldErrorClass(formErrors.fazendaId))}
                                    >
                                        <SelectValue placeholder="Selecione a fazenda produtora" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-64 overflow-y-auto">
                                        {!Array.isArray(estoquesFazendas) || estoquesFazendas.length === 0 ? (
                                            <SelectItem value="none" disabled>Nenhuma fazenda cadastrada</SelectItem>
                                        ) : (
                                            (() => {
                                                const grouped = estoquesFazendas.reduce((acc, e) => {
                                                    if (!acc[e.estado]) {
                                                        acc[e.estado] = [];
                                                    }
                                                    acc[e.estado].push(e);
                                                    return acc;
                                                }, {} as Record<string, typeof estoquesFazendas>);

                                                const estadosOrdenados = ['SP', 'MS', ...Object.keys(grouped).filter(e => e !== 'SP' && e !== 'MS')];

                                                return estadosOrdenados
                                                    .filter(estado => estado in grouped)
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
                                <FieldError message={formErrors.fazendaId} />
                            </div>

                            {estoqueSelecionado && (
                                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 dark:from-green-950/20 dark:to-green-900/10 dark:border-green-800">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Info className="h-4 w-4 text-green-600" />
                                            <p className="text-sm font-semibold text-green-700 dark:text-green-300">Informações da Fazenda Selecionada</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Estado:</p>
                                                <p className="font-medium">{estoqueSelecionado.estado}</p>
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
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    <Separator className="my-1" />

                    {/* Seção: Destino */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
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
                                onValueChange={(v) => {
                                    setNewFrete({ ...newFrete, destino: v });
                                    clearFormError("destino");
                                }}
                                onOpenChange={(open) => {
                                    if (open) clearFormError("destino");
                                }}
                            >
                                <SelectTrigger
                                    id="destino"
                                    className={cn(fieldErrorClass(formErrors.destino))}
                                >
                                    <SelectValue placeholder="Selecione o local de entrega" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Filial 1 - Secagem e Armazenagem">Filial 1 - Secagem e Armazenagem</SelectItem>
                                    <SelectItem value="Fazenda Santa Rosa - Secagem e Armazenagem">Fazenda Santa Rosa - Secagem e Armazenagem</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError message={formErrors.destino} />
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="data-frete" className="flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                        Data do Frete *
                                    </Label>
                                    <DatePicker
                                        id="data-frete"
                                        value={newFrete.dataFrete ? parseLocalInputDate(newFrete.dataFrete) : undefined}
                                        onChange={(date) => {
                                            if (!date) return;
                                            setNewFrete({ ...newFrete, dataFrete: format(date, "yyyy-MM-dd") });
                                            clearFormError("dataFrete");
                                        }}
                                        onOpenChange={(open) => {
                                            if (open) clearFormError("dataFrete");
                                        }}
                                        disabledDays={(date) => date > new Date()}
                                        buttonClassName={cn(fieldErrorClass(formErrors.dataFrete))}
                                    />
                                    <FieldError message={formErrors.dataFrete} />
                                </div>
                                <div className="space-y-2 pt-1">
                                    <Label htmlFor="ticket-frete" className="flex items-center gap-2">
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                        Ticket (balança)
                                    </Label>
                                    <Input
                                        id="ticket-frete"
                                        placeholder="0123"
                                        className={cn(fieldErrorClass(formErrors.ticket))}
                                        value={newFrete.ticket}
                                        onChange={(e) => {
                                            setNewFrete({ ...newFrete, ticket: e.target.value });
                                            clearFormError("ticket");
                                        }}
                                    />
                                    <FieldError message={formErrors.ticket} />
                                </div>
                                {estoqueSelecionado?.estado === "MS" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="nota-fiscal-frete" className="flex items-center gap-2">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                            Nº Nota Fiscal
                                        </Label>
                                        <Input
                                            id="nota-fiscal-frete"
                                            placeholder="12.345.678"
                                            value={newFrete.numeroNotaFiscal}
                                            onChange={(e) => setNewFrete({ ...newFrete, numeroNotaFiscal: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator className="my-1" />

                    {/* Seção: Equipe */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
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
                                    onValueChange={handleMotoristaChange}
                                    onOpenChange={(open) => {
                                        if (open) clearFormError("motoristaId");
                                    }}
                                >
                                    <SelectTrigger
                                        id="motorista"
                                        className={cn(fieldErrorClass(formErrors.motoristaId))}
                                    >
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
                                <FieldError message={formErrors.motoristaId} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="caminhao" className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-primary" />
                                    Caminhão *
                                </Label>
                                {!newFrete.motoristaId ? (
                                    <div
                                        className={cn(
                                            "flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
                                            formErrors.caminhaoId && "border-red-500"
                                        )}
                                    >
                                        Selecione um motorista primeiro
                                    </div>
                                ) : carregandoCaminhoes ? (
                                    <div
                                        className={cn(
                                            "flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
                                            formErrors.caminhaoId && "border-red-500"
                                        )}
                                    >
                                        ⏳ Carregando caminhões...
                                    </div>
                                ) : erroCaminhoes ? (
                                    <div className="flex h-10 w-full items-center rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                                        ❌ {erroCaminhoes}
                                    </div>
                                ) : caminhoesDoMotorista.length === 0 ? (
                                    <div
                                        className={cn(
                                            "flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
                                            formErrors.caminhaoId && "border-red-500"
                                        )}
                                    >
                                        Nenhum caminhão disponível
                                    </div>
                                ) : caminhoesDoMotorista.length === 1 ? (
                                    <div
                                        className={cn(
                                            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm",
                                            formErrors.caminhaoId && "border-red-500"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-primary" />
                                            <span className="font-medium">{caminhoesDoMotorista[0].placa}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">Único</span>
                                    </div>
                                ) : (
                                    <Select
                                        value={newFrete.caminhaoId}
                                        onValueChange={(v) => {
                                            setNewFrete({ ...newFrete, caminhaoId: v });
                                            clearFormError("caminhaoId");
                                        }}
                                        onOpenChange={(open) => {
                                            if (open) clearFormError("caminhaoId");
                                        }}
                                    >
                                        <SelectTrigger
                                            id="caminhao"
                                            className={cn(fieldErrorClass(formErrors.caminhaoId))}
                                        >
                                            <SelectValue placeholder="Selecione um caminhão" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {caminhoesDoMotorista.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.placa}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <FieldError message={formErrors.caminhaoId} />
                            </div>
                        </div>
                    </div>

                    <Separator className="my-1" />

                    {/* Seção: Carga */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-1 w-1 rounded-full bg-blue-600" />
                            <h3 className="font-semibold text-blue-600">Quantidade de Carga</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="toneladas" className="flex items-center gap-2">
                                    <Weight className="h-4 w-4 text-blue-600" />
                                    Peso *
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                        t
                                    </span>
                                    <Input
                                        id="toneladas"
                                        placeholder="Ex: 20.555"
                                        className={cn("pl-12", fieldErrorClass(formErrors.toneladas))}
                                        value={newFrete.toneladas}
                                        onChange={(e) => {
                                            let valor = e.target.value;
                                            const digits = valor.replace(/\D/g, "");

                                            if (!digits) {
                                                setNewFrete({ ...newFrete, toneladas: "" });
                                                return;
                                            }

                                            const formatted =
                                                digits.length > 3
                                                    ? `${digits.slice(0, -3)}.${digits.slice(-3)}`
                                                    : digits;

                                            setNewFrete({ ...newFrete, toneladas: formatted });
                                            clearFormError("toneladas");
                                        }}
                                        onFocus={() => clearFormError("toneladas")}
                                        disabled={!estoqueSelecionado}
                                    />
                                </div>
                                <FieldError message={formErrors.toneladas} />
                                {estoqueSelecionado && newFrete.toneladas && (
                                    <p className="text-xs text-blue-600">
                                        ≈ {Math.round((toNumber(newFrete.toneladas) * 1000) / estoqueSelecionado.pesoMedioSaca).toLocaleString("pt-BR")} sacas ({estoqueSelecionado.pesoMedioSaca}kg cada)
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="valorTonelada" className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    Valor por Tonelada *
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                        R$
                                    </span>
                                    <Input
                                        id="valorTonelada"
                                        placeholder="Ex: 200.00"
                                        className={cn("pl-12", fieldErrorClass(formErrors.valorPorTonelada))}
                                        value={newFrete.valorPorTonelada}
                                        onChange={(e) => {
                                            let valor = e.target.value;
                                            const digits = valor.replace(/\D/g, "");

                                            if (!digits) {
                                                setNewFrete({ ...newFrete, valorPorTonelada: "" });
                                                return;
                                            }

                                            const valueNum = parseInt(digits, 10) / 100;
                                            const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valueNum);

                                            setNewFrete({ ...newFrete, valorPorTonelada: formatted });
                                            clearFormError("valorPorTonelada");
                                        }}
                                        onFocus={() => clearFormError("valorPorTonelada")}
                                        disabled={!estoqueSelecionado}
                                    />
                                </div>
                                <FieldError message={formErrors.valorPorTonelada} />
                                {estoqueSelecionado && (
                                    <p className="text-xs text-green-600">
                                        ✓ Preço cadastrado na fazenda: R$ {estoqueSelecionado.precoPorTonelada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/ton
                                    </p>
                                )}
                            </div>

                            {estoqueSelecionado && newFrete.toneladas && newFrete.valorPorTonelada && (
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
                                                    {toNumber(newFrete.toneladas).toFixed(3)} t
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Sacas (aproximado)</p>
                                                <p className="font-bold text-foreground">
                                                    {Math.round((toNumber(newFrete.toneladas) * 1000) / estoqueSelecionado.pesoMedioSaca).toLocaleString("pt-BR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Receita Estimada</p>
                                                <p className="font-bold text-profit">
                                                    R$ {(toNumber(newFrete.toneladas) * toNumber(newFrete.valorPorTonelada)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <ModalSubmitFooter
                        onCancel={() => {
                            onClose();
                            setNewFrete({
                                origem: "",
                                destino: "",
                                motoristaId: "",
                                caminhaoId: "",
                                fazendaId: "",
                                dataFrete: getTodayInputDate(),
                                toneladas: "",
                                valorPorTonelada: "",
                                ticket: "",
                                numeroNotaFiscal: "",
                            });
                            setEstoqueSelecionado(null);
                        }}
                        onSubmit={handleSaveFrete}
                        isSubmitting={isSaving}
                        disableSubmit={isSaving}
                        submitLabel={isEditing ? "Salvar Alterações" : "Criar Frete"}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
