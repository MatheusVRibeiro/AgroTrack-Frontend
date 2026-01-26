import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Package, Search, FileX, AlertCircle, Plus } from "lucide-react";

type EmptyStateType = "no-data" | "no-results" | "error" | "no-items";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultContent: Record<EmptyStateType, { icon: ReactNode; title: string; description: string }> = {
  "no-data": {
    icon: <Package className="h-12 w-12" />,
    title: "Nenhum dado disponível",
    description: "Não há informações para exibir no momento. Comece adicionando novos registros.",
  },
  "no-results": {
    icon: <Search className="h-12 w-12" />,
    title: "Nenhum resultado encontrado",
    description: "Sua busca não retornou resultados. Tente ajustar os filtros ou termos de pesquisa.",
  },
  "error": {
    icon: <AlertCircle className="h-12 w-12" />,
    title: "Algo deu errado",
    description: "Não foi possível carregar os dados. Por favor, tente novamente mais tarde.",
  },
  "no-items": {
    icon: <FileX className="h-12 w-12" />,
    title: "Nenhum item cadastrado",
    description: "Você ainda não tem itens cadastrados. Clique no botão abaixo para começar.",
  },
};

export function EmptyState({
  type = "no-data",
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const defaults = defaultContent[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in",
        className
      )}
    >
      <div className="rounded-full bg-muted/50 p-6 mb-4 text-muted-foreground">
        {icon || defaults.icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title || defaults.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description || defaults.description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
