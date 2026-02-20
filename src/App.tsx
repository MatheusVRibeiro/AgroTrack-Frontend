import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Fretes from "./pages/Fretes";
import Frota from "./pages/Frota";
import Motoristas from "./pages/Motoristas";
import Fazendas from "./pages/Fazendas";
import Custos from "./pages/Custos";
import Relatorios from "./pages/Relatorios";
import Indicadores from "./pages/Indicadores";
import Pagamentos from "./pages/Pagamentos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fretes"
              element={
                <ProtectedRoute>
                  <Fretes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/frota"
              element={
                <ProtectedRoute>
                  <Frota />
                </ProtectedRoute>
              }
            />
            <Route
              path="/motoristas"
              element={
                <ProtectedRoute>
                  <Motoristas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/motoristas/editar/:id"
              element={
                <ProtectedRoute>
                  <Motoristas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fazendas/editar/:id"
              element={
                <ProtectedRoute>
                  <Fazendas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/frota/editar/:id"
              element={
                <ProtectedRoute>
                  <Frota />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fretes/editar/:id"
              element={
                <ProtectedRoute>
                  <Fretes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/custos/editar/:id"
              element={
                <ProtectedRoute>
                  <Custos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pagamentos/editar/:id"
              element={
                <ProtectedRoute>
                  <Pagamentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/motoristas/editar/:id"
              element={
                <ProtectedRoute>
                  <Motoristas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fazendas"
              element={
                <ProtectedRoute>
                  <Fazendas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/custos"
              element={
                <ProtectedRoute>
                  <Custos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/indicadores"
              element={
                <ProtectedRoute>
                  <Indicadores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pagamentos"
              element={
                <ProtectedRoute>
                  <Pagamentos />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
