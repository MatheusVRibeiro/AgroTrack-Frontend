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
import Caminhoes from "./pages/Caminhoes";
import Motoristas from "./pages/Motoristas";
import Mercadorias from "./pages/Mercadorias";
import Custos from "./pages/Custos";
import Relatorios from "./pages/Relatorios";
import Indicadores from "./pages/Indicadores";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
              path="/caminhoes"
              element={
                <ProtectedRoute>
                  <Caminhoes />
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
              path="/mercadorias"
              element={
                <ProtectedRoute>
                  <Mercadorias />
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

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
