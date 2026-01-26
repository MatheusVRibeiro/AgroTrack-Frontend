import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MonthData {
  receita: number;
  custos: number;
  resultado: number;
}

interface MonthlyComparisonProps {
  mesAtual: MonthData;
  mesAnterior: MonthData;
  labelMesAtual?: string;
  labelMesAnterior?: string;
}

export function MonthlyComparison({
  mesAtual,
  mesAnterior,
  labelMesAtual = "Jan/2024",
  labelMesAnterior = "Dez/2023",
}: MonthlyComparisonProps) {
  const calcVariation = (atual: number, anterior: number) => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);

  const metrics = [
    {
      label: "Receita",
      atual: mesAtual.receita,
      anterior: mesAnterior.receita,
      positiveIsGood: true,
      tooltip: "Soma total dos valores recebidos pelos fretes",
    },
    {
      label: "Custos",
      atual: mesAtual.custos,
      anterior: mesAnterior.custos,
      positiveIsGood: false,
      tooltip: "Total de despesas operacionais (combustível, pedágio, manutenção, etc.)",
    },
    {
      label: "Resultado",
      atual: mesAtual.resultado,
      anterior: mesAnterior.resultado,
      positiveIsGood: true,
      tooltip: "Lucro ou prejuízo líquido do período (Receita - Custos)",
    },
  ];

  return (
    <div className="bg-card rounded-xl border p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Comparativo Mensal
        </h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-primary" />
            {labelMesAtual}
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            {labelMesAnterior}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const variation = calcVariation(metric.atual, metric.anterior);
          const isPositive = variation > 0;
          const isNeutral = variation === 0;
          const isGood = metric.positiveIsGood ? isPositive : !isPositive;

          return (
            <Tooltip key={metric.label}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "p-4 rounded-xl border transition-all hover:shadow-md cursor-help",
                    metric.label === "Resultado" && metric.atual >= 0
                      ? "bg-profit/5 border-profit/20"
                      : metric.label === "Resultado" && metric.atual < 0
                      ? "bg-loss/5 border-loss/20"
                      : "bg-muted/30"
                  )}
                >
                  <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p
                        className={cn(
                          "text-2xl font-bold",
                          metric.label === "Resultado"
                            ? metric.atual >= 0
                              ? "text-profit"
                              : "text-loss"
                            : "text-foreground"
                        )}
                      >
                        {formatCurrency(metric.atual)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Anterior: {formatCurrency(metric.anterior)}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        isNeutral
                          ? "bg-muted text-muted-foreground"
                          : isGood
                          ? "bg-profit/10 text-profit"
                          : "bg-loss/10 text-loss"
                      )}
                    >
                      {isNeutral ? (
                        <Minus className="h-3 w-3" />
                      ) : isPositive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(variation).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{metric.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
