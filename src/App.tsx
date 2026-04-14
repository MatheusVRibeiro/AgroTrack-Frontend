import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { ThemeProvider } from "@/components/theme-provider";

// Public Sync Routes
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";

// Lazy Loaded Protected Routes (Code Splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Fretes = lazy(() => import("./pages/Fretes"));
const Frota = lazy(() => import("./pages/Frota"));
const Motoristas = lazy(() => import("./pages/Motoristas"));
const Fazendas = lazy(() => import("./pages/Fazendas"));
const Custos = lazy(() => import("./pages/Custos"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Indicadores = lazy(() => import("./pages/Indicadores"));
const Pagamentos = lazy(() => import("./pages/Pagamentos"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />

              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <GlobalErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center min-h-screen bg-slate-50">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                      }
                    >
                      <Routes>
                        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/fretes" element={<ProtectedRoute><Fretes /></ProtectedRoute>} />
                        <Route path="/fretes/editar/:id" element={<ProtectedRoute><Fretes /></ProtectedRoute>} />
                        <Route path="/frota" element={<ProtectedRoute><Frota /></ProtectedRoute>} />
                        <Route path="/frota/editar/:id" element={<ProtectedRoute><Frota /></ProtectedRoute>} />
                        <Route path="/motoristas" element={<ProtectedRoute><Motoristas /></ProtectedRoute>} />
                        <Route path="/motoristas/editar/:id" element={<ProtectedRoute><Motoristas /></ProtectedRoute>} />
                        <Route path="/fazendas" element={<ProtectedRoute><Fazendas /></ProtectedRoute>} />
                        <Route path="/fazendas/editar/:id" element={<ProtectedRoute><Fazendas /></ProtectedRoute>} />
                        <Route path="/custos" element={<ProtectedRoute><Custos /></ProtectedRoute>} />
                        <Route path="/custos/editar/:id" element={<ProtectedRoute><Custos /></ProtectedRoute>} />
                        <Route path="/pagamentos" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
                        <Route path="/pagamentos/editar/:id" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
                        <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                        <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
                        <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
                        <Route path="/usuarios/editar/:id" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </GlobalErrorBoundary>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
