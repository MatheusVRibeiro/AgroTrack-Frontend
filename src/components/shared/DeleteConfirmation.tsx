import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ReactNode } from "react";

interface DeleteConfirmationProps {
  title?: string;
  description?: string;
  itemName?: string;
  onConfirm: () => void;
  trigger?: ReactNode;
  variant?: "default" | "icon";
}

export function DeleteConfirmation({
  title = "Confirmar exclusão",
  description,
  itemName,
  onConfirm,
  trigger,
  variant = "default",
}: DeleteConfirmationProps) {
  const defaultDescription = itemName
    ? `Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`
    : "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size={variant === "icon" ? "icon" : "default"}>
            <Trash2 className="h-4 w-4" />
            {variant === "default" && <span className="ml-2">Excluir</span>}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sim, excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
