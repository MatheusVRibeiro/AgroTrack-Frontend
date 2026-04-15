import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as authService from "@/services/auth";
import {
  clearSessionStorage,
  clearPersistedAuthData,
  getPersistedAuthData,
  setTokens,
  setUserData,
  getUserData,
  migrateFromLocalStorage,
  setPersistedAuthData,
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
    // Migra tokens antigos do localStorage (limpeza de segurança)
    migrateFromLocalStorage();

    // Obtém dados do usuário da sessão temporária ou da sessão lembrada
    const storedUser = getUserData<User>() || getPersistedAuthData<{ user?: User }>()?.user;

    if (storedUser) {
      try {
        setUser(storedUser);
        const persistedAuth = getPersistedAuthData<{ user?: User; accessToken?: string; refreshToken?: string }>();
        if (persistedAuth?.accessToken) {
          setTokens(persistedAuth.accessToken, persistedAuth.refreshToken);
          setUserData(storedUser);
        }
      } catch {
        clearSessionStorage();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, options?: LoginOptions): Promise<ApiResponse<any>> => {
    setIsLoading(true);

    // Try backend authentication first
    try {
      const res = await authService.login(email, password);

      if (res.success && res.data) {
        const { user, token } = res.data;
        const rememberMe = options?.rememberMe === true;

        setUser(user);

        if (rememberMe) {
          setUserData(user);
          setPersistedAuthData({
            user,
            accessToken: token,
            refreshToken: res.data.refreshToken,
          });
        } else {
          clearPersistedAuthData();
          setUserData(user);
        }

        // Armazena tokens APENAS em memória (seguro contra XSS)
        if (token) {
          setTokens(token, res.data.refreshToken);
        }

        setIsLoading(false);
        return res;
      }

      // If backend returned an explicit failure, return it to the caller so UI can react to status/message
      setIsLoading(false);
      return res;
    } catch (e) {
      // Authentication failed (network or server error)
    }

    setIsLoading(false);
    return { success: false, data: null, message: "Credenciais inválidas", status: 401 };
  };

  const logout = () => {
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
