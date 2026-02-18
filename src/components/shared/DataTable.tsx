import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  /** Define se o campo deve aparecer nos cards mobile (padrão: true para primeiras 4 colunas) */
  mobileVisible?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  highlightNegative?: (item: T) => boolean;
  /** Função opcional para renderizar título customizado no card mobile */
  mobileCardTitle?: (item: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado",
  highlightNegative,
  mobileCardTitle,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-12 text-center animate-fade-in">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // Identifica colunas que devem aparecer no mobile (máximo 4)
  const mobileColumns = columns.filter((col, idx) => 
    col.mobileVisible !== false && idx < 4
  ).slice(0, 4);

  return (
    <>
      {/* Mobile View: Cards */}
      <div className="space-y-3 md:hidden animate-fade-in">
        {data.map((item, index) => {
          const isNegative = highlightNegative?.(item);
          return (
            <Card
              key={index}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98] min-h-11",
                isNegative && "bg-loss/5 border-loss/20 hover:bg-loss/10",
                !isNegative && "hover:border-primary/30"
              )}
              onClick={() => onRowClick?.(item)}
            >
              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Título do Card (campo principal ou customizado) */}
                {mobileCardTitle ? (
                  <div className="font-semibold text-base border-b pb-2 mb-2">
                    {mobileCardTitle(item)}
                  </div>
                ) : (
                  <div className="font-semibold text-base border-b pb-2 mb-2">
                    {columns[0].render 
                      ? columns[0].render(item, index)
                      : (item as Record<string, unknown>)[columns[0].key] as ReactNode
                    }
                  </div>
                )}

                {/* Campos Principais */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {mobileColumns.slice(1).map((column) => (
                    <div key={column.key} className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {column.header}
                      </p>
                      <div className={cn("text-sm font-medium", column.className)}>
                        {column.render
                          ? column.render(item, index)
                          : (item as Record<string, unknown>)[column.key] as ReactNode}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block bg-card rounded-xl border animate-fade-in shadow-sm">
        <div className="w-full overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-muted/50 to-muted/30 hover:bg-muted/50 border-b-2">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn("font-bold text-foreground text-sm uppercase tracking-wide", column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const isNegative = highlightNegative?.(item);
              return (
                <TableRow
                  key={index}
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-b hover:border-primary/20",
                    isNegative && "bg-loss/5 hover:bg-loss/10",
                    !isNegative && "hover:bg-primary/5 hover:shadow-sm"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={cn("py-3 px-4", column.className)}>
                      {column.render
                        ? column.render(item, index)
                        : (item as Record<string, unknown>)[column.key] as ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
