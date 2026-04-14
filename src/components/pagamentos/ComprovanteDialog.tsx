import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { safeOpenUrl, isSafeUrl, sanitizeLabel } from "@/lib/sanitize";

interface ComprovanteDialogProps {
    comprovanteDialog: {
        url: string;
        nome: string;
        isImage: boolean;
        isPdf: boolean;
    } | null;
    setComprovanteDialog: (val: any) => void;
}

export function ComprovanteDialog({
    comprovanteDialog,
    setComprovanteDialog,
}: ComprovanteDialogProps) {
    if (!comprovanteDialog) return null;

    const safeNome = sanitizeLabel(comprovanteDialog.nome, 100);
    const urlSegura = isSafeUrl(comprovanteDialog.url);

    return (
        <Dialog
            open={!!comprovanteDialog}
            onOpenChange={(open) => {
                if (!open) setComprovanteDialog(null);
            }}
        >
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Comprovante</DialogTitle>
                    <DialogDescription className="sr-only">
                        Visualização do arquivo de comprovante.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{safeNome}</p>
                    {!urlSegura ? (
                        <div className="text-sm text-red-500">
                            URL do comprovante inválida ou insegura.
                        </div>
                    ) : comprovanteDialog.isImage ? (
                        <img
                            src={comprovanteDialog.url}
                            alt={safeNome}
                            className="max-h-[70vh] w-full rounded-md object-contain"
                        />
                    ) : comprovanteDialog.isPdf ? (
                        <iframe
                            src={comprovanteDialog.url}
                            title={safeNome}
                            className="h-[70vh] w-full rounded-md border"
                            sandbox="allow-same-origin"
                        />
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                Não foi possível identificar o tipo do arquivo para preview direto.
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => safeOpenUrl(comprovanteDialog.url)}
                            >
                                <Download className="h-4 w-4" />
                                Abrir PDF
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

