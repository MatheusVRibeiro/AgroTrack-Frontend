import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { forgotPassword } from "@/services/auth";
import { sanitizeEmail } from "@/lib/sanitize";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // Auto-preenche email salvo na memória
  useEffect(() => {
    const savedEmail = localStorage.getItem("@CaramelloLogistica:savedEmail");
    if (savedEmail) {
      setValue("email", sanitizeEmail(savedEmail));
    }
  }, [setValue]);

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      const response = await forgotPassword(data.email);

      if (response.success) {
        setEmailSent(true);
        setSentEmail(data.email);
        toast.success("Email de recuperação enviado!");
      } else {
        toast.error(response.message || "Erro ao solicitar recuperação");
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao enviar email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <h1 className="text-3xl font-bold text-foreground mb-2">
              Recuperar Senha
            </h1>
            <p className="text-muted-foreground">
              Digite seu email para receber um link de recuperação
            </p>
          </div>

          {!emailSent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@example.com"
                  {...register("email")}
                  disabled={isLoading}
                  className="h-10"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Enviar Link de Recuperação
                  </>
                )}
              </Button>

              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                  Você receberá um email com um link para redefinir sua senha. O link
                  expira em 1 hora.
                </AlertDescription>
              </Alert>
            </form>
          ) : (
            <div className="space-y-6">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <Mail className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                  Email enviado com sucesso para <strong>{sentEmail}</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-center">
                <p className="text-muted-foreground text-sm">
                  Verifique sua caixa de entrada e spam. O link de recuperação
                  está válido por 1 hora.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full h-10"
                >
                  Voltar ao Login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEmailSent(false)}
                  disabled={isLoading}
                  className="w-full h-10"
                >
                  Tentar outro email
                </Button>
              </div>

              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                  Não recebeu o email? Verifique a pasta de spam ou tente novamente em alguns
                  minutos.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
