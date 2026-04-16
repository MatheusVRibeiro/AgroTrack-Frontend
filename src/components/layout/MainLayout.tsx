import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { usePageHeader } from "@/context/PageHeaderContext";

export function MainLayout() {
  const { header } = usePageHeader();
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={header.title} subtitle={header.subtitle} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 scrollbar-thin">
          <div className="w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
