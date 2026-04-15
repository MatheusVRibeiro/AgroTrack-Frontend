import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, TrendingDown, TrendingUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentSummaryCardsProps {
    pagamentos: any[];
    dadosMesAnterior: {
        totalPago: number;
    };
    totalRegistros?: number;
}

export function PaymentSummaryCards({
    pagamentos,
    dadosMesAnterior,
    totalRegistros,
}: PaymentSummaryCardsProps) {
    const totalPendente = pagamentos
        .filter((p) => p.statusPagamento === "pendente")
        .reduce((acc, p) => acc + p.valorTotal, 0);

    const totalPagoAtual = pagamentos
        .filter((p) => p.statusPagamento === "pago")
        .reduce((acc, p) => acc + p.valorTotal, 0);

    const pendentesCount = pagamentos.filter((p) => p.statusPagamento === "pendente").length;
    const pagosCount = pagamentos.filter((p) => p.statusPagamento === "pago").length;

    const displayedTotal = totalRegistros ?? pagamentos.length;

    const variacao = dadosMesAnterior.totalPago > 0
        ? ((totalPagoAtual - dadosMesAnterior.totalPago) / dadosMesAnterior.totalPago) * 100
        : 0;
    const temDados = totalPagoAtual > 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
            <Card className="p-4 md:p-6 bg-gradient-to-br from-primary/5 to-transparent border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total de Registros</p>
                        <p className="text-2xl md:text-4xl font-bold mt-2 text-foreground">{displayedTotal}</p>
                        <p className="text-[10px] md:text-xs text-primary mt-2 flex items-center gap-1">
                            {displayedTotal === 0 ? "Nenhum pagamento neste período" : "Pagamentos cadastrados"}
                        </p>
                    </div>
                    <FileText className="h-8 w-8 md:h-12 md:w-12 text-primary/20" />
                </div>
            </Card>

            <Card className="p-4 md:p-6 bg-gradient-to-br from-yellow-50 to-yellow-50/30 dark:from-yellow-950/20 dark:to-yellow-950/10 border-l-4 border-l-yellow-600 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">Pendente de Pagamento</p>
                        <p className="text-2xl md:text-4xl font-bold mt-2 text-yellow-700 dark:text-yellow-400">
                            R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] md:text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                            {pendentesCount} pagamentos
                        </p>
                    </div>
                    <Clock className="h-8 w-8 md:h-12 md:w-12 text-yellow-600/20" />
                </div>
            </Card>

            <Card className="p-4 md:p-6 bg-gradient-to-br from-profit/5 to-profit/5 dark:from-profit/5 dark:to-profit/5 border-l-4 border-l-profit hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-semibold text-profit/70 uppercase tracking-wide">Já Pago</p>
                        <p className="text-2xl md:text-4xl font-bold mt-2 text-profit">
                            R$ {totalPagoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <p className="text-[10px] md:text-xs text-profit/70 flex items-center gap-1">
                                {pagosCount} pagamentos
                            </p>
                            {temDados && Math.abs(variacao) > 0 ? (
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
                            ) : null}
                        </div>
                    </div>
                    <Check className="h-8 w-8 md:h-12 md:w-12 text-profit/20" />
                </div>
            </Card>
        </div>
    );
}
