import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { AuthLayout } from "@/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    const savedEmail = localStorage.getItem("@CaramelloLogistica:savedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Client-side validation
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Email inválido", { description: "Informe um email com formato válido." });
      setError("Email inválido");
      return;
    }

    if (String(password ?? "").length < 6) {
      toast.error("Senha muito curta", { description: "A senha deve ter pelo menos 6 caracteres." });
      setError("Senha muito curta");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("🔓 Autenticando...");

    const res = await login(email, password);

    toast.dismiss(toastId);

    if (res.success) {
      toast.success("✅ Login realizado com sucesso!", { description: "Bem-vindo de volta!", duration: 3000 });
      // store normalized email when remembering
      if (rememberMe) {
        localStorage.setItem("@CaramelloLogistica:savedEmail", normalizedEmail);
      } else {
        localStorage.removeItem("@CaramelloLogistica:savedEmail");
      }
      navigate(from, { replace: true });
      return;
    }

    // Handle specific HTTP statuses
    if (res.status === 401) {
      toast.error("Credenciais inválidas", { description: res.message ?? "Email ou senha incorretos." });
      setError("Usuário ou senha inválidos");
    } else if (res.status === 403) {
      toast.error(res.message ?? "Conta bloqueada/inativa");
      setError(res.message ?? "Conta bloqueada/inativa");
    } else {
      toast.error("Falha na autenticação", { description: res.message ?? "Tente novamente mais tarde." });
      setError(res.message ?? "Falha na autenticação");
    }

    setIsSubmitting(false);
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Centered Header */}
        <div className="space-y-3 text-center">
          <div className="inline-block">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Bem-vindo
            </h2>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground font-medium">
            Entre com suas credenciais para acessar o sistema
          </p>
          <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/40 mx-auto rounded-full" />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              Email
            </Label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-12 text-base rounded-lg transition-all focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isSubmitting}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">
              Senha
            </Label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12 h-12 text-base rounded-lg transition-all focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isSubmitting}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-95"
                disabled={isSubmitting}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isSubmitting}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer select-none"
              >
                Lembrar-me
              </Label>
            </div>
            <button
              type="button"
              className="text-sm text-primary hover:underline font-medium transition-colors"
              onClick={() => {}}
              disabled={isSubmitting}
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] rounded-lg"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Autenticando...
            </>
          ) : (
            "Acessar Sistema"
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
