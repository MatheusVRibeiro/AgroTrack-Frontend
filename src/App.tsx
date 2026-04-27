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
import { MainLayout } from "@/components/layout/MainLayout";

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
const RelatorioSafra = lazy(() => import("./pages/RelatorioSafra"));
const Indicadores = lazy(() => import("./pages/Indicadores"));
const Pagamentos = lazy(() => import("./pages/Pagamentos"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { PageHeaderProvider } from "@/context/PageHeaderContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false, // Performance: evita refetch ao voltar para o app
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
      <PageHeaderProvider>
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

                {/* Protected routes with Shared Layout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <GlobalErrorBoundary>
                        <MainLayout />
                      </GlobalErrorBoundary>
                    </ProtectedRoute>
                  }
                >
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/fretes"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Fretes />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/fretes/editar/:id"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Fretes />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/frota"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Frota />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/frota/editar/:id"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Frota />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/motoristas"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Motoristas />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/motoristas/editar/:id"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Motoristas />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/fazendas"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Fazendas />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/fazendas/editar/:id"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Fazendas />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/custos"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Custos />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/custos/editar/:id"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Custos />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/pagamentos"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Pagamentos />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/pagamentos/editar/:id"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Pagamentos />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/relatorios"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Relatorios />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/relatorios/safra"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <RelatorioSafra />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/indicadores"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Indicadores />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/usuarios"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Usuarios />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/usuarios/editar/:id"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Usuarios />
                      </Suspense>
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <NotFound />
                      </Suspense>
                    }
                  />
                </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </PageHeaderProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

export default App;
