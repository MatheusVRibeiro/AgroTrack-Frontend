import { AlertTriangle, TrendingDown, Truck, AlertCircle, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface SmartAlert {
  id: string;
  type: "danger" | "warning" | "info";
  icon: "margin" | "cost" | "truck" | "general";
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  dismissible?: boolean;
}

interface SmartAlertsProps {
  alerts: SmartAlert[];
  onDismiss?: (id: string) => void;
  maxVisible?: number;
}

const iconMap = {
  margin: TrendingDown,
  cost: AlertCircle,
  truck: Truck,
  general: AlertTriangle,
};

const typeStyles = {
  danger: {
    bg: "bg-loss/5 border-loss/20 hover:bg-loss/10",
    iconBg: "bg-loss/10",
    iconColor: "text-loss",
    badge: "bg-loss/10 text-loss",
  },
  warning: {
    bg: "bg-warning/5 border-warning/20 hover:bg-warning/10",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    badge: "bg-warning/10 text-warning",
  },
  info: {
    bg: "bg-primary/5 border-primary/20 hover:bg-primary/10",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    badge: "bg-primary/10 text-primary",
  },
};

export function SmartAlerts({ alerts, onDismiss, maxVisible = 5 }: SmartAlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const displayedAlerts = showAll ? visibleAlerts : visibleAlerts.slice(0, maxVisible);
  const hasMore = visibleAlerts.length > maxVisible;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    onDismiss?.(id);
  };

  if (visibleAlerts.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-6 animate-fade-in">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 rounded-full bg-profit/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-profit" />
          </div>
          <div>
            <p className="font-medium text-foreground">Tudo certo!</p>
            <p className="text-sm">Nenhum alerta pendente no momento.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alertas Inteligentes
          <span className="text-xs font-normal bg-warning/10 text-warning px-2 py-0.5 rounded-full">
            {visibleAlerts.length}
          </span>
        </h3>
      </div>

      <div className="space-y-2">
        {displayedAlerts.map((alert) => {
          const Icon = iconMap[alert.icon];
          const styles = typeStyles[alert.type];

          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all animate-fade-in group",
                styles.bg
              )}
            >
              <div className={cn("rounded-lg p-2 flex-shrink-0", styles.iconBg)}>
                <Icon className={cn("h-4 w-4", styles.iconColor)} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {alert.description}
                </p>
                {alert.action && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-xs"
                    onClick={alert.action.onClick}
                  >
                    {alert.action.label}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>

              {alert.dismissible !== false && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDismiss(alert.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && !showAll && (
        <Button
          variant="ghost"
          className="w-full mt-2 text-sm"
          onClick={() => setShowAll(true)}
        >
          Ver mais {visibleAlerts.length - maxVisible} alertas
        </Button>
      )}
    </div>
  );
}
