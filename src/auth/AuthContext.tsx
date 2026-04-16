import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as authService from "@/services/auth";
import {
  clearSessionStorage,
  clearPersistedAuthData,
  getPersistedAuthData,
  setUserData,
  getUserData,
  migrateFromLocalStorage,
  setPersistedAuthData,
  isSessionExpired,
  updateLastActivity,
  PersistedAuthData,
} from "@/auth/session";
import type { ApiResponse, User } from "@/types";

interface LoginOptions {
  rememberMe?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, options?: LoginOptions) => Promise<ApiResponse<any>>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Migra tokens antigos
    migrateFromLocalStorage();

    // Verificação de expiração por inatividade (7 dias)
    if (isSessionExpired()) {
      clearSessionStorage();
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        // Tenta verificar identidade via cookie HttpOnly (Who am I)
        const res = await authService.me();
        
        if (res.success && res.data) {
          const authenticatedUser = res.data;
          setUser(authenticatedUser);
          setUserData(authenticatedUser);
          updateLastActivity();
        } else {
          // Se falhou, mas tínhamos dados no sessionStorage, limpa
          if (getUserData()) {
            clearSessionStorage();
          }
        }
      } catch (err) {
        console.error("Erro na inicialização do auth:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, options?: LoginOptions): Promise<ApiResponse<any>> => {
    setIsLoading(true);

    try {
      const res = await authService.login(email, password);

      if (res.success && res.data) {
        const { user } = res.data;
        // Padrão é lembrar-me para persistência de 7 dias
        const rememberMe = options?.rememberMe !== false;

        setUser(user);

        if (rememberMe) {
          // Persiste apenas dados não-sensíveis para UX (tokens estão seguros no cookie)
          setPersistedAuthData({
            user,
            lastActivity: Date.now(),
          });
          setUserData(user);
        } else {
          clearPersistedAuthData();
          setUserData(user);
        }

        setIsLoading(false);
        return res;
      }

      setIsLoading(false);
      return res;
    } catch (e) {
      console.error("Erro no login:", e);
    }

    setIsLoading(false);
    return { success: false, data: null, message: "Credenciais inválidas", status: 401 };
  };

  const logout = async () => {
    try {
      // Avisar o backend para limpar os cookies HttpOnly
      await authService.logout(); 
    } catch { /* noop */ }
    
    setUser(null);
    clearSessionStorage();
    clearPersistedAuthData();
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


