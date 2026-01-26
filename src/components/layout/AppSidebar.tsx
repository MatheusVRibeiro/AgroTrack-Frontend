import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  Package,
  DollarSign,
  FileText,
  TrendingUp,
  Route,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Fretes", href: "/fretes", icon: Route },
  { name: "Caminhões", href: "/caminhoes", icon: Truck },
  { name: "Motoristas", href: "/motoristas", icon: Users },
  { name: "Mercadorias", href: "/mercadorias", icon: Package },
  { name: "Custos", href: "/custos", icon: DollarSign },
  { name: "Relatórios", href: "/relatorios", icon: FileText },
  { name: "Indicadores", href: "/indicadores", icon: TrendingUp },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar when route changes
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-card border shadow-sm"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 animate-fade-in"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          // Desktop styles
          "hidden lg:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} onNavigate={closeMobile} />
        
        {/* Collapse Button */}
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="text-sm">Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={closeMobile}
          className="absolute top-4 right-4 p-1 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>

        <SidebarContent collapsed={false} onNavigate={closeMobile} />
      </aside>
    </>
  );
}

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed, onNavigate }: SidebarContentProps) {
  const location = useLocation();

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Truck className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">RN Logística</span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <Truck className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
