import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Package, MapPin, Truck, ArrowRight, Info, FileText,
    DollarSign, TrendingUp, AlertCircle, Edit, Trash2, Fuel, Wrench
} from "lucide-react";
import { useState, useEffect } from "react";

import { useDeletarFrete } from "@/hooks/queries/useFretes";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import pagamentosService from "@/services/pagamentos";

import { cn } from "@/lib/utils";
import { parseBRDateToLocalDate, toNumber, isCustoFromFrete, formatDateBRDisplay, formatFreteCodigo } from "@/utils/formatters";

const tipoConfig: Record<string, { label: string; icon: any; color: string }> = {
    combustivel: { label: "Combustível", icon: Fuel, color: "text-warning" },
    manutencao: { label: "Manutenção", icon: Wrench, color: "text-loss" },
    pedagio: { label: "Pedágio", icon: Truck, color: "text-primary" },
    outros: { label: "Outros", icon: FileText, color: "text-muted-foreground" },
};

interface FreteDetailsModalProps {
    selectedFrete: any | null; // Tipagem herdada do Pai (Frete)
    setSelectedFrete: (frete: any | null) => void;
    custosState: any[]; // Tipagem herdada (Custo[])
    handleOpenEditModal: () => void;
}

export function FreteDetailsModal({
    selectedFrete,
    setSelectedFrete,
    custosState,
    handleOpenEditModal
}: FreteDetailsModalProps) {

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const deleteMutation = useDeletarFrete();
    const queryClient = useQueryClient();

    // Resetar confirmação ao trocar de frete ou fechar o modal
    useEffect(() => {
        setShowDeleteConfirm(false);
    }, [selectedFrete]);

    const handleDelete = async () => {
        if (!selectedFrete) return;

        // Check cached pagamentos first, fallback to API call
        const cached = queryClient.getQueryData(["pagamentos"]) as any;
        let pagamentos: any[] = cached?.data || null;

        if (!pagamentos) {
            const res = await pagamentosService.listarPagamentos({ limit: 1000 }).catch(() => null);
            pagamentos = res?.data || [];
        }

        const freteIdStr = String(selectedFrete.id);
        const hasPayment = pagamentos.some((p: any) => {
            const fretes_incluidos: string | null | undefined = p.fretes_incluidos;
            if (!fretes_incluidos) return false;
            return fretes_incluidos
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .includes(freteIdStr);
        });

        if (hasPayment) {
            toast.error("Não é possível excluir: frete já foi pago");
            return;
        }

        deleteMutation.mutate(String(selectedFrete.id), {
            onSuccess: () => {
                toast.success("Frete excluído com sucesso");
                setSelectedFrete(null);
            },
            onError: (err: any) => {
                toast.error(err?.message || "Erro ao excluir frete");
            },
        });
    };

    if (!selectedFrete) return null;

    return (
        <Dialog open={!!selectedFrete} onOpenChange={(open) => { if (!open) { setShowDeleteConfirm(false); setSelectedFrete(null); } }}>
            <DialogContent className={showDeleteConfirm ? "max-w-lg" : "max-w-3xl"}>
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Package className="h-5 w-5 text-primary" />
                            </div>
                            Frete {selectedFrete ? formatFreteCodigo(selectedFrete) : ""}
                        </DialogTitle>
                        {!showDeleteConfirm && (
                            <div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenEditModal}
                                    className="gap-2 mr-3"
                                >
                                    <Edit className="h-4 w-4" />
                                    Editar
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {/* Confirmação inline — sem overlay extra */}
                {showDeleteConfirm ? (
                    <div className="flex flex-col gap-4 py-2">
                        <div>
                            <h3 className="text-base font-semibold">Confirmar exclusão</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                Tem certeza que deseja excluir &quot;{formatFreteCodigo(selectedFrete)}&quot;? Esta ação não pode ser desfeita.
                            </p>
                        </div>
                        <div className="flex justify-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? "Excluindo..." : "Sim, excluir"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="max-h-[calc(90vh-200px)] overflow-y-auto space-y-6 px-1">
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
                                <p className="text-xs text-muted-foreground">Favorecido</p>
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
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                                <Badge variant="outline" className="font-medium bg-primary/10 text-primary border-primary/20 px-2.5 py-1">
                                    {toNumber(selectedFrete.quantidadeSacas).toLocaleString("pt-BR")} sacas
                                </Badge>
                                <Badge variant="outline" className="font-medium bg-blue-500/10 text-blue-700 border-blue-500/20 px-2.5 py-1 dark:text-blue-300">
                                    {toNumber(selectedFrete.toneladas).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} t
                                </Badge>
                                <Badge variant="outline" className="font-medium bg-green-500/10 text-green-700 border-green-500/20 px-2.5 py-1 dark:text-green-300">
                                    R$ {toNumber(selectedFrete.valorPorTonelada).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/t
                                </Badge>
                            </div>
                        </Card>

                        <Card className="p-4 bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Código do Frete</p>
                            </div>
                            <p className="font-mono font-bold text-foreground">{formatFreteCodigo(selectedFrete)}</p>
                        </Card>
                        <Card className="p-4 bg-primary/5 border-l-4 border-l-primary">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <p className="text-xs text-muted-foreground">Ticket (Romaneio)</p>
                            </div>
                            <p className="font-mono font-semibold text-foreground">{selectedFrete.ticket || "—"}</p>
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
                                    R$ {toNumber(selectedFrete.receita).toLocaleString("pt-BR")}
                                </p>
                            </Card>

                            <Card className="p-4 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-red-600" />
                                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">CUSTOS ADICIONAIS</p>
                                </div>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                    R$ {toNumber(selectedFrete.custos).toLocaleString("pt-BR")}
                                </p>
                                <p className="text-[10px] text-red-600/80 mt-1">Pedágios, combustível, diárias, etc.</p>
                            </Card>

                            <Card className={`p-4 ${(toNumber(selectedFrete.receita) - toNumber(selectedFrete.custos)) >= 0
                                ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900"
                                : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900"
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className={`h-4 w-4 ${(toNumber(selectedFrete.receita) - toNumber(selectedFrete.custos)) >= 0 ? "text-green-600" : "text-red-600"}`} />
                                    <p className={`text-xs font-semibold ${(toNumber(selectedFrete.receita) - toNumber(selectedFrete.custos)) >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>LUCRO LÍQUIDO</p>
                                </div>
                                <p className={`text-3xl font-bold ${(toNumber(selectedFrete.receita) - toNumber(selectedFrete.custos)) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                    {(toNumber(selectedFrete.receita) - toNumber(selectedFrete.custos)) >= 0 ? "+" : ""}R$ {(toNumber(selectedFrete.receita) - toNumber(selectedFrete.custos)).toLocaleString("pt-BR")}
                                </p>
                            </Card>
                        </div>
                    </div>

                    {/* Custos Adicionais */}
                    <div>
                        <h4 className="font-semibold mb-4">Custos Adicionais</h4>
                        {(() => {
                            const fretesCustos = custosState.filter((c) =>
                                isCustoFromFrete(c.frete_id, selectedFrete.id, selectedFrete.codigoFrete)
                            );
                            const fretesCustosOrdenados = [...fretesCustos].sort(
                                (a, b) => (parseBRDateToLocalDate(b.data) || new Date(0)).getTime() - (parseBRDateToLocalDate(a.data) || new Date(0)).getTime()
                            );
                            const totalCustos = fretesCustos.reduce((sum, c) => sum + toNumber(c.valor), 0);

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
                                    <Card className="p-4 bg-muted/30">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-lg border bg-background p-3">
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lançamentos</p>
                                                <p className="text-lg font-bold text-foreground">{fretesCustosOrdenados.length}</p>
                                            </div>
                                            <div className="rounded-lg border bg-background p-3">
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total de Custos</p>
                                                <p className="text-lg font-bold text-loss">R$ {totalCustos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </Card>

                                    {fretesCustosOrdenados.map((custo) => {
                                        // Type for custo.tipo depends on definition, safely using config map
                                        const config = (tipoConfig as any)[custo.tipo] || { label: custo.tipo, icon: AlertCircle, color: "text-muted-foreground" };
                                        const Icon = config.icon;
                                        const valorCusto = toNumber(custo.valor);
                                        const accentClass =
                                            custo.tipo === "combustivel"
                                                ? "border-l-warning"
                                                : custo.tipo === "manutencao"
                                                    ? "border-l-loss"
                                                    : custo.tipo === "pedagio"
                                                        ? "border-l-primary"
                                                        : "border-l-muted-foreground/40";
                                        return (
                                            <Card key={custo.id} className={`p-4 border-l-4 ${accentClass} hover:shadow-md transition-all bg-card/80`}>
                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                    <div className="flex gap-3 flex-1 min-w-0">
                                                        <div className={`${config.color} shrink-0 mt-0.5`}>
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                <p className="font-semibold text-sm text-foreground">{config.label}</p>
                                                                {custo.comprovante && (
                                                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300">Comprovado</Badge>
                                                                )}
                                                                <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                                                                    {formatDateBRDisplay(custo.data)}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground break-words">{custo.descricao}</p>
                                                            {custo.observacoes && (
                                                                <p className="text-xs text-muted-foreground mt-1">{custo.observacoes}</p>
                                                            )}
                                                            {custo.tipo === "combustivel" && custo.litros && (
                                                                <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-1">💧 {toNumber(custo.litros).toLocaleString("pt-BR")} L • {String(custo.tipo_combustivel || "").toUpperCase()}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="sm:text-right sm:ml-4 flex-shrink-0">
                                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor</p>
                                                        {valorCusto > 0 ? (
                                                            <p className="font-bold text-loss">-R$ {valorCusto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                                                        ) : (
                                                            <p className="font-medium text-muted-foreground">—</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
