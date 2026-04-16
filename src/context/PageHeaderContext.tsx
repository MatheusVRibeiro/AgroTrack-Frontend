import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

interface PageHeaderState {
  title: string;
  subtitle?: string;
}

interface PageHeaderValueContextType {
  header: PageHeaderState;
}

interface PageHeaderActionsContextType {
  setHeader: (state: PageHeaderState) => void;
}

const PageHeaderValueContext = createContext<PageHeaderValueContextType | undefined>(undefined);
const PageHeaderActionsContext = createContext<PageHeaderActionsContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<PageHeaderState>({
    title: "Caramello Logística",
  });

  const setHeader = useCallback((state: PageHeaderState) => {
    setHeaderState((prev) => {
      if (prev.title === state.title && prev.subtitle === state.subtitle) return prev;
      return state;
    });
  }, []);

  const actionsValue = useMemo(() => ({ setHeader }), [setHeader]);
  const stateValue = useMemo(() => ({ header }), [header]);

  return (
    <PageHeaderActionsContext.Provider value={actionsValue}>
      <PageHeaderValueContext.Provider value={stateValue}>
        {children}
      </PageHeaderValueContext.Provider>
    </PageHeaderActionsContext.Provider>
  );
}

export function usePageHeader() {
  const state = useContext(PageHeaderValueContext);
  const actions = useContext(PageHeaderActionsContext);
  
  if (!state || !actions) {
    throw new Error("usePageHeader must be used within a PageHeaderProvider");
  }
  
  return { ...state, ...actions };
}

/**
 * Hook otimizado para páginas que APENAS precisam definir o cabeçalho.
 * Evita re-renders da página quando o título muda no contexto global.
 */
export function usePageHeaderActions() {
  const context = useContext(PageHeaderActionsContext);
  if (!context) {
    throw new Error("usePageHeaderActions must be used within a PageHeaderProvider");
  }
  return context;
}
