import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "profit" | "loss" | "warning";
  tooltip?: string;
}

export function KPICard({ title, value, icon, trend, variant = "default", tooltip }: KPICardProps) {
  const variants = {
    default: "bg-card",
    profit: "bg-profit/5 border-profit/20",
    loss: "bg-loss/5 border-loss/20",
    warning: "bg-warning/5 border-warning/20",
  };

  const iconVariants = {
    default: "bg-primary/10 text-primary",
    profit: "bg-profit/10 text-profit",
    loss: "bg-loss/10 text-loss",
    warning: "bg-warning/10 text-warning",
  };

  const cardContent = (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-6 transition-all hover:shadow-md animate-fade-in",
        tooltip && "cursor-help",
        variants[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 flex-wrap">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-profit flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-loss flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium",
                  trend.isPositive ? "text-profit" : "text-loss"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-2 sm:p-3 flex-shrink-0 ml-2", iconVariants[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}
