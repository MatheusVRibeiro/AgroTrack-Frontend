import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "profit" | "loss" | "warning" | "primary" | "active";
  tooltip?: string;
  onClick?: () => void;
}

export function KPICard({ title, value, icon: Icon, trend, variant = "default", tooltip, onClick }: KPICardProps) {
  const variants = {
    default: "bg-card",
    profit: "bg-profit/5 border-profit/20",
    loss: "bg-loss/5 border-loss/20",
    warning: "bg-warning/5 border-warning/20",
    primary: "bg-primary/5 border-primary/20",
    active: "bg-active/5 border-active/20",
  };

  const iconVariants = {
    default: "bg-primary/10 text-primary",
    profit: "bg-profit/10 text-profit",
    loss: "bg-loss/10 text-loss",
    warning: "bg-warning/10 text-warning",
    primary: "bg-primary/20 text-primary",
    active: "bg-active/20 text-active",
  };

  const cardContent = (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-6 transition-all hover:shadow-md animate-fade-in",
        (tooltip || onClick) && "cursor-pointer",
        onClick && "hover:scale-[1.02] active:scale-[0.98]",
        variants[variant]
      )}
      onClick={onClick}
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
                {trend.isPositive ? "+" : ""}{Number(trend.value).toFixed(1)}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-2 sm:p-3 flex-shrink-0 ml-2", iconVariants[variant])}>
          <Icon className="h-5 w-5" />
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
