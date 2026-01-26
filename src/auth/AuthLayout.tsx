import { ReactNode } from "react";
import { Truck } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary mb-4">
            <Truck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">RN Logística</h1>
          <p className="text-muted-foreground mt-1">Gestão de Logística de Fretes</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border shadow-lg p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 RN Logística. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
